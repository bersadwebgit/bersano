import { prisma } from '../prisma';
import { redis } from '../redis';
import { calculateAiCost } from '../ai-pricing';

/**
 * Checks if the shop has exceeded its monthly AI requests quota.
 */
export async function checkShopQuota(
  shopId: string,
  featureKey = 'aiAgentEnabled'
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId },
      select: {
        packageExpiresAt: true,
        package: true,
      },
    });

    if (!shopSettings) {
      return { allowed: false, message: 'تنظیمات فروشگاه یافت نشد.' };
    }

    const isPackageActive = shopSettings.packageExpiresAt
      ? new Date(shopSettings.packageExpiresAt) > new Date()
      : false;
    const activePackage = isPackageActive ? shopSettings.package : null;

    if (!activePackage) {
      return {
        allowed: false,
        message: 'برای استفاده از قابلیت‌های هوش مصنوعی نیاز به فعال‌سازی پکیج اشتراک فعال دارید.',
      };
    }

    let packageFeatures: any = {};
    try {
      packageFeatures = activePackage.features ? JSON.parse(activePackage.features) : {};
    } catch (e) {
      console.error('Error parsing package features:', e);
    }

    // Backward compatibility
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
      return {
        allowed: false,
        message: `قابلیت ${name} در پکیج فعلی شما فعال نیست. لطفاً پکیج خود را ارتقا دهید.`,
      };
    }

    const aiRequestsLimit = parseInt(packageFeatures.aiRequestsLimit) || 100;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let monthlyRequestsCount = 0;
    const redisKey = `quota:${shopId}:${monthKey}`;

    if (redis) {
      try {
        const currentIncr = await redis.incr(redisKey);
        if (currentIncr === 1) {
          const dbCount = await prisma.aiUsage.count({
            where: {
              shopId,
              monthKey,
            },
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
          },
        });
      }
    } else {
      monthlyRequestsCount = await prisma.aiUsage.count({
        where: {
          shopId,
          monthKey,
        },
      });
    }

    if (monthlyRequestsCount >= aiRequestsLimit) {
      if (redis) {
        await redis.decr(redisKey).catch(() => {});
      }
      return {
        allowed: false,
        message:
          'محدودیت استفاده از هوش مصنوعی برای این ماه تمام شده است. لطفاً پکیج خود را ارتقا دهید یا ماه بعد دوباره تلاش کنید.',
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[checkShopQuota] Error checking quota, falling back to allowed=true:', error);
    return { allowed: true };
  }
}

/**
 * Reverts quota increment in Redis in case of failure.
 */
export async function decrementShopQuota(shopId: string): Promise<void> {
  if (redis) {
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const redisKey = `quota:${shopId}:${monthKey}`;
      await redis.decr(redisKey);
    } catch (err) {
      console.error('[decrementShopQuota] Failed to decrement quota:', err);
    }
  }
}

/**
 * Logs AI usage asynchronously to the database and structured secure console logs.
 */
export async function logAiUsage(info: {
  shopId: string;
  endpoint: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd?: number;
  requestId: string;
  transportMode: 'gateway' | 'direct';
  durationMs: number;
  retryCount: number;
  fallbackUsed: boolean;
  success: boolean;
  error?: string;
}): Promise<void> {
  const {
    shopId,
    endpoint,
    model,
    tokensIn,
    tokensOut,
    costUsd,
    requestId,
    transportMode,
    durationMs,
    retryCount,
    fallbackUsed,
    success,
    error,
  } = info;

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const finalCostUsd = costUsd ?? calculateAiCost(model, tokensIn, tokensOut);

  // 1. Log to Database asynchronously (fire and forget)
  if (success && shopId !== 'N/A' && shopId !== 'system') {
    prisma.aiUsage
      .create({
        data: {
          shopId,
          endpoint,
          tokensIn,
          tokensOut,
          costUsd: finalCostUsd,
          model,
          monthKey,
        },
      })
      .catch((err) => {
        console.error('[logAiUsage] Failed to write AiUsage row to database:', err);
      });
  }

  // 2. Output structured safe logs for production observability
  console.log(
    `[AI-PROVIDER] [OBSERVABILITY] ` +
      `requestId: ${requestId} | ` +
      `shopId: ${shopId} | ` +
      `endpoint: ${endpoint} | ` +
      `model: ${model} | ` +
      `transportMode: ${transportMode} | ` +
      `tokensIn: ${tokensIn} | ` +
      `tokensOut: ${tokensOut} | ` +
      `costUsd: ${finalCostUsd.toFixed(6)} | ` +
      `durationMs: ${durationMs}ms | ` +
      `retryCount: ${retryCount} | ` +
      `fallbackUsed: ${fallbackUsed} | ` +
      `success: ${success}` +
      (error ? ` | error: ${error.replace(/bearer\s+[a-z0-9-_.]+/gi, 'Bearer ••••••••')}` : '')
  );
}
