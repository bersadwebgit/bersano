import { prisma } from '../prisma';
import { redis } from '../redis';
import { resolveAiCost, AiOperationType, CostStatus } from '../ai-pricing';

const FEATURE_NAMES: Record<string, string> = {
  aiAgentEnabled: 'دستیار هوشمند ادمین',
  aiChatEnabled: 'چت هوشمند مشتریان',
  aiSeoEnabled: 'تولید سئو هوشمند',
  aiArticleEnabled: 'تولید مقاله هوشمند',
  aiFaqsEnabled: 'تولید سوالات متداول هوشمند',
};

export interface ShopAiAccess {
  allowed: boolean;
  message?: string;
  aiRequestsLimit: number;
}

/**
 * Resolves whether a shop is authorized to use an AI feature (active package + feature flag),
 * WITHOUT touching the monthly request counter. Shared by both the chat quota gate and the
 * embedding path so authorization logic lives in exactly one place (no parallel usage system).
 */
export async function hasActiveAiAccess(
  shopId: string,
  featureKey = 'aiAgentEnabled',
  billingMode: 'tenant' | 'platform' = 'tenant'
): Promise<ShopAiAccess> {
  if (billingMode === 'platform' || shopId === 'system' || shopId === 'N/A') {
    return { allowed: true, aiRequestsLimit: Number.MAX_SAFE_INTEGER };
  }

  const shopSettings = await prisma.shopSettings.findUnique({
    where: { shopId },
    select: { packageExpiresAt: true, package: true },
  });

  if (!shopSettings) {
    return { allowed: false, message: 'تنظیمات فروشگاه یافت نشد.', aiRequestsLimit: 0 };
  }

  const isPackageActive = shopSettings.packageExpiresAt
    ? new Date(shopSettings.packageExpiresAt) > new Date()
    : false;
  const activePackage = isPackageActive ? shopSettings.package : null;

  if (!activePackage) {
    return {
      allowed: false,
      message: 'برای استفاده از قابلیت‌های هوش مصنوعی نیاز به فعال‌سازی پکیج اشتراک فعال دارید.',
      aiRequestsLimit: 0,
    };
  }

  let packageFeatures: any = {};
  try {
    packageFeatures = activePackage.features ? JSON.parse(activePackage.features) : {};
  } catch (e) {
    console.error('Error parsing package features:', e);
  }

  // Backward compatibility: aiChatEnabled falls back to aiAgentEnabled when unset.
  let isFeatureAllowed = !!packageFeatures[featureKey];
  if (featureKey === 'aiChatEnabled' && packageFeatures.aiChatEnabled === undefined) {
    isFeatureAllowed = !!packageFeatures.aiAgentEnabled;
  }

  if (!isFeatureAllowed) {
    const name = FEATURE_NAMES[featureKey] || 'قابلیت‌های هوش مصنوعی';
    return {
      allowed: false,
      message: `قابلیت ${name} در پکیج فعلی شما فعال نیست. لطفاً پکیج خود را ارتقا دهید.`,
      aiRequestsLimit: 0,
    };
  }

  const aiRequestsLimit = parseInt(packageFeatures.aiRequestsLimit) || 100;
  return { allowed: true, aiRequestsLimit };
}

/**
 * Checks if the shop has exceeded its monthly AI requests quota.
 * NOTE: embedding usage (operationType='embedding') is intentionally EXCLUDED from this counter —
 * embeddings are metered/cost-tracked separately and must not consume the chat request quota.
 */
