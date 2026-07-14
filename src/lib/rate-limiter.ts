import { redis } from './redis';

/**
 * [AI-OPTIMIZED] Redis-backed rate limiter with in-memory fallback for per-tenant AI requests.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function isRateLimited(shopId: string, limit = 20, windowMs = 60000): Promise<boolean> {
  const now = Date.now();

  // 1. Try Redis Rate Limiting
  if (redis) {
    try {
      const windowKey = Math.floor(now / windowMs);
      const key = `rl:${shopId}:${windowKey}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }
      return count > limit;
    } catch (err) {
      console.error('[RateLimiter] Redis error, falling back to in-memory:', err);
    }
  }

  // 2. Fallback to In-Memory Rate Limiting
  // Clean up expired entries if map gets too large to prevent memory leaks
  if (rateLimitMap.size > 5000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetTime) {
        rateLimitMap.delete(k);
      }
    }
    // If still exceeds 5000, evict oldest entries
    if (rateLimitMap.size > 5000) {
      const keysToEvict = Array.from(rateLimitMap.keys()).slice(0, 1000);
      for (const k of keysToEvict) {
        rateLimitMap.delete(k);
      }
    }
  }

  const record = rateLimitMap.get(shopId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(shopId, {
      count: 1,
      resetTime: now + windowMs,
    });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}
