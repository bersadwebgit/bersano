/**
 * [AI-OPTIMIZED] Shared OpenRouter fetch utility with connection mode routing, retry, secure logging, and Persian error mappings.
 */

import { prisma } from './prisma';

export interface AiLogContext {
  requestId?: string;
  shopId?: string;
  slot?: string;
  model?: string;
}

let gatewayEnabledCache: { value: boolean; exp: number } | null = null;

export async function getAiGatewayEnabled(): Promise<boolean> {
  if (gatewayEnabledCache && gatewayEnabledCache.exp > Date.now()) {
    return gatewayEnabledCache.value;
  }
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'ai_gateway_enabled' },
    });
    const enabled = setting?.value === 'true';
    gatewayEnabledCache = { value: enabled, exp: Date.now() + 5000 }; // 5-second cache
    return enabled;
  } catch (error) {
    console.error('[getAiGatewayEnabled] Error reading setting:', error);
    return false;
  }
}

export function invalidateGatewayCache() {
  gatewayEnabledCache = null;
}

function getPersianErrorMessage(status: number): string {
  if (status === 401) {
    return 'احراز هویت API واسط نامعتبر است.';
  }
  if (status === 403) {
    return 'درخواست توسط سیاست امنیتی سرویس هوش مصنوعی رد شد.';
  }
  if (status === 429) {
    return 'تعداد درخواست‌های سرویس هوش مصنوعی موقتاً محدود شده است.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'سرویس هوش مصنوعی موقتاً در دسترس نیست.';
  }
  return '';
}

