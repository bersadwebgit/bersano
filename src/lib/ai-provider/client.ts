import { getAiModel, resolveAiModel, AiModelSlot } from '../ai-model-resolver';
import { resolveAiProviderConfig } from './config';
import { checkShopQuota, decrementShopQuota, logAiUsage, hasActiveAiAccess } from './usage';
import { AiProviderError, AiErrorCode } from './errors';
import { ChatCompletionRequest, EmbeddingRequest, AiLogContext } from './types';
import { parseAiJson } from '../parse-ai-json';
import { resolveAiCost } from '../ai-pricing';
import { prisma } from '../prisma';
import { isPublicHttpUrlSafe } from '../validate-url';

export type AiGatewayResult<T = any> = ChatCompletionResult<T>;

export interface ExecuteOptions {
  shopId: string;
  endpoint: string;
  slot: AiModelSlot;
  enableFallback?: boolean;
  skipQuotaCheck?: boolean;
  featureKey?: string;
  requestId?: string;
  billingMode?: 'tenant' | 'platform';
  // AI-008 (Phase C): usage enrichment / traceability.
  capability?: string;
  rootRequestId?: string;
}

export interface ChatCompletionResult<T = any> {
  success: boolean;
  text: string;
  data?: T;
  warnings?: string[];
  error?: string;
  errorCode?: string;
  status?: number;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  latencyMs?: number;
}

export interface TransportRequest {
  operation: 'chat.completions' | 'embeddings';
  payload: any;
  requestId: string;
}

export interface Transport {
  send(req: TransportRequest, config: any): Promise<Response>;
}

export class DirectOpenRouterTransport implements Transport {
  async send(req: TransportRequest, config: any): Promise<Response> {
    const url = req.operation === 'chat.completions'
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/embeddings';

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${config.directApiKey}`);
    if (req.operation === 'chat.completions') {
      headers.set('HTTP-Referer', 'https://shop-builder.ir');
      headers.set('X-Title', 'SaaS Shop Builder');
    }

    return await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.payload),
    });
  }
}

export class GatewayOpenRouterTransport implements Transport {
  async send(req: TransportRequest, config: any): Promise<Response> {
    if (!config.gatewayUrl || !config.gatewayToken) {
      throw new AiProviderError('AI_CONFIGURATION_ERROR', 'آدرس یا توکن درگاه واسط هوش مصنوعی تنظیم نشده است.', 503);
    }

    const headers = new Headers();
    headers.set('X-Gateway-Token', config.gatewayToken);
    headers.set('X-Request-Id', req.requestId);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');

    const body = {
      version: '1',
      requestId: req.requestId,
      operation: req.operation,
      payload: req.payload,
    };

    return await fetch(config.gatewayUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }
}

export class CustomEmbeddingTransport implements Transport {
  async send(req: TransportRequest, config: any): Promise<Response> {
    const baseUrl = config.aiEmbeddingBaseUrl || 'https://api.openai.com/v1';
    const apiKey = config.aiEmbeddingApiKey || config.directApiKey;

    if (!apiKey) {
      throw new AiProviderError('AI_CONFIGURATION_ERROR', 'کلید API برای Embedding تنظیم نشده است.', 503);
    }

    const url = `${baseUrl.replace(/\/$/, '')}/embeddings`;
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${apiKey}`);

    let cleanModel = req.payload.model;
    if (cleanModel.startsWith('openai/')) {
      cleanModel = cleanModel.substring(7);
    }

    const payload = {
      ...req.payload,
      model: cleanModel,
    };

    return await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }
}

/**
 * Standardizes upstream/provider HTTP status codes into typed AiProviderErrors.
 */
function mapHttpStatusToErrorCode(status: number): AiErrorCode {
  if (status === 401) return 'AI_AUTH_ERROR';
  if (status === 403) return 'AI_PROVIDER_ERROR';
  if (status === 429) return 'AI_RATE_LIMIT_ERROR';
  if (status === 408) return 'AI_TIMEOUT';
  if (status === 502 || status === 503 || status === 504) return 'AI_GATEWAY_UNAVAILABLE';
  return 'AI_PROVIDER_ERROR';
}

