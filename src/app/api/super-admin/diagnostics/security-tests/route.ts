import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { validateUrl } from '@/lib/validate-url';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

async function verifySuperAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('super_admin_token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== 'superadmin') return null;
    return payload;
  } catch (error) {
    return null;
  }
}

export async function GET() {
  // 1. Verify Super Admin Auth
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const testResults: Record<string, any> = {
    timestamp: new Date().toISOString(),
    allPassed: true,
    tests: [],
  };

  function runTest(name: string, testFn: () => void | Promise<void>) {
    const testRecord = { name, status: 'PASSED', error: null as string | null };
    try {
      const res = testFn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            testResults.tests.push(testRecord);
          })
          .catch((err) => {
            testRecord.status = 'FAILED';
            testRecord.error = err.message || String(err);
            testResults.allPassed = false;
            testResults.tests.push(testRecord);
          });
      } else {
        testResults.tests.push(testRecord);
      }
    } catch (err: any) {
      testRecord.status = 'FAILED';
      testRecord.error = err.message || String(err);
      testResults.allPassed = false;
      testResults.tests.push(testRecord);
    }
  }

  // --- 1. XSS Payload Tests ---
  runTest('HTML Sanitizer - Strips Script Tags', () => {
    const input = '<p>Hello</p><script>alert("XSS")</script><b>World</b>';
    const output = sanitizeHtml(input);
    if (output.includes('script') || output.includes('alert')) {
      throw new Error(`Sanitization failed. Script tag not stripped. Output: ${output}`);
    }
  });

  runTest('HTML Sanitizer - Strips Inline Event Handlers', () => {
    const input = '<p onclick="alert(1)" onload="alert(2)">Click me</p>';
    const output = sanitizeHtml(input);
    if (output.includes('onclick') || output.includes('onload') || output.includes('alert')) {
      throw new Error(`Sanitization failed. Event handlers not stripped. Output: ${output}`);
    }
  });

  runTest('HTML Sanitizer - Strips Javascript/Vbscript Protocols', () => {
    const input = '<a href="javascript:alert(1)">Link</a><iframe src="vbscript:msgbox(1)"></iframe>';
    const output = sanitizeHtml(input);
    if (output.includes('javascript:') || output.includes('vbscript:') || output.includes('iframe')) {
      throw new Error(`Sanitization failed. Dangerous protocols or iframe not stripped. Output: ${output}`);
    }
  });

  runTest('HTML Sanitizer - Strips Style Attributes', () => {
    const input = '<p style="color: red; position: absolute; left: 0;">Styled text</p>';
    const output = sanitizeHtml(input);
    if (output.includes('style=') || output.includes('position') || output.includes('absolute')) {
      throw new Error(`Sanitization failed. Style attribute not stripped. Output: ${output}`);
    }
  });

  runTest('HTML Sanitizer - Preserves Safe Formatting', () => {
    const input = '<h1>Title</h1><p>This is <strong>bold</strong> and <em>italic</em>.</p>';
    const output = sanitizeHtml(input);
    if (!output.includes('<h1>Title</h1>') || !output.includes('<strong>bold</strong>') || !output.includes('<em>italic</em>')) {
      throw new Error(`Sanitization failed. Safe formatting tags were lost. Output: ${output}`);
    }
  });

  // --- 2. SSRF URL Validation Tests ---
  await runTest('SSRF Validator - Blocks Loopback & Private IPs', async () => {
    const loopbacks = ['http://127.0.0.1', 'http://127.0.0.1:3000', 'http://[::1]', 'http://localhost'];
    const privateIps = ['http://10.0.0.1', 'http://172.16.0.1', 'http://192.168.1.1', 'http://169.254.169.254'];

    for (const url of [...loopbacks, ...privateIps]) {
      const isValid = await validateUrl(url);
      if (isValid) {
        throw new Error(`SSRF Validation failed. Allowed unsafe local/private URL: ${url}`);
      }
    }
  });

  await runTest('SSRF Validator - Blocks SVG Data URLs', async () => {
    const svgDataUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    const isValid = await validateUrl(svgDataUrl);
    if (isValid) {
      throw new Error('SSRF Validation failed. Allowed SVG data URL.');
    }
  });

  await runTest('SSRF Validator - Allows Safe Image Data URLs', async () => {
    const safePngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const isValid = await validateUrl(safePngDataUrl);
    if (!isValid) {
      throw new Error('SSRF Validation failed. Blocked safe PNG data URL.');
    }
  });

  await runTest('SSRF Validator - Allows Safe External Domains', async () => {
    const safeUrl = 'https://images.pexels.com/photos/12345/photo.jpg';
    const isValid = await validateUrl(safeUrl);
    if (!isValid) {
      throw new Error('SSRF Validation failed. Blocked safe trusted domain URL.');
    }
  });

  // --- 3. Tenant Isolation Tests ---
  await runTest('Tenant Isolation - Enforces shopId Filter on Queries', async () => {
    let errorThrown = false;
    try {
      // Attempt to run a findMany query on Product without a shopId filter
      await prisma.product.findMany({});
    } catch (err: any) {
      if (err.message.includes('Multi-tenant isolation violation')) {
        errorThrown = true;
      }
    }

    if (!errorThrown) {
      throw new Error('Tenant isolation failed. Product query without shopId filter was allowed to execute!');
    }
  });

  await runTest('Tenant Isolation - Allows Query with allowCrossTenant Flag', async () => {
    try {
      // Query with allowCrossTenant should pass without throwing isolation violation
      await (prisma.product.findMany as any)({
        take: 1,
        allowCrossTenant: true,
      });
    } catch (err: any) {
      if (err.message.includes('Multi-tenant isolation violation')) {
        throw new Error('Tenant isolation failed. Query with allowCrossTenant flag was blocked!');
      }
    }
  });

  return NextResponse.json(testResults);
}
