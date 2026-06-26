/**
 * Build a Redis URL with a URL-encoded password.
 * Prefer REDIS_PASSWORD (avoids compose URL-encoding pitfalls); fall back to REDIS_URL.
 */
export function buildRedisUrl(): string {
  const password = process.env.REDIS_PASSWORD?.trim()
  const host = process.env.REDIS_HOST?.trim() || 'redis'
  const port = process.env.REDIS_PORT?.trim() || '6379'

  if (password) {
    return `redis://:${encodeURIComponent(password)}@${host}:${port}`
  }

  return process.env.REDIS_URL?.trim() || 'redis://localhost:6379'
}

/** Shared ioredis client options — fail fast instead of 20 silent retries. */
export const IOREDIS_CLIENT_OPTIONS = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10_000,
  retryStrategy: (times: number) => (times > 6 ? null : Math.min(times * 500, 3_000)),
} as const