export async function checkShopQuota(
  shopId: string,
  featureKey = 'aiAgentEnabled',
  billingMode: 'tenant' | 'platform' = 'tenant'
): Promise<{ allowed: boolean; message?: string }> {
  if (billingMode === 'platform' || shopId === 'system' || shopId === 'N/A') {
    return { allowed: true };
  }
  try {
    const access = await hasActiveAiAccess(shopId, featureKey, billingMode);
    if (!access.allowed) {
      return { allowed: false, message: access.message };
    }

    const aiRequestsLimit = access.aiRequestsLimit;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Only chat-style requests (operationType null/legacy or 'chat') count toward the limit.
    const countWhere = { shopId, monthKey, operationType: { not: 'embedding' } } as const;

    let monthlyRequestsCount = 0;
    const redisKey = `quota:${shopId}:${monthKey}`;

    if (redis) {
      try {
        const currentIncr = await redis.incr(redisKey);
        if (currentIncr === 1) {
          const dbCount = await prisma.aiUsage.count({ where: countWhere });
          await redis.set(redisKey, String(dbCount + 1), { ex: 30 * 24 * 3600 }); // 30 days TTL
          monthlyRequestsCount = dbCount;
        } else {
          monthlyRequestsCount = currentIncr - 1;
        }
      } catch (redisErr) {
        console.error('[checkShopQuota] Redis quota check error, falling back to DB:', redisErr);
        monthlyRequestsCount = await prisma.aiUsage.count({ where: countWhere });
      }
    } else {
      monthlyRequestsCount = await prisma.aiUsage.count({ where: countWhere });
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
    console.error('[checkShopQuota] Error checking quota:', error);
    // Fail closed for tenant-billable requests, fail open for platform-owned requests
    if ((billingMode as string) === 'platform' || shopId === 'system' || shopId === 'N/A') {
      return { allowed: true };
    }
    return {
      allowed: false,
      message: 'خطا در بررسی سهمیه هوش مصنوعی. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.',
    };
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

export interface AiUsageInfo {
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
  // AI-008 (Phase C) enrichment — all optional so existing chat callers keep working.
  operationType?: AiOperationType;
  resolvedModel?: string;
  modelSlot?: string;
  modelSource?: string;
  capability?: string;
  rootRequestId?: string;
  inputCount?: number;
  vectorDimensions?: number;
  cacheHit?: boolean;
  costStatus?: CostStatus;
  errorCode?: string;
  idempotencyKey?: string;
}

/**
 * Logs AI usage to the database (durable billing row) and to structured secure console logs.
 * Fire-and-forget: a persistence failure never blocks or crashes the caller's main flow.
 */
export async function logAiUsage(info: AiUsageInfo): Promise<void> {
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
    operationType = 'chat',
    resolvedModel,
    modelSlot,
    modelSource,
    capability,
    rootRequestId,
    inputCount,
    vectorDimensions,
    cacheHit = false,
    costStatus: costStatusIn,
    errorCode,
    idempotencyKey,
  } = info;

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Cache hits never incur a provider charge, regardless of any passed-in cost.
  let finalCostUsd: number;
  let finalCostStatus: CostStatus;
  if (cacheHit) {
    finalCostUsd = 0;
    finalCostStatus = 'resolved';
  } else if (typeof costUsd === 'number' && costStatusIn) {
    finalCostUsd = costUsd;
    finalCostStatus = costStatusIn;
  } else {
    const resolved = resolveAiCost(resolvedModel || model, tokensIn, tokensOut, operationType);
    finalCostUsd = typeof costUsd === 'number' ? costUsd : resolved.costUsd;
    finalCostStatus = costStatusIn || resolved.costStatus;
  }

  const status = success ? 'success' : 'failed';

  // 1. Durable DB row (fire-and-forget). Only successful, tenant-billable calls are persisted —
  // pre-provider failures (quota/config) must record no usage, matching existing behavior.
  if (success && shopId !== 'N/A' && shopId !== 'system') {
    void (async () => {
      try {
        // Idempotency guard: a resumed/retried batch item with the same key must not double-count.
        if (idempotencyKey) {
          const existing = await prisma.aiUsage.findFirst({ where: { idempotencyKey } });
          if (existing) return;
        }
        await prisma.aiUsage.create({
          data: {
            shopId,
            endpoint,
            tokensIn,
            tokensOut,
            costUsd: finalCostUsd,
            costUsdDecimal: finalCostUsd.toFixed(8),
            model: resolvedModel || model,
            resolvedModel: resolvedModel || model,
            operationType,
            status,
            costStatus: finalCostStatus,
            requestId,
            durationMs,
            inputCount: inputCount ?? null,
            idempotencyKey: idempotencyKey ?? null,
            monthKey,
          },
        });
      } catch (err: any) {
        // Unique-violation on idempotencyKey (P2002) means a duplicate — safe to ignore.
        if (err?.code === 'P2002') return;
        console.error('[logAiUsage] Failed to write AiUsage row to database:', err);
      }
    })();
  }

  // 2. Structured, secret-safe observability line (the project's log-based observability channel).
  console.log(
    `[AI-PROVIDER] [OBSERVABILITY] ` +
      `requestId: ${requestId} | ` +
      (rootRequestId ? `rootRequestId: ${rootRequestId} | ` : '') +
      `shopId: ${shopId} | ` +
      (capability ? `capability: ${capability} | ` : '') +
      `endpoint: ${endpoint} | ` +
      `operationType: ${operationType} | ` +
      `model: ${resolvedModel || model} | ` +
      (modelSlot ? `modelSlot: ${modelSlot} | ` : '') +
      (modelSource ? `modelSource: ${modelSource} | ` : '') +
      `transportMode: ${transportMode} | ` +
      `tokensIn: ${tokensIn} | ` +
      `tokensOut: ${tokensOut} | ` +
      (typeof inputCount === 'number' ? `inputCount: ${inputCount} | ` : '') +
      (typeof vectorDimensions === 'number' ? `vectorDimensions: ${vectorDimensions} | ` : '') +
      `costUsd: ${finalCostUsd.toFixed(8)} | ` +
      `costStatus: ${finalCostStatus} | ` +
      `cacheHit: ${cacheHit} | ` +
      `durationMs: ${durationMs}ms | ` +
      `retryCount: ${retryCount} | ` +
      `fallbackUsed: ${fallbackUsed} | ` +
      `status: ${status}` +
      (errorCode ? ` | errorCode: ${errorCode}` : '') +
      (error ? ` | error: ${error.replace(/bearer\s+[a-z0-9-_.]+/gi, 'Bearer ••••••••')}` : '')
  );
}
