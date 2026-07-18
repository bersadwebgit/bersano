import { prisma } from './prisma';
import { getAiModel, AiModelSlot } from './ai-model-resolver';
import { openRouterFetch, parseOpenRouterJsonResponse, getAiGatewayEnabled } from './openrouter-fetch';
import { parseAiJson } from './parse-ai-json';
import { calculateAiCost } from './ai-pricing';
import { redis } from './redis';

export interface AiGatewayOptions {
  shopId: string;
  endpoint: string;
  slot: AiModelSlot;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  mode?: 'text' | 'json';
  temperature?: number;
  maxTokens?: number;
  responseFormat?: any;
  requiredFields?: string[];
  fallbackValue?: any;
  enableFallback?: boolean;
  skipQuotaCheck?: boolean;
  featureKey?: string;
}

export interface AiGatewayResult<T = any> {
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
 * Checks if the shop has exceeded its monthly AI requests quota.
 */
async function checkShopQuota(shopId: string, featureKey = 'aiAgentEnabled'): Promise<{ allowed: boolean; message?: string }> {
  try {
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId },
      select: {
        packageExpiresAt: true,
        package: true,
      }
    });

    if (!shopSettings) {
      return { allowed: false, message: 'تنظیمات فروشگاه یافت نشد.' };
    }

    const isPackageActive = shopSettings.packageExpiresAt ? new Date(shopSettings.packageExpiresAt) > new Date() : false;
    const activePackage = isPackageActive ? shopSettings.package : null;

    if (!activePackage) {
      return { allowed: false, message: 'برای استفاده از قابلیت‌های هوش مصنوعی نیاز به فعال‌سازی پکیج اشتراک فعال دارید.' };
    }

    let packageFeatures: any = {};
    try {
      packageFeatures = activePackage.features ? JSON.parse(activePackage.features) : {};
    } catch (e) {
      console.error('Error parsing package features:', e);
    }

    // Backward compatibility: if aiChatEnabled is not explicitly defined, fallback to aiAgentEnabled
    let isFeatureAllowed = !!packageFeatures[featureKey];
    if (featureKey === 'aiChatEnabled' && packageFeatures.aiChatEnabled === undefined) {
      isFeatureAllowed = !!packageFeatures.aiAgentEnabled;
    }

    if (!isFeatureAllowed) {
      const featureNames: Record<string, string> = {
        aiAgentEnabled: 'دستیار هوشمند ادمین',
        aiChatEnabled: 'چت هوشمند مشتریان',
        aiSeoEnabled: 'تولید سئو هوشمند',
        aiArticleEnabled: 'تولید مقاله هوشمند',
        aiFaqsEnabled: 'تولید سوالات متداول هوشمند',
      };
      const name = featureNames[featureKey] || 'قابلیت‌های هوش مصنوعی';
      return { allowed: false, message: `قابلیت ${name} در پکیج فعلی شما فعال نیست. لطفاً پکیج خود را ارتقا دهید.` };
    }

    const aiRequestsLimit = parseInt(packageFeatures.aiRequestsLimit) || 100;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let monthlyRequestsCount = 0;
    const redisKey = `quota:${shopId}:${monthKey}`;

    if (redis) {
      try {
        // Increment the concurrent quota counter in Redis
        const currentIncr = await redis.incr(redisKey);
        if (currentIncr === 1) {
          // If key was just created, initialize it with the DB count + 1
          const dbCount = await prisma.aiUsage.count({
            where: {
              shopId,
              monthKey,
            }
          });
          await redis.set(redisKey, String(dbCount + 1), { ex: 30 * 24 * 3600 }); // 30 days TTL
          monthlyRequestsCount = dbCount;
        } else {
          monthlyRequestsCount = currentIncr - 1;
        }
      } catch (redisErr) {
        console.error('[checkShopQuota] Redis quota check error, falling back to DB:', redisErr);
        monthlyRequestsCount = await prisma.aiUsage.count({
          where: {
            shopId,
            monthKey,
          }
        });
      }
    } else {
      // Count requests in current month across all endpoints
      monthlyRequestsCount = await prisma.aiUsage.count({
        where: {
          shopId,
          monthKey,
        }
      });
    }

    if (monthlyRequestsCount >= aiRequestsLimit) {
      if (redis) {
        await redis.decr(redisKey).catch(() => {});
      }
      return {
        allowed: false,
        message: 'محدودیت استفاده از هوش مصنوعی برای این ماه تمام شده است. لطفاً پکیج خود را ارتقا دهید یا ماه بعد دوباره تلاش کنید.'
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[checkShopQuota] Error checking quota, falling back to allowed=true:', error);
    return { allowed: true };
  }
}

/**
 * Logs AI usage asynchronously to the database.
 */
