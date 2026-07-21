import { prisma } from '../prisma';
import { redis } from '../redis';
import { resolveAiCost, AiOperationType, CostStatus } from '../ai-pricing';
import { AiProviderError } from './errors';

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

export function getSecondsUntilEndOfMonth(): number {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const diffMs = nextMonth.getTime() - now.getTime();
  return Math.max(1, Math.ceil(diffMs / 1000));
}

/**
 * Checks if the shop has exceeded its monthly AI requests quota.
 * NOTE: embedding usage (operationType='embedding') is intentionally EXCLUDED from this counter —
 * embeddings are metered/cost-tracked separately and must not consume the chat request quota.
 *
 * =================================================================================================
 * REDIS QUOTA CONCURRENCY & CONSISTENCY ARCHITECTURE:
 * =================================================================================================
 * 1. MEANING OF REDIS KEY:
 *    The Redis key `quota:${shopId}:${monthKey}` acts as a CACHE of committed database usage plus
 *    active soft reservations for in-flight requests.
 *
 * 2. ATOMIC CHECK-AND-INCREMENT (PREVENT OVERSPENDING):
 *    We use an atomic Lua script to check the quota limit and increment the counter in Redis
 *    in a single atomic operation.
 *
 * 3. CRASH RECOVERY & RECONCILIATION:
 *    - If the Redis key does not exist, the Lua script atomically initializes it with `dbCount + 1`
 *      using the exact end-of-month TTL.
 *    - If a request fails, `decrementShopQuota` is called to release the reservation (decrementing the key),
 *      ensuring no permanent quota loss or leakage occurs.
 *    - Process restarts or Redis crashes naturally reconcile on the next request using the Lua script's
 *      atomic EXISTS check.
 * =================================================================================================
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
    let allowed = true;

    if (redis) {
      try {
        const ttl = getSecondsUntilEndOfMonth();
        const exists = await redis.exists(redisKey);
        let dbCount = 0;
        if (!exists) {
          dbCount = await prisma.aiUsage.count({ where: countWhere });
        }

        const script = `
          local exists = redis.call('EXISTS', KEYS[1])
          if exists == 0 then
              local dbCount = tonumber(ARGV[1])
              local limit = tonumber(ARGV[3])
              if dbCount >= limit then
                  return -2
              end
              local initVal = dbCount + 1
              local ttl = tonumber(ARGV[2])
              redis.call('SET', KEYS[1], tostring(initVal), 'EX', ttl)
              return initVal
          else
              local limit = tonumber(ARGV[3])
              local current = tonumber(redis.call('GET', KEYS[1]))
              if current >= limit then
                  return -2
              else
                  return redis.call('INCR', KEYS[1])
              end
          end
        `;

        const result = await redis.eval(script, [redisKey], [String(dbCount), String(ttl), String(aiRequestsLimit)]);
        const count = Number(result);
        if (count === -2) {
          allowed = false;
          monthlyRequestsCount = aiRequestsLimit;
        } else {
          monthlyRequestsCount = count - 1;
        }
      } catch (redisErr) {
        console.error('[checkShopQuota] Redis quota check error, falling back to DB:', redisErr);
        monthlyRequestsCount = await prisma.aiUsage.count({ where: countWhere });
        if (monthlyRequestsCount >= aiRequestsLimit) {
          allowed = false;
        }
      }
    } else {
      monthlyRequestsCount = await prisma.aiUsage.count({ where: countWhere });
      if (monthlyRequestsCount >= aiRequestsLimit) {
        allowed = false;
      }
    }

    if (!allowed) {
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

  // Hardening additions
  attemptIndex?: number;
  providerRequestId?: string;
  usageKnown?: boolean;
  actualCost?: number;
  estimatedCost?: number;
  billingBucket?: 'merchant' | 'platform' | 'system' | 'promotional';
  quotaExempt?: boolean;
  sourceCapability?: string;
  tokenCountSource?: 'provider' | 'tokenizer' | 'estimated';
}

/**
 * Executes an async function with exponential backoff retry.
 * Used to guarantee durable database persistence for billing/usage records.
 */
async function executeWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  let lastErr: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (err?.code === 'P2002') {
        // Unique constraint violation - do not retry, propagate immediately
        throw err;
      }
      console.error(`[executeWithRetry] Attempt ${attempt} failed to write to database:`, err.message || err);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastErr;
}

