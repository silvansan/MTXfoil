import Redis from 'ioredis'

import { buildRedisUrl, IOREDIS_CLIENT_OPTIONS } from '@/lib/redis-url'

let redisClient: Redis | null | undefined

export function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient

  const url = buildRedisUrl()
  if (!url) {
    redisClient = null
    return null
  }

  try {
    redisClient = new Redis(url, {
      ...IOREDIS_CLIENT_OPTIONS,
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
