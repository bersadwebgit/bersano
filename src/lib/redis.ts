import { Redis } from '@upstash/redis'

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

export const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

const ISO_DATE_REGEXP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/

/**
 * Recursively converts ISO-8601 date strings back to Date objects.
 */
export function deserializeDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj

  if (typeof obj === 'string') {
    if (ISO_DATE_REGEXP.test(obj)) {
      return new Date(obj) as any
    }
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(deserializeDates) as any
  }

  if (typeof obj === 'object') {
    const newObj = {} as any
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = deserializeDates(value)
    }
    return newObj
  }

  return obj
}

/**
 * Generic cache-aside helper.
 * Returns cached value if exists, otherwise calls fetcher, stores result, and returns it.
 * TTL is in seconds.
 */
export async function cached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (redis) {
    try {
      const hit = await redis.get<T>(key)
      if (hit !== null) {
        console.log(`[Cache HIT] key: ${key}`)
        return deserializeDates(hit)
      }
      console.log(`[Cache MISS] key: ${key}`)
    } catch (err) {
      console.warn('Redis read error:', err)
      // Redis unavailable — fallback to DB silently
    }
  }

  const data = await fetcher()

  if (redis) {
    try {
      await redis.set(key, data, { ex: ttl })
    } catch (err) {
      console.warn('Redis write error:', err)
      // Redis write failed — non-fatal
    }
  }

  return data
}

/**
 * Delete all keys matching a pattern (use sparingly — O(N) on keyspace)
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  if (!redis) return
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (err) {
    console.warn('Redis invalidatePattern error:', err)
    // non-fatal
  }
}
