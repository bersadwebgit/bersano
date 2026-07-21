import { redis } from '../../redis';

export async function checkIdempotencyLock(
  idempotencyKey: string,
  ttlSeconds = 60
): Promise<boolean> {
  if (!redis) return true; // Bypass to avoid hard failures if redis is not configured
  try {
    const lockKey = `ai_lock:${idempotencyKey}`;
    const existing = await redis.get(lockKey);
    if (existing) {
      return false; // already locked
    }
    await redis.set(lockKey, 'locked', { ex: ttlSeconds });
    return true;
  } catch (error) {
    console.error('[idempotency] Redis lock error, bypassing safely:', error);
    return true;
  }
}

export async function releaseIdempotencyLock(idempotencyKey: string): Promise<void> {
  if (!redis) return;
  try {
    const lockKey = `ai_lock:${idempotencyKey}`;
    await redis.del(lockKey);
  } catch {
    // Silent fail
  }
}
