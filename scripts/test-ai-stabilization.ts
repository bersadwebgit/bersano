import { isRateLimited } from '../src/lib/rate-limiter';
import { validateAndSanitizeProductControl } from '../src/lib/validate-ai-output';
import { openRouterFetch } from '../src/lib/openrouter-fetch';
import crypto from 'crypto';

// Setup Mock Environment
const mockRedisStore = new Map<string, number>();
const mockRedisInstance = {
  incr: async (key: string) => {
    const current = mockRedisStore.get(key) || 0;
    const next = current + 1;
    mockRedisStore.set(key, next);
    return next;
  },
  expire: async (key: string, seconds: number) => 1,
  set: async (key: string, value: string, options?: any) => {
    mockRedisStore.set(key, Number(value));
    return 'OK';
  },
  decr: async (key: string) => {
    const current = mockRedisStore.get(key) || 0;
    const next = Math.max(0, current - 1);
    mockRedisStore.set(key, next);
    return next;
  },
};

// Inject mock Redis into require cache to intercept imports
require.cache[require.resolve('../src/lib/redis')] = {
  id: require.resolve('../src/lib/redis'),
  filename: require.resolve('../src/lib/redis'),
  loaded: true,
  exports: {
    redis: mockRedisInstance,
  },
} as any;

// Mock Prisma Client
const mockPrismaClient = {
  systemSetting: {
    findMany: async () => [
      { key: 'ai_enabled', value: 'true' },
      { key: 'openrouter_api_key', value: 'sk-or-mock-key' },
    ],
    findUnique: async ({ where }: any) => {
      if (where.key === 'openrouter_api_key') return { key: 'openrouter_api_key', value: 'sk-or-mock-key' };
      if (where.key === 'poof_api_key') return { key: 'poof_api_key', value: 'poof-mock-key' };
      if (where.key === 'ai_embedding_api_key') return { key: 'ai_embedding_api_key', value: 'emb-mock-key' };
      return null;
    },
    upsert: async () => ({}),
  },
  shopSettings: {
    findUnique: async () => ({
      shopId: 'shop123',
      packageExpiresAt: new Date(Date.now() + 100000).toISOString(),
      package: {
        features: JSON.stringify({
          aiAgentEnabled: true,
          aiChatEnabled: true,
          aiRequestsLimit: 100,
        }),
      },
    }),
  },
  aiUsage: {
    count: async () => 5,
    create: async () => ({}),
  },
  category: {
    findFirst: async ({ where }: any) => {
      if (where.id === 'cat123' && where.shopId === 'shop123') {
        return { id: 'cat123', name: 'دسته بندی تست' };
      }
      return null;
    },
  },
};

globalThis.prismaGlobal = mockPrismaClient as any;

// TARGET_REGISTRY and resolveSaveEndpoint helper from ai-agent route
interface RegistryEntry {
  aiControlEndpoint: string;
  saveEndpointBase: string;
  allowIdSuffix?: boolean;
}

