import { getAiModel, AiModelSlot } from '../ai-model-resolver';
import { resolveAiProviderConfig } from './config';
import { checkShopQuota, decrementShopQuota, logAiUsage } from './usage';
import { AiProviderError, AiErrorCode } from './errors';
import { ChatCompletionRequest, EmbeddingRequest, AiLogContext } from './types';
import { parseAiJson } from '../parse-ai-json';
import { calculateAiCost } from '../ai-pricing';
import { prisma } from '../prisma';

export type AiGatewayResult<T = any> = ChatCompletionResult<T>;

export interface ExecuteOptions {
  shopId: string;
  endpoint: string;
  slot: AiModelSlot;
  enableFallback?: boolean;
  skipQuotaCheck?: boolean;
  featureKey?: string;
  requestId?: string;
}

export interface ChatCompletionResult<T = any> {
  success: boolean;
  text: string;
  data?: T;
  warnings?: string[];
  error?: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  latencyMs?: number;
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
  const startTime = Date.now();
  const requestId = opts.requestId || Math.random().toString(36).substring(7);
  const { shopId, endpoint, slot, enableFallback = true, skipQuotaCheck = false, featureKey = 'aiAgentEnabled' } = opts;

  let fallbackTriggered = false;

  // 1. Centralized Quota Checking (happens before execution)
  if (!skipQuotaCheck && shopId !== 'N/A' && shopId !== 'system') {
    const quota = await checkShopQuota(shopId, featureKey);
    if (!quota.allowed) {
      const err = new AiProviderError('AI_RATE_LIMIT_ERROR', quota.message);
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
        fallbackUsed: false,
        success: false,
        error: err.message,
      });
      return { success: false, text: '', error: err.persianMessage };
    }
  }

  const decrementQuotaOnFailure = async () => {
    if (!skipQuotaCheck && shopId !== 'N/A' && shopId !== 'system') {
      await decrementShopQuota(shopId);
    }
  };

  try {
    // 2. Resolve Active Configuration
    const config = await resolveAiProviderConfig();
    if (config.mode === 'disabled') {
      throw new AiProviderError('AI_CONFIGURATION_ERROR', 'سرویس هوش مصنوعی غیرفعال است.');
    }

    // Resolve target model if request.model is empty
    if (!request.model) {
      request.model = await getAiModel(slot, shopId);
    }

    // 3. Build fetch parameters based on Direct or Gateway transport
    let targetUrl: string;
    const headers = new Headers();

    let finalRequestBody: string;

    if (config.mode === 'gateway') {
      if (!config.gatewayUrl || !config.gatewayToken) {
        throw new AiProviderError('AI_CONFIGURATION_ERROR', 'آدرس یا توکن درگاه واسط هوش مصنوعی تنظیم نشده است.');
      }
      targetUrl = config.gatewayUrl;
      headers.set('X-Gateway-Token', config.gatewayToken);
      headers.set('Content-Type', 'application/json');
      headers.set('Accept', 'application/json');

      // Forward complete request inside the standard payload
      finalRequestBody = JSON.stringify({
        operation: 'chat.completions',
        payload: request,
      });
    } else {
      targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
      headers.set('Content-Type', 'application/json');
      headers.set('Authorization', `Bearer ${config.directApiKey}`);
      headers.set('HTTP-Referer', 'https://shop-builder.ir');
      headers.set('X-Title', 'SaaS Shop Builder');

      finalRequestBody = JSON.stringify(request);
    }

    // 4. Implement retry policy with jittered exponential backoff
    const maxAttempts = 3;
    const delays = [1000, 2000, 4000];
    let response: Response | null = null;
    let finalError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

      try {
        response = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: finalRequestBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // If streaming, return the raw Response immediately to the route so it can pipe the stream
          if (request.stream) {
            await logAiUsage({
              shopId,
              endpoint,
              model: request.model,
              tokensIn: Math.ceil(JSON.stringify(request.messages).length / 4),
              tokensOut: 0,
              requestId,
              transportMode: config.mode === 'gateway' ? 'gateway' : 'direct',
              durationMs: Date.now() - startTime,
              retryCount: attempt - 1,
              fallbackUsed: false,
              success: true,
            });
            return response;
          }

          // Non-streaming response parsing
          const responseText = await response.text();
          let responseData: any;
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {
            throw new AiProviderError('AI_INVALID_RESPONSE', 'پاسخ دریافتی از درگاه واسط JSON معتبر نبود.');
          }

          if (responseData.error) {
            const msg = responseData.error.message || JSON.stringify(responseData.error);
            throw new AiProviderError('AI_PROVIDER_ERROR', msg);
          }

          const text = responseData.choices?.[0]?.message?.content || '';
          if (!text && request.response_format?.type === 'json_object') {
            throw new AiProviderError('AI_INVALID_RESPONSE', 'خروجی هوش مصنوعی خالی بود.');
          }

          const tokensIn = responseData.usage?.prompt_tokens || Math.ceil(JSON.stringify(request.messages).length / 4);
          const tokensOut = responseData.usage?.completion_tokens || Math.ceil(text.length / 4);
          const costUsd = calculateAiCost(request.model, tokensIn, tokensOut);

          await logAiUsage({
            shopId,
            endpoint,
            model: request.model,
            tokensIn,
            tokensOut,
            costUsd,
            requestId,
            transportMode: config.mode === 'gateway' ? 'gateway' : 'direct',
            durationMs: Date.now() - startTime,
            retryCount: attempt - 1,
            fallbackUsed: false,
            success: true,
          });

          return {
            success: true,
            text,
            model: request.model,
            tokensIn,
            tokensOut,
            costUsd,
            latencyMs: Date.now() - startTime,
          };
        }

        // Handle failure statuses (do NOT retry 400, 401, 403, 404)
        if (response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
          const errCode = mapHttpStatusToErrorCode(response.status);
          const responseText = await response.text();
          let errMsg = `Upstream error ${response.status}: ${responseText}`;
          try {
            const errJson = JSON.parse(responseText);
            if (errJson?.error?.message) {
              errMsg = errJson.error.message;
            }
          } catch (e) {}

          throw new AiProviderError(errCode, errMsg, response.status);
        }

        // Retry 429 and 5xx errors after exponential delay
        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          if (attempt < maxAttempts) {
            const jitter = Math.random() * 200;
            const waitTime = delays[attempt - 1] + jitter;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
          const errCode = mapHttpStatusToErrorCode(response.status);
          throw new AiProviderError(errCode, `محدودیت یا خطای سرویس دهنده بعد از ${maxAttempts} تلاش.`, response.status);
        }

        break;
      } catch (err: any) {
        clearTimeout(timeoutId);
        const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('Timeout');
        finalError = isTimeout ? new AiProviderError('AI_TIMEOUT', 'زمان انتظار به پایان رسید.') : err;

        if (attempt < maxAttempts && !(err instanceof AiProviderError && err.status && [400, 401, 403, 404].includes(err.status))) {
          const jitter = Math.random() * 200;
          await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1] + jitter));
          continue;
        }
      }
    }

    if (finalError) {
      throw finalError;
    }

    throw new AiProviderError('AI_PROVIDER_ERROR', 'خطای پیش‌بینی نشده در برقراری ارتباط با سرویس هوش مصنوعی.');
  } catch (err: any) {
    console.error(`[executeChatCompletion] Primary model (${request.model}) failed:`, err.message || err);

    // 5. Fallback Model Policy
    if (enableFallback && slot !== 'fallback') {
      fallbackTriggered = true;
      console.log(`[executeChatCompletion] Attempting fallback model for slot: ${slot}`);
      try {
        const fallbackModel = await getAiModel('fallback', shopId);
        const fallbackRequest = { ...request, model: fallbackModel };

        const result = await executeChatCompletion(fallbackRequest, {
          ...opts,
          slot: 'fallback',
          enableFallback: false,
          skipQuotaCheck: true, // Do not double-deduct quota during fallback
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

    const finalErrObj = err instanceof AiProviderError ? err : new AiProviderError('AI_PROVIDER_ERROR', err?.message || String(err));
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
    });

    return {
      success: false,
      text: '',
      error: finalErrObj.persianMessage,
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
 * Executes embedding requests through gateway or direct.
 */
export async function executeEmbedding(request: EmbeddingRequest): Promise<number[]> {
  const config = await resolveAiProviderConfig();
  if (config.mode === 'disabled') {
    throw new AiProviderError('AI_CONFIGURATION_ERROR', 'سرویس هوش مصنوعی غیرفعال است.');
  }

  let targetUrl: string;
  const headers = new Headers();
  let finalRequestBody: string;

  if (config.mode === 'gateway') {
    if (!config.gatewayUrl || !config.gatewayToken) {
      throw new AiProviderError('AI_CONFIGURATION_ERROR', 'آدرس یا توکن درگاه واسط هوش مصنوعی تنظیم نشده است.');
    }
    targetUrl = config.gatewayUrl;
    headers.set('X-Gateway-Token', config.gatewayToken);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');

    finalRequestBody = JSON.stringify({
      operation: 'embeddings',
      payload: request,
    });
  } else {
    // Standard direct call using direct key
    const baseUrl = await prisma.systemSetting.findUnique({
      where: { key: 'ai_embedding_base_url' },
    });
    const apiKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'ai_embedding_api_key' },
    });

    const finalBaseUrl = baseUrl?.value || 'https://api.openai.com/v1';
    const finalApiKey = apiKeySetting?.value || config.directApiKey;

    if (!finalApiKey) {
      throw new AiProviderError('AI_CONFIGURATION_ERROR', 'کلید API برای Embedding تنظیم نشده است.');
    }

    targetUrl = `${finalBaseUrl.replace(/\/$/, '')}/embeddings`;
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${finalApiKey}`);

    finalRequestBody = JSON.stringify(request);
  }

  const maxAttempts = 3;
  const delays = [1000, 2000, 4000];
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: finalRequestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const embedding = data.data?.[0]?.embedding;
        if (!embedding || !Array.isArray(embedding)) {
          throw new AiProviderError('AI_INVALID_RESPONSE', 'فرمت پاسخ وکتور معتبر نبود.');
        }
        return embedding as number[];
      }

      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (attempt < maxAttempts) {
          const jitter = Math.random() * 200;
          await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1] + jitter));
          continue;
        }
      }

      const responseText = await response.text();
      throw new AiProviderError(
        mapHttpStatusToErrorCode(response.status),
        `خطای سرویس دهنده وکتور: ${responseText}`,
        response.status
      );
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt < maxAttempts) {
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1] + jitter));
      }
    }
  }

  throw lastError instanceof AiProviderError ? lastError : new AiProviderError('AI_PROVIDER_ERROR', lastError?.message || String(lastError));
}
