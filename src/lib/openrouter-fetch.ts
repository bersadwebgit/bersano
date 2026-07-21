/**
 * [AI-OPTIMIZED] Shared OpenRouter fetch utility wrapping the new canonical AI transport client.
 */

import { executeChatCompletion } from './ai-provider/client';
import { ChatCompletionRequest, ChatMessage } from './ai-provider/types';
import { prisma } from './prisma';

export interface AiLogContext {
  requestId?: string;
  shopId?: string;
  slot?: string;
  model?: string;
  billingMode?: 'tenant' | 'platform';
  // AI-008 (Phase C): per-route usage/quota context. When shopId is a real tenant, the wrapped
  // executeChatCompletion enforces quota and writes a durable AiUsage row for this capability.
  endpoint?: string;
  capability?: string;
  featureKey?: string;
  rootRequestId?: string;
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

export function getIranDateTime() {
  const now = new Date();
  
  const gregorianDate = now.toLocaleDateString('en-US', {
    timeZone: 'Asia/Tehran',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const jalaliDate = now.toLocaleDateString('fa-IR', {
    timeZone: 'Asia/Tehran',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const time = now.toLocaleTimeString('fa-IR', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

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

export async function openRouterFetch(
  url: string,
  options: RequestInit & { logContext?: AiLogContext },
  timeoutMs = 180000
): Promise<Response> {
  const logContext = options.logContext || {};
  const shopId = logContext.shopId || 'N/A';
  const slot = (logContext.slot as any) || 'simple';
  
  let parsedBody: any = {};
  if (options.body && typeof options.body === 'string') {
    try {
      parsedBody = JSON.parse(options.body);
    } catch (e) {}
  }

  // Construct request structure
  const messages: ChatMessage[] = (parsedBody.messages || []).map((m: any) => ({
    role: m.role || 'user',
    content: m.content,
  }));

  const requestPayload: ChatCompletionRequest = {
    model: parsedBody.model || logContext.model || '',
    messages,
    temperature: parsedBody.temperature,
    max_tokens: parsedBody.max_tokens,
    max_completion_tokens: parsedBody.max_completion_tokens,
    top_p: parsedBody.top_p,
    stop: parsedBody.stop,
    seed: parsedBody.seed,
    frequency_penalty: parsedBody.frequency_penalty,
    presence_penalty: parsedBody.presence_penalty,
    response_format: parsedBody.response_format,
    tools: parsedBody.tools,
    tool_choice: parsedBody.tool_choice,
    parallel_tool_calls: parsedBody.parallel_tool_calls,
    stream: parsedBody.stream,
    stream_options: parsedBody.stream_options,
    user: parsedBody.user,
  };

  const billingMode = logContext.billingMode || 'tenant';
  const executeOpts = {
    shopId,
    endpoint: logContext.endpoint || 'legacy-openrouter-fetch',
    slot,
    enableFallback: true,
    skipQuotaCheck: billingMode === 'platform' || shopId === 'system' || shopId === 'N/A' ? true : false,
    requestId: logContext.requestId,
    billingMode,
    featureKey: logContext.featureKey,
    capability: logContext.capability,
    rootRequestId: logContext.rootRequestId,
  };

  const result = await executeChatCompletion(requestPayload, executeOpts);

  // If result is a Response (direct stream or fetch response), return it directly!
  if (result instanceof Response) {
    return result;
  }

  // If success, wrap into an OpenAI-style success response
  if (result.success) {
    const successJson = {
      id: `chatcmpl-${Math.random().toString(36).substring(7)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: result.model || requestPayload.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: result.text,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: result.tokensIn || 0,
        completion_tokens: result.tokensOut || 0,
        total_tokens: (result.tokensIn || 0) + (result.tokensOut || 0),
      },
    };

    return new Response(JSON.stringify(successJson), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Wrap into failure response. AI-008: propagate the real status/errorCode so structured errors
  // (e.g. AI_QUOTA_EXCEEDED → 429) surface to legacy routes instead of a generic 502.
  const failureJson = {
    error: {
      message: result.error || 'خطای ارائه‌دهنده سرویس هوش مصنوعی',
      code: result.errorCode,
    },
  };

  return new Response(JSON.stringify(failureJson), {
    status: result.status || 502,
    headers: { 'Content-Type': 'application/json' },
  });
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