/**
 * Executes chat completions, with direct / gateway routing, retries, exponential backoff, fallback models, and logging.
 */
export async function executeChatCompletion<T = any>(
  request: ChatCompletionRequest,
  opts: ExecuteOptions
): Promise<Response | ChatCompletionResult<T>> {
  if ((globalThis as any).mockChatCompletionGlobal) {
    return (globalThis as any).mockChatCompletionGlobal(request, opts);
  }
  const startTime = Date.now();
  const requestId = opts.requestId || Math.random().toString(36).substring(7);
  const { shopId, endpoint, slot, enableFallback = true, skipQuotaCheck = false, featureKey = 'aiAgentEnabled', billingMode = 'tenant', capability, rootRequestId } = opts;

  let fallbackTriggered = false;

  // 1. Centralized Quota Checking (happens before execution)
  if (!skipQuotaCheck && shopId !== 'N/A' && shopId !== 'system' && billingMode !== 'platform') {
    const quota = await checkShopQuota(shopId, featureKey, billingMode);
    if (!quota.allowed) {
      const err = new AiProviderError('AI_RATE_LIMIT_ERROR', quota.message);
      const isGatewayConfigured = !!(process.env.AI_GATEWAY_URL && process.env.AI_GATEWAY_TOKEN);
      const transportMode = isGatewayConfigured ? 'gateway' : 'direct';
      await logAiUsage({
        shopId,
        endpoint,
        model: request.model,
        tokensIn: 0,
        tokensOut: 0,
        requestId,
        transportMode,
        durationMs: Date.now() - startTime,
        retryCount: 0,
        fallbackUsed: false,
        success: false,
        error: err.message,
        operationType: 'chat',
        capability,
        rootRequestId,
        modelSlot: slot,
        errorCode: 'AI_QUOTA_EXCEEDED',
      });
      return { success: false, text: '', error: err.persianMessage, errorCode: 'AI_QUOTA_EXCEEDED', status: 429 };
    }
  }

  const decrementQuotaOnFailure = async () => {
    if (!skipQuotaCheck && shopId !== 'N/A' && shopId !== 'system' && billingMode !== 'platform') {
      await decrementShopQuota(shopId);
    }
  };

  try {
    // 2. Resolve Active Configuration
    const config = await resolveAiProviderConfig();
    if (config.mode === 'disabled') {
      throw new AiProviderError('AI_GATEWAY_UNAVAILABLE', 'سرویس هوش مصنوعی غیرفعال است.', 503);
    }

    // 3. Resolve target model exactly once
    const resolution = await resolveAiModel(request.model, slot, shopId);
    const resolvedModel = resolution.model;

    console.log('[AI_OBSERVABILITY]', {
      requestId,
      slot,
      model: resolvedModel,
      source: resolution.source,
    });

    const providerPayload = {
      ...request,
      model: resolvedModel,
    };

    // 4. Select Transport
    let transport: Transport;
    if (config.mode === 'gateway') {
      transport = new GatewayOpenRouterTransport();
    } else {
      transport = new DirectOpenRouterTransport();
    }

    const transportRequest: TransportRequest = {
      operation: 'chat.completions',
      payload: providerPayload,
      requestId,
    };

    // 5. Implement retry policy with jittered exponential backoff
    const maxAttempts = 3;
    const delays = [1000, 2000, 4000];

    const executeRequest = async (): Promise<Response | ChatCompletionResult<T>> => {
      let response: Response | null = null;
      let finalError: any = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

        try {
          response = await transport.send(transportRequest, config);

          clearTimeout(timeoutId);

          if (response.ok) {
            // If streaming, return the raw Response immediately to the route so it can pipe the stream
            if (request.stream) {
              await logAiUsage({
                shopId,
                endpoint,
                model: resolvedModel,
                tokensIn: Math.ceil(JSON.stringify(request.messages).length / 4),
                tokensOut: 0,
                requestId,
                transportMode: config.mode === 'gateway' ? 'gateway' : 'direct',
                durationMs: Date.now() - startTime,
                retryCount: attempt - 1,
                fallbackUsed: false,
                success: true,
                operationType: 'chat',
                resolvedModel,
                modelSlot: slot,
                modelSource: resolution.source,
                capability,
                rootRequestId,
              });
              return response;
            }

            // Non-streaming response parsing
            const responseText = await response.text();
            let responseData: any;
            try {
              responseData = JSON.parse(responseText);
            } catch (e) {
              throw new AiProviderError('AI_INVALID_RESPONSE', 'پاسخ دریافتی از درگاه واسط JSON معتبر نبود.', 502);
            }

            if (responseData.error) {
              const msg = responseData.error.message || JSON.stringify(responseData.error);
              throw new AiProviderError('AI_PROVIDER_ERROR', msg, response.status || 502);
            }

            const text = responseData.choices?.[0]?.message?.content || '';
            if (!text && request.response_format?.type === 'json_object') {
              throw new AiProviderError('AI_INVALID_RESPONSE', 'خروجی هوش مصنوعی خالی بود.', 502);
            }

            const tokensIn = responseData.usage?.prompt_tokens || Math.ceil(JSON.stringify(request.messages).length / 4);
            const tokensOut = responseData.usage?.completion_tokens || Math.ceil(text.length / 4);
            const { costUsd, costStatus } = resolveAiCost(resolvedModel, tokensIn, tokensOut, 'chat');

            await logAiUsage({
              shopId,
              endpoint,
              model: resolvedModel,
              tokensIn,
              tokensOut,
              costUsd,
              costStatus,
              requestId,
              transportMode: config.mode === 'gateway' ? 'gateway' : 'direct',
              durationMs: Date.now() - startTime,
              retryCount: attempt - 1,
              fallbackUsed: false,
              success: true,
              operationType: 'chat',
              resolvedModel,
              modelSlot: slot,
              modelSource: resolution.source,
              capability,
              rootRequestId,
            });

            return {
              success: true,
              text,
              model: resolvedModel,
              tokensIn,
              tokensOut,
              costUsd,
              latencyMs: Date.now() - startTime,
            };
          }

          // Throw error for non-ok response status codes
          const status = response.status;
          const errCode = mapHttpStatusToErrorCode(status);
          const responseText = await response.text();
          let errMsg = `Upstream error ${status}: ${responseText}`;
          try {
            const errJson = JSON.parse(responseText);
            if (errJson?.error?.message) {
              errMsg = errJson.error.message;
            }
          } catch (e) {}

          const isRetryable = status === 429 || (status >= 500 && status < 600);
          if (isRetryable && attempt < maxAttempts) {
            const jitter = Math.random() * 200;
            const waitTime = delays[attempt - 1] + jitter;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }

          throw new AiProviderError(errCode, errMsg, status);
        } catch (err: any) {
          clearTimeout(timeoutId);
          const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('Timeout');
          finalError = isTimeout ? new AiProviderError('AI_TIMEOUT', 'زمان انتظار به پایان رسید.', 408) : err;

          // Do not retry on 400, 401, 403, 404, 422
          if (err instanceof AiProviderError && err.status && [400, 401, 403, 404, 422].includes(err.status)) {
            throw finalError;
          }

          if (attempt < maxAttempts) {
            const jitter = Math.random() * 200;
            await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1] + jitter));
            continue;
          }
          throw finalError;
        }
      }

      if (finalError) {
        throw finalError;
      }

      throw new AiProviderError('AI_PROVIDER_ERROR', 'خطای پیش‌بینی نشده در برقراری ارتباط با سرویس هوش مصنوعی.', 502);
    };

    return await executeRequest();
  } catch (err: any) {
    console.error(`[executeChatCompletion] Primary model (${request.model}) failed:`, err.message || err);

    // 6. Fallback Model Policy
    // Do not fallback on 400, 401, 403, 404, 422
    const isConfigOrCapabilityError = err instanceof AiProviderError && err.status && [400, 401, 403, 404, 422].includes(err.status);

    if (enableFallback && slot !== 'fallback' && !isConfigOrCapabilityError) {
      fallbackTriggered = true;
      console.log(`[executeChatCompletion] Attempting fallback model for slot: ${slot}`);
      try {
        const fallbackResolution = await resolveAiModel(undefined, 'fallback', shopId);
        const fallbackModel = fallbackResolution.model;

        console.log('[AI_OBSERVABILITY_FALLBACK]', {
          requestId,
          primaryModel: request.model,
          fallbackModel,
        });

        const fallbackRequest = { ...request, model: fallbackModel };

        const result = await executeChatCompletion(fallbackRequest, {
          ...opts,
          slot: 'fallback',
          enableFallback: false,
          skipQuotaCheck: true, // Do not double-deduct quota during fallback
          // AI-008: fallback is a separate attempt recorded under the SAME root request as the primary.
          rootRequestId: rootRequestId || requestId,
        });

        if ('success' in result && result.success) {
          return {
            ...result,
            warnings: [...(result.warnings || []), 'پاسخ با مدل پشتیبان تولید شد.'],
          };
        }
      } catch (fallbackErr: any) {
        console.error('[executeChatCompletion] Fallback model also failed:', fallbackErr.message || fallbackErr);
      }
    }

    await decrementQuotaOnFailure();

    const finalErrObj = err instanceof AiProviderError ? err : new AiProviderError('AI_PROVIDER_ERROR', err?.message || String(err), 502);
    await logAiUsage({
      shopId,
      endpoint,
      model: request.model,
      tokensIn: 0,
      tokensOut: 0,
      requestId,
      transportMode: 'direct',
      durationMs: Date.now() - startTime,
      retryCount: 0,
      fallbackUsed: fallbackTriggered,
      success: false,
      error: finalErrObj.message,
      operationType: 'chat',
      capability,
      rootRequestId,
      modelSlot: slot,
      errorCode: finalErrObj.code,
    });

    return {
      success: false,
      text: '',
      error: finalErrObj.persianMessage,
      errorCode: finalErrObj.code,
      status: finalErrObj.status || 502,
    };
  }
}