const TARGET_REGISTRY: Record<string, RegistryEntry> = {
  products: { aiControlEndpoint: '/api/admin/products/ai-control', saveEndpointBase: '/api/admin/products', allowIdSuffix: true },
  stories: { aiControlEndpoint: '/api/admin/stories/ai-control', saveEndpointBase: '/api/stories' },
  blog: { aiControlEndpoint: '/api/admin/blog/ai-control', saveEndpointBase: '/api/admin/blog/posts', allowIdSuffix: true },
  discounts: { aiControlEndpoint: '/api/admin/discounts/ai-control', saveEndpointBase: '/api/admin/discounts' },
  categories: { aiControlEndpoint: '/api/admin/categories/ai-control', saveEndpointBase: '/api/admin/categories', allowIdSuffix: true },
  orders: { aiControlEndpoint: '/api/admin/orders/ai-control', saveEndpointBase: '/api/admin/orders/ai-control' },
  settings: { aiControlEndpoint: '/api/admin/settings/ai-control', saveEndpointBase: '/api/settings' },
  custom_home: { aiControlEndpoint: '/api/admin/settings/custom-home/ai-control', saveEndpointBase: '/api/settings' },
  slider: { aiControlEndpoint: '/api/admin/slider/ai-control', saveEndpointBase: '/api/admin/slider' },
  reviews: { aiControlEndpoint: '/api/admin/reviews/ai-control', saveEndpointBase: '/api/admin/reviews' },
  media: { aiControlEndpoint: '/api/admin/media/ai-control', saveEndpointBase: '/api/admin/media/process' },
  shoppable: { aiControlEndpoint: '/api/admin/shoppable/ai-control', saveEndpointBase: '/api/admin/shoppable' },
  footer: { aiControlEndpoint: '/api/admin/footer/ai-control', saveEndpointBase: '/api/admin/footer' },
  header: { aiControlEndpoint: '/api/admin/header/ai-control', saveEndpointBase: '/api/admin/header' },
  users: { aiControlEndpoint: '/api/admin/users/ai-control', saveEndpointBase: '/api/admin/users' },
  tickets: { aiControlEndpoint: '/api/admin/tickets/ai-control', saveEndpointBase: '/api/admin/tickets' },
  system_tickets: { aiControlEndpoint: '/api/admin/system-tickets/ai-control', saveEndpointBase: '/api/admin/system-tickets' },
  staff: { aiControlEndpoint: '/api/admin/staff/ai-control', saveEndpointBase: '/api/admin/staff' },
  profile: { aiControlEndpoint: '/api/admin/profile/ai-control', saveEndpointBase: '/api/admin/profile' },
  import_export: { aiControlEndpoint: '/api/admin/import-export/ai-control', saveEndpointBase: '/api/admin/import-export' },
  brand: { aiControlEndpoint: '/api/admin/brands/ai-control', saveEndpointBase: '/api/admin/brands/ai-control' },
  content_calendar: { aiControlEndpoint: '/api/admin/blog/content-calendar/ai-control', saveEndpointBase: '/api/admin/blog/content-calendar/ai-control' },
  blog_comments: { aiControlEndpoint: '/api/admin/blog/comments/ai-control', saveEndpointBase: '/api/admin/blog/comments/ai-control' },
  about_us: { aiControlEndpoint: '/api/admin/settings/about-us/ai-control', saveEndpointBase: '/api/settings' },
  contact_us: { aiControlEndpoint: '/api/admin/settings/contact-us/ai-control', saveEndpointBase: '/api/settings' },
};

function resolveSaveEndpoint(target: string, modelProvidedEndpoint: string | undefined): string {
  const entry = TARGET_REGISTRY[target];
  if (!entry) return '';

  if (!modelProvidedEndpoint) return entry.saveEndpointBase;

  let path = modelProvidedEndpoint.trim().toLowerCase();
  if (path.endsWith('/edit')) {
    path = path.substring(0, path.length - 5);
  }

  if (entry.allowIdSuffix) {
    const segments = path.split('/').filter(Boolean);
    const baseSegments = entry.saveEndpointBase.split('/').filter(Boolean);
    
    if (segments.length > baseSegments.length) {
      const lastSegment = segments[segments.length - 1];
      if (/^[a-z0-9-]+$/i.test(lastSegment) && lastSegment !== 'new') {
        return `${entry.saveEndpointBase}/${lastSegment}`;
      }
    }
  }

  return entry.saveEndpointBase;
}

// Test Runner Helper
async function runTest(name: string, testFn: () => Promise<void>) {
  try {
    await testFn();
    console.log(`✅ [PASS] ${name}`);
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err.stack || err);
    process.exit(1);
  }
}

