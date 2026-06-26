import Redis from 'ioredis'

let redisClient: Redis | null | undefined

export function getRedisClient(): Redis | null {
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
      // Caller falls back when Redis is unreachable.
    })
  } catch {
    redisClient = null
  }

  return redisClient
}

export async function ensureRedisReady(redis: Redis): Promise<boolean> {
  try {
    if (redis.status !== 'ready') {
      await redis.connect()
    }
    return true
  } catch {
    return false
  }
}