/**
 * Validates, sanitizes, and namespaces a client-provided idempotency key,
 * or generates a secure server-side key if none is provided.
 */
export function getOrGenerateIdempotencyKey(
  clientKey: string | null | undefined,
  shopId: string,
  operationType: string,
  requestId: string
): string {
  const sanitizedClientKey = clientKey
    ? clientKey.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 100)
    : null;

  if (sanitizedClientKey && sanitizedClientKey.length > 0) {
    return `client:${shopId}:${operationType}:${sanitizedClientKey}`;
  }

  return `server:${shopId}:${operationType}:${requestId}`;
}

/**
 * Logs AI usage to the database (durable billing row) and to structured secure console logs.
 * Awaited & Durable: uses a retry policy with backoff to guarantee that billing/quota records
 * are never lost due to temporary DB failures or network drops.
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
    attemptIndex = 0,
    providerRequestId,
    usageKnown = true,
    actualCost: actualCostIn,
    estimatedCost: estimatedCostIn,
    billingBucket = 'merchant',
    quotaExempt = false,
    sourceCapability,
    tokenCountSource = 'provider',
  } = info;

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Cost calculation
  let finalCostUsd = 0;
  let finalCostStatus: CostStatus = 'resolved';
  let actualCost: number | null = null;
  let estimatedCost = 0;

  if (cacheHit) {
    finalCostUsd = 0;
    finalCostStatus = 'resolved';
    actualCost = 0;
    estimatedCost = 0;
  } else {
    const resolved = resolveAiCost(resolvedModel || model, tokensIn, tokensOut, operationType);
    actualCost = resolved.actualCostUsd;
    estimatedCost = resolved.estimatedCostUsd;
    finalCostStatus = costStatusIn || resolved.costStatus;
    finalCostUsd = actualCost ?? estimatedCost;
  }

  const status = success ? 'success' : 'failed';

  const finalIdempotencyKey = getOrGenerateIdempotencyKey(
    idempotencyKey,
    shopId,
    operationType,
    requestId
  );

  // 1. Durable DB row (awaited with retry).
  // Failed and timed-out provider attempts are also persisted because they can still be billable.
  if (shopId !== 'N/A' && shopId !== 'system') {
    const writeToDb = async () => {
      // Idempotency guard: a resumed/retried batch item with the same key and attempt index must not double-count.
      const existing = await prisma.aiUsage.findFirst({
        where: {
          shopId,
          idempotencyKey: finalIdempotencyKey,
          operationType,
          attemptIndex,
        },
      });
      if (existing) {
        console.log(`[logAiUsage] Duplicate attempt detected, skipping write: shopId=${shopId}, idempotencyKey=${finalIdempotencyKey}, attemptIndex=${attemptIndex}`);
        return;
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
          idempotencyKey: finalIdempotencyKey,
          monthKey,
          rootRequestId: rootRequestId ?? null,
          attemptIndex,
          providerRequestId: providerRequestId ?? null,
          usageKnown,
          actualCost: actualCost !== null ? actualCost.toFixed(8) : null,
          estimatedCost: estimatedCost.toFixed(8),
          errorCode: errorCode ?? null,
          transportMode,
          tokenCountSource,
        },
      });
    };

    try {
      await executeWithRetry(writeToDb, 3, 500);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        console.log('[logAiUsage] Unique constraint violation on idempotency key, ignoring duplicate.');
        return;
      }
      console.error('[logAiUsage] Critical: Failed to write AiUsage row after retries:', err);
      // Throw error to fail the user request on permanent DB failure, preventing unmetered usage
      throw new AiProviderError('AI_DATABASE_ERROR', err.message || String(err), 500);
    }
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
      `attemptIndex: ${attemptIndex} | ` +
      `fallbackUsed: ${fallbackUsed} | ` +
      `status: ${status}` +
      (billingBucket ? ` | billingBucket: ${billingBucket}` : '') +
      (quotaExempt ? ` | quotaExempt: ${quotaExempt}` : '') +
      (sourceCapability ? ` | sourceCapability: ${sourceCapability}` : '') +
      (tokenCountSource ? ` | tokenCountSource: ${tokenCountSource}` : '') +
      (errorCode ? ` | errorCode: ${errorCode}` : '') +
      (error ? ` | error: ${error.replace(/bearer\s+[a-z0-9-_.]+/gi, 'Bearer ••••••••')}` : '')
  );
}
