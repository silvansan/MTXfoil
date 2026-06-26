import { checkRateLimit } from '@/lib/rate-limit'
import { ensureRedisReady, getRedisClient } from '@/lib/redis'

/**
 * Rate limiter for Node.js API routes. Uses Redis when REDIS_URL is set,
 * otherwise falls back to the in-memory bucket map.
 */
export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const redis = getRedisClient()
  if (redis) {
    try {
      if (!(await ensureRedisReady(redis))) throw new Error('redis unavailable')
      const count = await redis.incr(key)
      if (count === 1) {
        await redis.pexpire(key, windowMs)
      }
      return count <= limit
    } catch {
      // Redis down — fall through to in-memory.
    }
  }

  return checkRateLimit(key, limit, windowMs)
}