/**
 * Compatibility wrapper mimicking the legacy callAiGateway signature.
 */
export async function callAiGateway<T = any>(options: {
  shopId: string;
  endpoint: string;
  slot: AiModelSlot;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  mode?: 'text' | 'json';
  temperature?: number;
  maxTokens?: number;
  responseFormat?: any;
  requiredFields?: string[];
  fallbackValue?: any;
  enableFallback?: boolean;
  skipQuotaCheck?: boolean;
  featureKey?: string;
}): Promise<ChatCompletionResult<T>> {
  const {
    shopId,
    endpoint,
    slot,
    messages,
    mode = 'text',
    temperature = 0.2,
    maxTokens = 2000,
    responseFormat,
    requiredFields = [],
    fallbackValue = {},
    enableFallback = true,
    skipQuotaCheck = false,
    featureKey = 'aiAgentEnabled',
  } = options;

  const request: ChatCompletionRequest = {
    model: '', // Will be resolved dynamically by executeChatCompletion
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature,
    max_tokens: maxTokens,
    response_format: mode === 'json' ? (responseFormat || { type: 'json_object' }) : undefined,
  };

  const response = await executeChatCompletion<T>(request, {
    shopId,
    endpoint,
    slot,
    enableFallback,
    skipQuotaCheck,
    featureKey,
  });

  if (response instanceof Response) {
    throw new Error('Streaming response received inside a non-streaming compat wrapper');
  }

  if (response.success && mode === 'json' && response.text) {
    const { data, warnings } = parseAiJson<T>(response.text, requiredFields as any, fallbackValue);
    return {
      ...response,
      data,
      warnings,
    };
  }

  return response;
}