function createPersianErrorResponse(status: number, message: string): Response {
  const jsonString = JSON.stringify({
    error: {
      message: message
    }
  });
  return new Response(jsonString, {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

function secureLog(info: {
  requestId?: string;
  shopId?: string;
  slot?: string;
  model?: string;
  mode: 'gateway' | 'direct' | 'disabled';
  statusCode?: number;
  duration: number;
  retryCount: number;
  error?: string;
}) {
  const {
    requestId = 'N/A',
    shopId = 'N/A',
    slot = 'N/A',
    model = 'N/A',
    mode,
    statusCode = 'N/A',
    duration,
    retryCount,
    error,
  } = info;

  console.log(
    `[AI-Gateway] [SECURE-LOG] ` +
    `requestId: ${requestId} | ` +
    `shopId: ${shopId} | ` +
    `slot: ${slot} | ` +
    `model: ${model} | ` +
    `mode: ${mode} | ` +
    `statusCode: ${statusCode} | ` +
    `duration: ${duration}ms | ` +
    `retryCount: ${retryCount}` +
    (error ? ` | error: ${error}` : '')
  );
}

export async function openRouterFetch(
  url: string,
  options: RequestInit & { logContext?: AiLogContext },
  timeoutMs = 180000
): Promise<Response> {
  const startTime = Date.now();
  const maxAttempts = 3;
  const delays = [1000, 2000, 4000];
  let lastError: any = null;
  let finalStatus: number | undefined = undefined;
  let finalResponse: Response | null = null;
  let actualAttempts = 0;

  const logContext = options.logContext || {};
  const requestId = logContext.requestId || Math.random().toString(36).substring(7);
  const shopId = logContext.shopId || 'N/A';
  const slot = logContext.slot || 'N/A';
  let modelName = logContext.model || 'N/A';

  // Extract model name from body if not explicitly provided
  if (modelName === 'N/A' && options.body && typeof options.body === 'string') {
    try {
      const parsedBody = JSON.parse(options.body);
      if (parsedBody && parsedBody.model) {
        modelName = parsedBody.model;
      }
    } catch (e) {}
  }

  // 1. Resolve connection mode
  const isGatewayEnabled = await getAiGatewayEnabled();
  const mode: 'gateway' | 'direct' | 'disabled' = isGatewayEnabled ? 'gateway' : 'direct';

  let targetUrl = url;
  const targetHeaders = new Headers(options.headers || {});

  let parsedBodyObj: any = null;
  if (options.body && typeof options.body === 'string') {
    try {
      parsedBodyObj = JSON.parse(options.body);
    } catch (e) {}
  }

  if (isGatewayEnabled) {
    const gatewayUrl = process.env.AI_GATEWAY_URL;
    const gatewayToken = process.env.AI_GATEWAY_TOKEN;
    if (!gatewayUrl || !gatewayToken) {
      const errMsg = 'تنظیمات واسط کاربری هوش مصنوعی ناقص است (URL یا توکن وجود ندارد).';
      secureLog({
        requestId,
        shopId,
        slot,
        model: modelName,
        mode: 'gateway',
        duration: Date.now() - startTime,
        retryCount: 0,
        error: errMsg
      });
      throw new Error(errMsg);
    }

    targetUrl = gatewayUrl;
    targetHeaders.set('X-Gateway-Token', gatewayToken);
    targetHeaders.delete('Authorization');
    targetHeaders.set('Content-Type', 'application/json');
    targetHeaders.set('Accept', 'application/json');

    // Force stream=false for PHP shared gateway compatibility
    if (parsedBodyObj) {
      parsedBodyObj.stream = false;
    }
  } else {
    const allowDirect = process.env.AI_ALLOW_DIRECT_OPENROUTER === 'true';
    if (!allowDirect) {
      const errMsg = 'API واسط غیرفعال است و اتصال مستقیم سرویس هوش مصنوعی در این سرور مجاز نیست.';
      secureLog({
        requestId,
        shopId,
        slot,
        model: modelName,
        mode: 'disabled',
        duration: Date.now() - startTime,
        retryCount: 0,
        error: errMsg
      });
      throw new Error(errMsg);
    }
  }

  const finalBody = parsedBodyObj ? JSON.stringify(parsedBodyObj) : options.body;
  const envTimeout = process.env.AI_GATEWAY_TIMEOUT_MS ? parseInt(process.env.AI_GATEWAY_TIMEOUT_MS, 10) : 180000;
  const finalTimeout = Math.max(envTimeout, timeoutMs);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    actualAttempts = attempt;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, finalTimeout);

    try {
      let signal = controller.signal;
      if (options.signal) {
        if (options.signal.aborted) {
          controller.abort();
        }
        options.signal.addEventListener('abort', () => controller.abort());
      }

      const response = await fetch(targetUrl, {
        ...options,
        body: finalBody,
        headers: targetHeaders,
        signal,
      });

      finalStatus = response.status;
      finalResponse = response;

      if (response.ok) {
        secureLog({
          requestId,
          shopId,
          slot,
          model: modelName,
          mode,
          statusCode: response.status,
          duration: Date.now() - startTime,
          retryCount: attempt - 1
        });
        clearTimeout(timeoutId);
        return response;
      }

      // Do not retry 400, 401, 403, 404
      if (response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
        const persianError = getPersianErrorMessage(response.status);
        if (persianError) {
          finalResponse = createPersianErrorResponse(response.status, persianError);
        }
        secureLog({
          requestId,
          shopId,
          slot,
          model: modelName,
          mode,
          statusCode: response.status,
          duration: Date.now() - startTime,
          retryCount: attempt - 1,
          error: persianError || `HTTP error ${response.status}`
        });
        clearTimeout(timeoutId);
        return finalResponse || response;
      }

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        let waitTime = delays[attempt - 1] || 1000;
        if (retryAfterHeader) {
          const parsedSeconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsedSeconds)) {
            waitTime = Math.min(parsedSeconds * 1000, 10000);
          } else {
            const parsedDate = Date.parse(retryAfterHeader);
            if (!isNaN(parsedDate)) {
              waitTime = Math.min(Math.max(0, parsedDate - Date.now()), 10000);
            }
          }
        }
        console.warn(`[AI-Gateway] Rate limited (429). Waiting ${waitTime}ms before retry (attempt ${attempt}/${maxAttempts})...`);
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          clearTimeout(timeoutId);
          continue;
        }
      }

      if (response.status >= 500 && response.status < 600) {
        const waitTime = delays[attempt - 1] || 1000;
        console.warn(`[AI-Gateway] Server error (${response.status}). Waiting ${waitTime}ms before retry (attempt ${attempt}/${maxAttempts})...`);
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          clearTimeout(timeoutId);
          continue;
        }
      }

      clearTimeout(timeoutId);
      break;
    } catch (error: any) {
      const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
      if (isTimeout) {
        lastError = new Error('پاسخ سرویس هوش مصنوعی بیش از حد طول کشید.');
      } else {
        lastError = error;
      }

      console.error(`[AI-Gateway] Fetch error on attempt ${attempt}/${maxAttempts}:`, lastError.message || lastError);

      if (attempt < maxAttempts) {
        const waitTime = delays[attempt - 1] || 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Handle exhaustion of attempts with a non-ok response
  if (finalResponse && !finalResponse.ok) {
    const persianError = getPersianErrorMessage(finalResponse.status);
    const resolvedResponse = persianError ? createPersianErrorResponse(finalResponse.status, persianError) : finalResponse;
    secureLog({
      requestId,
      shopId,
      slot,
      model: modelName,
      mode,
      statusCode: finalResponse.status,
      duration: Date.now() - startTime,
      retryCount: actualAttempts - 1,
      error: persianError || `HTTP error ${finalResponse.status}`
    });
    return resolvedResponse;
  }

  if (lastError) {
    const isTimeout = lastError.message?.includes('timed out') || lastError.message?.includes('طول کشید') || lastError.name === 'AbortError' || lastError.message?.includes('aborted');
    const msg = isTimeout ? 'پاسخ سرویس هوش مصنوعی بیش از حد طول کشید.' : lastError.message;
    const sanitizedMsg = msg ? msg.replace(/bearer\s+[a-z0-9-_.]+/gi, 'Bearer ••••••••') : 'OpenRouter fetch failed';
    
    secureLog({
      requestId,
      shopId,
      slot,
      model: modelName,
      mode,
      duration: Date.now() - startTime,
      retryCount: actualAttempts - 1,
      error: sanitizedMsg
    });
    throw new Error(sanitizedMsg);
  }

  const genericErrorMsg = 'ارتباط با سرویس هوش مصنوعی موقتاً برقرار نشد. لطفاً چند دقیقه بعد دوباره تلاش کنید.';
  secureLog({
    requestId,
    shopId,
    slot,
    model: modelName,
    mode,
    duration: Date.now() - startTime,
    retryCount: actualAttempts - 1,
    error: genericErrorMsg
  });
  throw new Error(genericErrorMsg);
}

export async function parseOpenRouterJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed || trimmed.startsWith('<')) {
    throw new Error(
      `OpenRouter returned non-JSON response (status ${response.status}): ${trimmed.slice(0, 160)}`
    );
  }

  try {
    return JSON.parse(trimmed);
  } catch (error: any) {
    throw new Error(`OpenRouter JSON parse error: ${error?.message || 'invalid JSON'}`);
  }
}

export function getIranDateTime() {
  const now = new Date();
  
  // Format Gregorian date in Iran timezone
  const gregorianDate = now.toLocaleDateString('en-US', {
    timeZone: 'Asia/Tehran',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format Jalali date in Iran timezone
  const jalaliDate = now.toLocaleDateString('fa-IR', {
    timeZone: 'Asia/Tehran',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Format current time in Iran timezone (Persian digits)
  const time = now.toLocaleTimeString('fa-IR', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Format current time in Iran timezone (English digits)
  const timeEn = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return {
    gregorianDate,
    jalaliDate,
    time,
    timeEn
  };
}