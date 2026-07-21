import '../../../scripts/mock-setup';
import { resolveAiProviderConfig, invalidateAiProviderConfigCache } from '../../../src/lib/ai-provider/config';
import { getEmbeddingConfig } from '../../../src/lib/product-embedding';
import { searchProducts } from '../../../src/lib/product-search';
import { normalizeErrorMessage } from '../../../src/lib/ai-agent-v2/core/error-normalizer';
import { AiProviderError } from '../../../src/lib/ai-provider/errors';
import { resolveAiModel, validateModelName, getAiModel, invalidateModelCache } from '../../../src/lib/ai-model-resolver';
import { executeChatCompletion, executeEmbedding } from '../../../src/lib/ai-provider/client';

export async function testProductionFailures() {
  console.log('   Checking Production Failures & Resiliency Fixes...');

  // Save original env
  const origGatewayUrl = process.env.AI_GATEWAY_URL;
  const origGatewayToken = process.env.AI_GATEWAY_TOKEN;
  const origAllowDirect = process.env.AI_ALLOW_DIRECT_OPENROUTER;
  const origEmbeddingModel = process.env.AI_EMBEDDING_MODEL;
  const origTransportMode = process.env.AI_TRANSPORT_MODE;

  try {
    // --- 1. Configuration Tests ---
    
    // AI globally disabled
    process.env.AI_TRANSPORT_MODE = 'disabled';
    invalidateAiProviderConfigCache();
    const configDisabled = await resolveAiProviderConfig();
    if (configDisabled.mode !== 'disabled') {
      throw new Error(`Expected disabled mode, got ${configDisabled.mode}`);
    }

    // Gateway mode with valid configuration
    process.env.AI_TRANSPORT_MODE = 'gateway';
    process.env.AI_GATEWAY_URL = 'https://parsemtiaz.ir/ai-gateway/index.php';
    process.env.AI_GATEWAY_TOKEN = 'strong-internal-token';
    process.env.AI_ALLOW_DIRECT_OPENROUTER = 'false';
    invalidateAiProviderConfigCache();
    const configGateway = await resolveAiProviderConfig();
    if (configGateway.mode !== 'gateway') {
      throw new Error(`Expected gateway mode, got ${configGateway.mode}`);
    }

    // Missing Gateway URL
    process.env.AI_GATEWAY_URL = '';
    invalidateAiProviderConfigCache();
    try {
      await resolveAiProviderConfig();
      throw new Error('Should have failed with missing Gateway URL');
    } catch (err: any) {
      if (err.code !== 'AI_CONFIGURATION_ERROR') {
        throw new Error(`Expected AI_CONFIGURATION_ERROR, got ${err.code}`);
      }
    }

    // Invalid Gateway URL
    process.env.AI_GATEWAY_URL = 'invalid-url';
    invalidateAiProviderConfigCache();
    try {
      await resolveAiProviderConfig();
      throw new Error('Should have failed with invalid Gateway URL');
    } catch (err: any) {
      if (err.code !== 'AI_CONFIGURATION_ERROR') {
        throw new Error(`Expected AI_CONFIGURATION_ERROR, got ${err.code}`);
      }
    }

    // Missing Gateway token
    process.env.AI_GATEWAY_URL = 'https://parsemtiaz.ir/ai-gateway/index.php';
    process.env.AI_GATEWAY_TOKEN = '';
    invalidateAiProviderConfigCache();
    try {
      await resolveAiProviderConfig();
      throw new Error('Should have failed with missing Gateway token');
    } catch (err: any) {
      if (err.code !== 'AI_CONFIGURATION_ERROR') {
        throw new Error(`Expected AI_CONFIGURATION_ERROR, got ${err.code}`);
      }
    }

    // Restore valid gateway for other tests
    process.env.AI_GATEWAY_URL = 'https://parsemtiaz.ir/ai-gateway/index.php';
    process.env.AI_GATEWAY_TOKEN = 'strong-internal-token';
    process.env.AI_ALLOW_DIRECT_OPENROUTER = 'false';
    process.env.AI_TRANSPORT_MODE = 'gateway';
    invalidateAiProviderConfigCache();

    // --- 2. Model Validation & Resolution Tests ---
    
    // Model name validation
    if (validateModelName('   ') !== null) throw new Error('Should reject whitespace-only model');
    if (validateModelName('undefined') !== null) throw new Error('Should reject undefined string model');
    if (validateModelName('null') !== null) throw new Error('Should reject null string model');
    if (validateModelName('[object Object]') !== null) throw new Error('Should reject [object Object] model');
    if (validateModelName('a'.repeat(200)) !== null) throw new Error('Should reject too long model name');
    if (validateModelName('google/gemini-2.5-flash') !== 'google/gemini-2.5-flash') throw new Error('Should accept valid model name');

    // Model resolution precedence
    const resolvedSimple = await resolveAiModel(undefined, 'simple');
    if (!resolvedSimple.resolvedModel) {
      throw new Error('Should resolve simple model');
    }

    const resolvedEmbedding = await resolveAiModel(undefined, 'embedding');
    if (resolvedEmbedding.resolvedModel !== 'openai/text-embedding-3-small') {
      throw new Error(`Expected openai/text-embedding-3-small, got ${resolvedEmbedding.resolvedModel}`);
    }

    // --- Embedding model validation tests ---
    const { mockDb } = require('../../../scripts/mock-setup');
    
    // Case 1: When ai_model_embedding is empty, use AI_EMBEDDING_MODEL, then openai/text-embedding-3-small
    mockDb.systemSettings.delete('ai_model_embedding');
    const originalEnvEmbedding = process.env.AI_EMBEDDING_MODEL;
    delete process.env.AI_EMBEDDING_MODEL;
    invalidateModelCache();
    
    const resEmpty = await resolveAiModel(undefined, 'embedding');
    if (resEmpty.model !== 'openai/text-embedding-3-small') {
      throw new Error(`Expected openai/text-embedding-3-small when empty, got ${resEmpty.model}`);
    }

    process.env.AI_EMBEDDING_MODEL = 'custom-env-embedding-model';
    invalidateModelCache();
    const resEnv = await resolveAiModel(undefined, 'embedding');
    if (resEnv.model !== 'custom-env-embedding-model') {
      throw new Error(`Expected custom-env-embedding-model from env, got ${resEnv.model}`);
    }

    // Case 2: When ai_model_embedding is explicitly configured, preserve the exact configured model
    mockDb.systemSettings.set('ai_model_embedding', 'custom-db-embedding-model');
    invalidateModelCache();
    const resDb = await resolveAiModel(undefined, 'embedding');
    if (resDb.model !== 'custom-db-embedding-model') {
      throw new Error(`Expected custom-db-embedding-model from DB, got ${resDb.model}`);
    }

    // Case 3: If explicitly configured model is not embedding-capable, reject it with AI_INVALID_EMBEDDING_MODEL
    mockDb.systemSettings.set('ai_model_embedding', 'google/gemini-2.5-flash-lite');
    invalidateModelCache();
    try {
      await resolveAiModel(undefined, 'embedding');
      throw new Error('Should have rejected gemini-2.5-flash-lite for embedding slot');
    } catch (err: any) {
      if (err.code !== 'AI_INVALID_EMBEDDING_MODEL') {
        throw new Error(`Expected AI_INVALID_EMBEDDING_MODEL, got ${err.code}`);
      }
    }

    // Restore mockDb and env state
    mockDb.systemSettings.set('ai_model_embedding', 'openai/text-embedding-3-small');
    invalidateModelCache();
    if (originalEnvEmbedding) {
      process.env.AI_EMBEDDING_MODEL = originalEnvEmbedding;
    } else {
      delete process.env.AI_EMBEDDING_MODEL;
    }

    // --- 3. Error Normalization Tests ---
    const normalized1 = normalizeErrorMessage({ error: { message: 'خطای تستی' } });
    if (normalized1 !== 'خطای تستی') {
      throw new Error(`Expected "خطای تستی", got "${normalized1}"`);
    }

    const normalized2 = normalizeErrorMessage(new Error('[object Object]'));
    if (normalized2 === '[object Object]') {
      throw new Error('Expected normalized error to not be [object Object]');
    }

    const normalized3 = normalizeErrorMessage({ message: '[object Object]' });
    if (normalized3 === '[object Object]') {
      throw new Error('Expected normalized error message to not be [object Object]');
    }

    // Secrets redaction
    const errWithSecret = new Error('Failed with token bearer sk-or-1234567890abcdef');
    const normalizedSecret = normalizeErrorMessage(errWithSecret);
    if (normalizedSecret.includes('sk-or-1234567890')) {
      throw new Error('Should have redacted the bearer token');
    }

    // --- 4. Search Fallback Test ---
    const results = await searchProducts({
      shopId: 'shop_1',
      query: 'کفش ورزشی نایک',
      maxResults: 5,
    });
    if (results.length === 0) {
      throw new Error('Expected searchProducts to fall back to keyword search and return results');
    }

    console.log('   ✓ All production failure and resiliency tests passed!');
    return true;
  } finally {
    // Restore env
    process.env.AI_GATEWAY_URL = origGatewayUrl;
    process.env.AI_GATEWAY_TOKEN = origGatewayToken;
    process.env.AI_ALLOW_DIRECT_OPENROUTER = origAllowDirect;
    process.env.AI_EMBEDDING_MODEL = origEmbeddingModel;
    process.env.AI_TRANSPORT_MODE = origTransportMode;
    invalidateAiProviderConfigCache();
  }
}
export { testProductionFailures as productionFailures };