/**
 * AI-008 (Phase C): usage/quota context for embedding calls. Optional so internal/system callers
 * (e.g. super-admin test-model) can pass `{ shopId: 'system' }` to stay quota-exempt while still
 * routing through the SAME central logging path. When omitted, no tenant usage is recorded.
 */
export interface EmbeddingUsageContext {
  shopId: string;
  endpoint: string;
  capability?: string;
  featureKey?: string;
  billingMode?: 'tenant' | 'platform';
  requestId?: string;
  rootRequestId?: string;
  idempotencyKey?: string;
  inputCount?: number;
  /** Skip the pre-call authorization gate (used by RAG sub-calls already metered by the parent chat). */
  skipQuota?: boolean;
}

/**
 * Executes embedding requests through gateway or direct.
 */
export async function executeEmbedding(
  request: EmbeddingRequest,
  usage?: EmbeddingUsageContext
): Promise<number[]> {
  const config = await resolveAiProviderConfig();
  if (config.mode === 'disabled') {
    throw new AiProviderError('AI_CONFIGURATION_ERROR', 'سرویس هوش مصنوعی غیرفعال است.', 503);
  }

  // Resolve target model exactly once
  const resolvedResult = await resolveAiModel(request.model, 'embedding');
  const resolvedModel = resolvedResult.model;

  if (!resolvedModel) {
    throw new AiProviderError('AI_CONFIGURATION_ERROR', 'مدل Embedding تنظیم نشده است.', 503);
  }

  const embedStart = Date.now();
  const requestId = usage?.requestId || Math.random().toString(36).substring(7);

  // AI-008: authorization + tenant scope BEFORE the paid provider call. Embeddings do NOT consume
  // the monthly chat request quota (see checkShopQuota) — they are cost-tracked separately — but an
  // inactive package / disabled feature must still block the paid call for a tenant.
  const isTenantBillable =
    !!usage &&
    !usage.skipQuota &&
    (usage.billingMode || 'tenant') !== 'platform' &&
    usage.shopId !== 'system' &&
    usage.shopId !== 'N/A';
  if (isTenantBillable) {
    const access = await hasActiveAiAccess(usage!.shopId, usage!.featureKey || 'aiAgentEnabled', 'tenant');
    if (!access.allowed) {
      throw new AiProviderError('AI_QUOTA_EXCEEDED', access.message || 'دسترسی هوش مصنوعی فعال نیست.', 429);
    }
  }

  // Estimate input tokens (embedding providers rarely return usage): ~4 chars per token.
  const inputs = Array.isArray(request.input) ? request.input : [request.input];
  const inputCount = usage?.inputCount ?? inputs.length;
  const estimatedTokens = Math.ceil(inputs.join(' ').length / 4);

  // Determine transport mode
  let transportMode: 'gateway' | 'direct' | 'custom' = config.mode;
  if (config.mode === 'direct') {
    if (config.aiEmbeddingBaseUrl && !config.aiEmbeddingBaseUrl.includes('openrouter.ai')) {
      transportMode = 'custom';
    }
  }

  // AI-001: SSRF guard for admin-configured custom embedding endpoints. Validated right before
  // use (defends against DNS-rebinding and any value that bypassed save-time validation).
  if (transportMode === 'custom') {
    const embedUrl = `${(config.aiEmbeddingBaseUrl || '').replace(/\/$/, '')}/embeddings`;
    const safe = await isPublicHttpUrlSafe(embedUrl);
    if (!safe) {
      throw new AiProviderError(
        'AI_CONFIGURATION_ERROR',
        'آدرس سرویس Embedding غیرمجاز است (اشاره به شبکه داخلی/لوکال مسدود شد).',
        400
      );
    }
  }

  // Select Transport
  let transport: Transport;
  if (transportMode === 'gateway') {
    transport = new GatewayOpenRouterTransport();
  } else if (transportMode === 'custom') {
    transport = new CustomEmbeddingTransport();
  } else {
    transport = new DirectOpenRouterTransport();
  }

  const providerPayload = {
    ...request,
    model: resolvedModel,
  };

  const transportRequest: TransportRequest = {
    operation: 'embeddings',
    payload: providerPayload,
    requestId,
  };

  const maxAttempts = 3;
  const delays = [1000, 2000, 4000];

  const executeRequest = async (): Promise<number[]> => {
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        const response = await transport.send(transportRequest, config);

        clearTimeout(timeoutId);

        if (!response.ok) {
          const status = response.status;
          const errCode = mapHttpStatusToErrorCode(status);
          const responseText = await response.text();
          let errMsg = `Upstream error ${status}: ${responseText}`;
          try {
            const errJson = JSON.parse(responseText);
            if (errJson?.error?.message) {
              errMsg = errJson.error.message;
            }
          } catch (e) {}

          // Do not retry on 400, 401, 403, 404, 422
          if (status && [400, 401, 403, 404, 422].includes(status)) {
            throw new AiProviderError(errCode, errMsg, status);
          }

          if (attempt < maxAttempts) {
            const jitter = Math.random() * 200;
            await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1] + jitter));
            continue;
          }

          throw new AiProviderError(errCode, errMsg, status);
        }

        const data = await response.json();
        const embedding = data.data?.[0]?.embedding;
        if (!embedding || !Array.isArray(embedding)) {
          throw new AiProviderError('AI_INVALID_RESPONSE', 'فرمت پاسخ وکتور معتبر نبود.', 502);
        }
        return embedding as number[];
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err instanceof AiProviderError && err.status && [400, 401, 403, 404, 422].includes(err.status)) {
          throw lastError;
        }

        if (attempt < maxAttempts) {
          const jitter = Math.random() * 200;
          await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1] + jitter));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError instanceof AiProviderError ? lastError : new AiProviderError('AI_PROVIDER_ERROR', lastError?.message || String(lastError), 502);
  };

  const logTransport: 'gateway' | 'direct' = transportMode === 'gateway' ? 'gateway' : 'direct';

  try {
    const embedding = await executeRequest();
    if (usage) {
      await logAiUsage({
        shopId: usage.shopId,
        endpoint: usage.endpoint,
        model: resolvedModel,
        resolvedModel,
        tokensIn: estimatedTokens,
        tokensOut: 0,
        requestId,
        transportMode: logTransport,
        durationMs: Date.now() - embedStart,
        retryCount: 0,
        fallbackUsed: false,
        success: true,
        operationType: 'embedding',
        modelSlot: 'embedding',
        modelSource: resolvedResult.source,
        capability: usage.capability,
        rootRequestId: usage.rootRequestId,
        inputCount,
        vectorDimensions: embedding.length,
        idempotencyKey: usage.idempotencyKey,
      });
    }
    return embedding;
  } catch (err: any) {
    if (usage) {
      await logAiUsage({
        shopId: usage.shopId,
        endpoint: usage.endpoint,
        model: resolvedModel,
        resolvedModel,
        tokensIn: 0,
        tokensOut: 0,
        requestId,
        transportMode: logTransport,
        durationMs: Date.now() - embedStart,
        retryCount: 0,
        fallbackUsed: false,
        success: false,
        operationType: 'embedding',
        capability: usage.capability,
        rootRequestId: usage.rootRequestId,
        inputCount,
        errorCode: err instanceof AiProviderError ? err.code : 'AI_PROVIDER_ERROR',
        error: err?.message,
      });
    }
    throw err;
  }
}