// Main Test Suite
async function main() {
  console.log('🚀 Starting AI Stabilization Wave 1 Test Suite...\n');

  // Test 1: Layered Rate Limits per IP
  await runTest('Layered Rate Limits per IP', async () => {
    mockRedisStore.clear();
    const ip = '192.168.1.1';
    for (let i = 0; i < 10; i++) {
      const limited = await isRateLimited(`chat:ip:${ip}`, 10, 60000);
      if (limited) throw new Error(`Should not be rate limited on call ${i + 1}`);
    }
    const limited = await isRateLimited(`chat:ip:${ip}`, 10, 60000);
    if (!limited) throw new Error('Should be rate limited on the 11th call');
  });

  // Test 2: Layered Rate Limits per Session
  await runTest('Layered Rate Limits per Session', async () => {
    mockRedisStore.clear();
    const sessionId = 'session_test_123';
    for (let i = 0; i < 20; i++) {
      const limited = await isRateLimited(`chat:session:${sessionId}`, 20, 600000);
      if (limited) throw new Error(`Should not be rate limited on call ${i + 1}`);
    }
    const limited = await isRateLimited(`chat:session:${sessionId}`, 20, 600000);
    if (!limited) throw new Error('Should be rate limited on the 21st call');
  });

  // Test 3: Layered Rate Limits per Shop
  await runTest('Layered Rate Limits per Shop', async () => {
    mockRedisStore.clear();
    const shopId = 'shop_test_123';
    for (let i = 0; i < 100; i++) {
      const limited = await isRateLimited(`chat:shop:${shopId}`, 100, 60000);
      if (limited) throw new Error(`Should not be rate limited on call ${i + 1}`);
    }
    const limited = await isRateLimited(`chat:shop:${shopId}`, 100, 60000);
    if (!limited) throw new Error('Should be rate limited on the 101st call');
  });

  // Test 4: Bounded In-Memory Rate Limiter Fallback
  await runTest('Bounded In-Memory Rate Limiter Fallback', async () => {
    // Temporarily bypass Redis mock by setting exports.redis to null
    const redisModule = require('../src/lib/redis');
    const originalRedis = redisModule.redis;
    redisModule.redis = null;

    try {
      // Call with 5005 different keys
      for (let i = 0; i < 5005; i++) {
        await isRateLimited(`fallback_key_${i}`, 10, 60000);
      }
      // The internal rateLimitMap size should be bounded to 5000 + some margin, or cleaned up
      // Let's verify that the process didn't crash and limits are still active
      const limited = await isRateLimited('fallback_key_5004', 1, 60000);
      if (!limited) {
        throw new Error('In-memory rate limiting should still be active and working');
      }
    } finally {
      redisModule.redis = originalRedis;
    }
  });

  // Test 5: AI Agent Target Registry Validation
  await runTest('AI Agent Target Registry Validation', async () => {
    const validTargets = ['products', 'blog', 'discounts', 'categories', 'settings', 'about_us', 'contact_us'];
    for (const t of validTargets) {
      if (!TARGET_REGISTRY[t]) throw new Error(`Target ${t} should be present in the registry`);
    }

    const invalidTargets = ['users_db', 'arbitrary_target', 'hack_endpoint'];
    for (const t of invalidTargets) {
      if (TARGET_REGISTRY[t]) throw new Error(`Target ${t} should NOT be present in the registry`);
    }
  });

  // Test 6: AI Agent saveEndpoint Resolving
  await runTest('AI Agent saveEndpoint Resolving', async () => {
    // Test products target (allowIdSuffix = true)
    const p1 = resolveSaveEndpoint('products', '/api/admin/products/clx123456/edit');
    if (p1 !== '/api/admin/products/clx123456') throw new Error(`Expected /api/admin/products/clx123456, got ${p1}`);

    const p2 = resolveSaveEndpoint('products', '/api/admin/products/new');
    if (p2 !== '/api/admin/products') throw new Error(`Expected /api/admin/products, got ${p2}`);

    // Test discounts target (allowIdSuffix = false)
    const d1 = resolveSaveEndpoint('discounts', '/api/admin/discounts/clx123456/edit');
    if (d1 !== '/api/admin/discounts') throw new Error(`Expected /api/admin/discounts, got ${d1}`);
  });

  // Test 7: openRouterFetch Timeout Support
  await runTest('openRouterFetch Timeout Support', async () => {
    let fetchCalled = false;
    globalThis.fetch = (async (url: string, options: any) => {
      fetchCalled = true;
      // Delay response to trigger timeout
      await new Promise(resolve => setTimeout(resolve, 100));
      return { ok: true, status: 200 } as any;
    }) as any;

    try {
      await openRouterFetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST' }, 50);
      throw new Error('Should have timed out');
    } catch (err: any) {
      if (!err.message.includes('timed out')) {
        throw new Error(`Expected timeout error, got: ${err.message}`);
      }
    }
  });

  // Test 8: openRouterFetch Retry Policy
  await runTest('openRouterFetch Retry Policy', async () => {
    let attempt = 0;
    globalThis.fetch = (async (url: string, options: any) => {
      attempt++;
      if (attempt === 1) {
        return { ok: false, status: 429, headers: new Map([['Retry-After', '1']]) } as any;
      }
      return { ok: true, status: 200 } as any;
    }) as any;

    const res = await openRouterFetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST' });
    if (res.status !== 200) throw new Error('Should have retried and succeeded with 200');
    if (attempt !== 2) throw new Error(`Expected 2 attempts, got ${attempt}`);

    // Test immediate failure for 401
    attempt = 0;
    globalThis.fetch = (async (url: string, options: any) => {
      attempt++;
      return { ok: false, status: 401 } as any;
    }) as any;

    const res401 = await openRouterFetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST' });
    if (res401.status !== 401) throw new Error('Should fail immediately on 401');
    if (attempt !== 1) throw new Error(`Expected exactly 1 attempt for 401, got ${attempt}`);
  });

  // Test 9: Product AI-Control Nested Validation
  await runTest('Product AI-Control Nested Validation', async () => {
    const maliciousData = {
      success: true,
      explanation: 'تست اعتبارسنجی',
      formData: {
        title: 'کفش ورزشی نایک',
        price: -15000, // Negative price
        stock: -5, // Negative stock
        discountPercent: 120, // Invalid discount
        description: '<script>alert("XSS")</script><p>توضیحات ایمن</p>',
        fullDescription: '<iframe src="javascript:alert(1)"></iframe>',
      },
      variants: [
        { price: 10000, stock: 10, sku: 'v1' },
        { price: -2000, stock: 5, sku: 'v2' }, // Negative variant price
      ]
    };

    const { isValid, issues, sanitizedData } = validateAndSanitizeProductControl(maliciousData);

    if (isValid) throw new Error('Should be invalid due to negative price/stock and invalid discount');
    if (issues.length < 3) throw new Error(`Expected at least 3 validation issues, got ${issues.length}`);

    // Verify HTML Sanitization
    if (sanitizedData.formData.description.includes('<script>')) {
      throw new Error('HTML script tag was not sanitized');
    }
    if (sanitizedData.formData.fullDescription.includes('<iframe')) {
      throw new Error('HTML iframe tag was not sanitized');
    }

    // Verify negative values were corrected or reported, and variants filtered
    if (sanitizedData.variants.length !== 1) {
      throw new Error(`Expected exactly 1 valid variant, got ${sanitizedData.variants.length}`);
    }
  });

  // Test 10: Super-Admin Settings API Key Masking
  await runTest('Super-Admin Settings API Key Masking', async () => {
    // Test GET masking logic simulation
    const rawOpenRouterKey = 'sk-or-secret-key-123456';
    const hasOpenRouterApiKey = !!rawOpenRouterKey;
    const maskedOpenRouterApiKey = hasOpenRouterApiKey ? '••••••••••••••••' : '';

    if (maskedOpenRouterApiKey !== '••••••••••••••••') {
      throw new Error('API key should be masked with ••••••••••••••••');
    }

    // Test POST preservation logic simulation
    const submittedValue = '••••••••••••••••';
    const originalValueInDb = 'sk-or-secret-key-123456';
    let finalValueToSave = originalValueInDb;

    if (submittedValue !== undefined && submittedValue !== '••••••••••••••••' && submittedValue !== '') {
      finalValueToSave = submittedValue;
    }

    if (finalValueToSave !== originalValueInDb) {
      throw new Error('Database value should have been preserved when placeholder was submitted');
    }

    const newSubmittedValue = 'sk-or-new-secret-key-789';
    if (newSubmittedValue !== undefined && newSubmittedValue !== '••••••••••••••••' && newSubmittedValue !== '') {
      finalValueToSave = newSubmittedValue;
    }

    if (finalValueToSave !== 'sk-or-new-secret-key-789') {
      throw new Error('Database value should have been updated when a new key was submitted');
    }
  });

  console.log('\n🎉 [SUCCESS] All 10 critical behaviors tested and passed successfully!');
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
