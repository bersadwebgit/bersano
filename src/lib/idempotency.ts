import { redis } from './redis';

/**
 * [AI-OPTIMIZED] Idempotency helper to prevent duplicate execution of AI tasks using Redis.
 */
export async function checkIdempotency(key: string): Promise<any | null> {
  if (!redis || !key) return null;
  try {
    const cached = await redis.get(`idem:${key}`);
    if (cached) {
      console.log(`[Idempotency HIT] key: ${key}`);
      return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
  } catch (err) {
    console.error('[Idempotency] Failed to read from Redis:', err);
  }
  return null;
}

export async function saveIdempotency(key: string, result: any, ttl = 3600): Promise<void> {
  if (!redis || !key || !result) return;
  try {
    await redis.set(`idem:${key}`, JSON.stringify(result), { ex: ttl });
    console.log(`[Idempotency SAVED] key: ${key}`);
  } catch (err) {
    console.error('[Idempotency] Failed to write to Redis:', err);
  }
}