function logUsage(
  shopId: string,
  endpoint: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
  costUsd: number
) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  prisma.aiUsage.create({
    data: {
      shopId,
      endpoint,
      tokensIn,
      tokensOut,
      costUsd,
      model,
      monthKey,
    }
  }).catch(err => {
    console.error('[AiGateway] Failed to record AI usage:', err);
  });
}

/**
 * Central AI Gateway for making safe, reliable, and tracked LLM calls.
 */
export async function callAiGateway<T = any>(options: AiGatewayOptions): Promise<AiGatewayResult<T>> {
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

  const startTime = Date.now();

  const decrementQuota = async () => {
    if (redis && !skipQuotaCheck) {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await redis.decr(`quota:${shopId}:${monthKey}`).catch(() => {});
    }
  };

  try {
    // 1. Validate AI System Settings
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['ai_enabled', 'openrouter_api_key']
        }
      }
    });
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    if (settingsMap.get('ai_enabled') === 'false') {
      return {
        success: false,
        text: '',
        error: 'سیستم هوش مصنوعی غیرفعال است. از تنظیمات پلتفرم فعال کنید.',
      };
    }

    const isGatewayEnabled = await getAiGatewayEnabled();
    const apiKey = settingsMap.get('openrouter_api_key');

    if (!apiKey && !isGatewayEnabled) {
      return {
        success: false,
        text: '',
        error: 'تنظیمات هوش مصنوعی کامل نیست. لطفاً از پنل سوپرادمین بررسی کنید.',
      };
    }

    // 2. Validate Quota (No fallback allowed for these)
    if (!skipQuotaCheck) {
      const quotaCheck = await checkShopQuota(shopId, featureKey);
      if (!quotaCheck.allowed) {
        return {
          success: false,
          text: '',
          error: quotaCheck.message || 'محدودیت استفاده از هوش مصنوعی برای این ماه تمام شده است. لطفاً پکیج خود را ارتقا دهید یا ماه بعد دوباره تلاش کنید.',
        };
      }
    }

    // 3. Resolve Primary Model
    const primaryModel = await getAiModel(slot, shopId);
    
    // Prepare API headers and body
    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const apiHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://shop-builder.ir',
      'X-Title': 'SaaS Shop Builder',
    };
    if (apiKey) {
      apiHeaders['Authorization'] = `Bearer ${apiKey}`;
    }

    const requestBody = {
      model: primaryModel,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: mode === 'json' ? (responseFormat || { type: 'json_object' }) : undefined,
    };

    // 4. Call OpenRouter with Primary Model
    let response: Response;
    let responseData: any;
    let aiText = '';
    let primaryModelSuccess = false;

    try {
      response = await openRouterFetch(apiUrl, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify(requestBody),
        logContext: {
          shopId,
          slot,
          model: primaryModel,
        }
      } as any);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (status ${response.status}): ${errorText}`);
      }

      responseData = await parseOpenRouterJsonResponse(response);
      aiText = responseData.choices?.[0]?.message?.content || '';
      
      if (!aiText) {
        throw new Error('No content returned from AI model');
      }

      primaryModelSuccess = true;
    } catch (primaryError: any) {
      console.warn(`[AiGateway] Primary model (${primaryModel}) failed:`, primaryError);
      
      if (!enableFallback) {
        await decrementQuota();
        return {
          success: false,
          text: '',
          error: primaryError.message || 'ارتباط با سرویس هوش مصنوعی موقتاً برقرار نشد. لطفاً چند دقیقه بعد دوباره تلاش کنید.',
        };
      }
    }

    // 5. Handle Primary Model Success (JSON Parsing & Validation)
    if (primaryModelSuccess) {
      if (mode === 'json') {
        const { data, warnings } = parseAiJson<T>(aiText, requiredFields as any, fallbackValue);
        const isValid = data && (requiredFields.length === 0 || requiredFields.every(field => (data as any)[field] !== undefined));

        if (isValid) {
          const latencyMs = Date.now() - startTime;
          const tokensIn = responseData.usage?.prompt_tokens || Math.ceil(JSON.stringify(messages).length / 4);
          const tokensOut = responseData.usage?.completion_tokens || Math.ceil(aiText.length / 4);
          const costUsd = calculateAiCost(primaryModel, tokensIn, tokensOut);

          logUsage(shopId, endpoint, primaryModel, tokensIn, tokensOut, costUsd);

          return {
            success: true,
            text: aiText,
            data,
            warnings,
            model: primaryModel,
            tokensIn,
            tokensOut,
            costUsd,
            latencyMs,
          };
        } else {
          console.warn('[AiGateway] Primary model JSON validation failed.');
          if (!enableFallback) {
            await decrementQuota();
            return {
              success: false,
              text: aiText,
              error: 'پاسخ هوش مصنوعی کامل نبود. لطفاً دوباره تلاش کنید.',
            };
          }
        }
      } else {
        // Text mode success
        const latencyMs = Date.now() - startTime;
        const tokensIn = responseData.usage?.prompt_tokens || Math.ceil(JSON.stringify(messages).length / 4);
        const tokensOut = responseData.usage?.completion_tokens || Math.ceil(aiText.length / 4);
        const costUsd = calculateAiCost(primaryModel, tokensIn, tokensOut);

        logUsage(shopId, endpoint, primaryModel, tokensIn, tokensOut, costUsd);

        return {
          success: true,
          text: aiText,
          model: primaryModel,
          tokensIn,
          tokensOut,
          costUsd,
          latencyMs,
        };
      }
    }

    // 6. Fallback Flow (if primary failed or JSON validation failed)
    if (enableFallback) {
      console.log('[AiGateway] Initiating fallback model...');
      const fallbackModel = await getAiModel('fallback', shopId);
      
      const fallbackRequestBody = {
        ...requestBody,
        model: fallbackModel,
      };

      try {
        const fallbackResponse = await openRouterFetch(apiUrl, {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify(fallbackRequestBody),
          logContext: {
            shopId,
            slot: 'fallback',
            model: fallbackModel,
          }
        } as any);

        if (!fallbackResponse.ok) {
          const errorText = await fallbackResponse.text();
          throw new Error(`Fallback OpenRouter API error (status ${fallbackResponse.status}): ${errorText}`);
        }

        const fallbackResponseData = await parseOpenRouterJsonResponse(fallbackResponse);
        const fallbackAiText = fallbackResponseData.choices?.[0]?.message?.content || '';

        if (!fallbackAiText) {
          throw new Error('No content returned from fallback AI model');
        }

        if (mode === 'json') {
          const { data, warnings } = parseAiJson<T>(fallbackAiText, requiredFields as any, fallbackValue);
          const isValid = data && (requiredFields.length === 0 || requiredFields.every(field => (data as any)[field] !== undefined));

          if (isValid) {
            const latencyMs = Date.now() - startTime;
            const tokensIn = fallbackResponseData.usage?.prompt_tokens || Math.ceil(JSON.stringify(messages).length / 4);
            const tokensOut = fallbackResponseData.usage?.completion_tokens || Math.ceil(fallbackAiText.length / 4);
            const costUsd = calculateAiCost(fallbackModel, tokensIn, tokensOut);

            logUsage(shopId, endpoint, fallbackModel, tokensIn, tokensOut, costUsd);

            return {
              success: true,
              text: fallbackAiText,
              data,
              warnings,
              model: fallbackModel,
              tokensIn,
              tokensOut,
              costUsd,
              latencyMs,
            };
          } else {
            await decrementQuota();
            return {
              success: false,
              text: fallbackAiText,
              error: 'پاسخ هوش مصنوعی کامل نبود. لطفاً دوباره تلاش کنید.',
            };
          }
        } else {
          // Text mode success on fallback
          const latencyMs = Date.now() - startTime;
          const tokensIn = fallbackResponseData.usage?.prompt_tokens || Math.ceil(JSON.stringify(messages).length / 4);
          const tokensOut = fallbackResponseData.usage?.completion_tokens || Math.ceil(fallbackAiText.length / 4);
          const costUsd = calculateAiCost(fallbackModel, tokensIn, tokensOut);

          logUsage(shopId, endpoint, fallbackModel, tokensIn, tokensOut, costUsd);

          return {
            success: true,
            text: fallbackAiText,
            model: fallbackModel,
            tokensIn,
            tokensOut,
            costUsd,
            latencyMs,
          };
        }
      } catch (fallbackError: any) {
        console.error('[AiGateway] Fallback model also failed:', fallbackError);
        await decrementQuota();
        return {
          success: false,
          text: '',
          error: fallbackError.message || 'ارتباط با سرویس هوش مصنوعی موقتاً برقرار نشد. لطفاً چند دقیقه بعد دوباره تلاش کنید.',
        };
      }
    }

    await decrementQuota();
    return {
      success: false,
      text: '',
      error: 'ارتباط با سرویس هوش مصنوعی موقتاً برقرار نشد. لطفاً چند دقیقه بعد دوباره تلاش کنید.',
    };
  } catch (globalError: any) {
    console.error('[AiGateway] Global error:', globalError);
    await decrementQuota();
    return {
      success: false,
      text: '',
      error: globalError.message || 'ارتباط با سرویس هوش مصنوعی موقتاً برقرار نشد. لطفاً چند دقیقه بعد دوباره تلاش کنید.',
    };
  }
}