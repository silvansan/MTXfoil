import Redis from 'ioredis'

import { checkRateLimit } from '@/lib/rate-limit'

let redisClient: Redis | null | undefined

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient

  const url = process.env.REDIS_URL?.trim()
  if (!url) {
    redisClient = null
    return null
  }

  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    })
    redisClient.on('error', () => {
      // Fall back to in-memory when Redis is unreachable.
    })
  } catch {
    redisClient = null
  }

  return redisClient
}

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
      if (redis.status !== 'ready') {
        await redis.connect()
      }
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
