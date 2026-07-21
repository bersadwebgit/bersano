import '../../../scripts/mock-setup';
import { resolveAiModel, AiModelSlot, validateModelName, invalidateModelCache } from '../../../src/lib/ai-model-resolver';
import { executeChatCompletion, executeEmbedding, DirectOpenRouterTransport, GatewayOpenRouterTransport } from '../../../src/lib/ai-provider/client';
import { resolveAiProviderConfig, invalidateAiProviderConfigCache } from '../../../src/lib/ai-provider/config';
import { prisma } from '../../../src/lib/prisma';

export async function testTransportParity() {
  console.log('   Checking AI Model Routing and Transport Parity...');

  // 1. Model Name Validation
  if (validateModelName('   ') !== null) throw new Error('Should reject whitespace-only model');
  if (validateModelName('undefined') !== null) throw new Error('Should reject undefined string model');
  if (validateModelName('null') !== null) throw new Error('Should reject null string model');
  if (validateModelName('[object Object]') !== null) throw new Error('Should reject [object Object] model');
  if (validateModelName('a'.repeat(200)) !== null) throw new Error('Should reject too long model name');
  const validModel = 'google/gemini-2.5-flash';
  if (validateModelName(validModel) !== validModel) throw new Error('Should accept valid model name');

  // 2. Transport Parity Payload deep equality & Envelope wrapping
  const payload = {
    model: 'google/gemini-2.5-flash-lite',
    messages: [{ role: 'user', content: 'hello' }],
  };

  const req = {
    operation: 'chat.completions' as const,
    payload,
    requestId: 'test-req-id',
  };

  const config = {
    directApiKey: 'test-direct-key',
    gatewayUrl: 'https://example.com/api',
    gatewayToken: 'test-gateway-token',
  };

  // Mock global fetch to intercept transport sends
  const originalFetch = globalThis.fetch;
  let lastFetchUrl: string | null = null;
  let lastFetchOptions: any = null;

  globalThis.fetch = async (url: any, options: any) => {
    lastFetchUrl = String(url);
    lastFetchOptions = options;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ message: { content: 'pong' } }] }),
      json: async () => ({ choices: [{ message: { content: 'pong' } }] }),
    } as any;
  };

  try {
    // Direct Transport
    const directTransport = new DirectOpenRouterTransport();
    await directTransport.send(req, config);
    const directPayload = JSON.parse(lastFetchOptions.body);

    // Gateway Transport
    const gatewayTransport = new GatewayOpenRouterTransport();
    await gatewayTransport.send(req, config);
    const gatewayBody = JSON.parse(lastFetchOptions.body);

    // Assertions
    if (lastFetchUrl !== 'https://example.com/api') {
      throw new Error(`Expected gateway URL, got ${lastFetchUrl}`);
    }

    if (gatewayBody.version !== '1') {
      throw new Error(`Expected version 1, got ${gatewayBody.version}`);
    }

    if (gatewayBody.requestId !== 'test-req-id') {
      throw new Error(`Expected requestId test-req-id, got ${gatewayBody.requestId}`);
    }

    if (gatewayBody.operation !== 'chat.completions') {
      throw new Error(`Expected operation chat.completions, got ${gatewayBody.operation}`);
    }

    // Deep equality of payloads
    if (JSON.stringify(gatewayBody.payload) !== JSON.stringify(directPayload)) {
      throw new Error('Payloads sent to Direct and Gateway transports are not deeply equal!');
    }

    if (gatewayBody.payload.model !== 'google/gemini-2.5-flash-lite') {
      throw new Error(`Expected model google/gemini-2.5-flash-lite, got ${gatewayBody.payload.model}`);
    }

    console.log('   ✓ Transport parity payload deep equality and wrapping verified.');
  } finally {
    globalThis.fetch = originalFetch;
  }

  return true;
}
