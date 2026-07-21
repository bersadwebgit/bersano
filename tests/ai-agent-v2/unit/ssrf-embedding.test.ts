import { isPublicHttpUrlSafe } from '../../../src/lib/validate-url';

// AI-001 regression: SSRF guard for admin-configured custom embedding endpoints.
export async function testSsrfEmbeddingGuard() {
  console.log('   Checking AI-001: SSRF guard for custom embedding endpoints...');

  const mustBlock = [
    'http://127.0.0.1/embeddings',
    'http://169.254.169.254/latest/meta-data', // cloud metadata
    'http://10.0.0.5/embeddings',
    'http://192.168.1.10/v1/embeddings',
    'http://172.16.0.1/',
    'http://[::1]/embeddings',
    'http://localhost:8080/embeddings',
    'http://svc.internal/',
    'ftp://8.8.8.8/embeddings', // non-http protocol
    'not-a-valid-url',
    '',
  ];
  for (const url of mustBlock) {
    if (await isPublicHttpUrlSafe(url)) {
      throw new Error(`SSRF guard failed to block unsafe URL: ${JSON.stringify(url)}`);
    }
  }

  // Public IP literals must be allowed (no DNS needed -> hermetic test)
  const mustAllow = ['https://8.8.8.8/v1/embeddings', 'http://1.1.1.1/embeddings'];
  for (const url of mustAllow) {
    if (!(await isPublicHttpUrlSafe(url))) {
      throw new Error(`SSRF guard incorrectly blocked a public URL: ${url}`);
    }
  }

  console.log('   ✓ Blocks private/loopback/link-local/metadata and allows public hosts!');
  return true;
}
export { testSsrfEmbeddingGuard as ssrfEmbeddingGuard };
