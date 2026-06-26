import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const buckets = new Map<string, { count: number; resetAt: number }>()

/**
 * In-memory sliding-window rate limiter (sync).
 * Safe for Edge middleware — no Node-only dependencies.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}

export function getClientIp(req: NextRequest | Request): string {
  const forwarded =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  return forwarded
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}

/**
 * Payload CMS login is handled by generated routes under `/api/users/*`.
 * Edge middleware can only apply in-memory limits (not shared across replicas).
 * For multi-instance production, also configure rate limiting at the reverse proxy.
 */
export const LOGIN_RATE_LIMIT = { limit: 10, windowMs: 60_000 } as const
export const PLAYBACK_TOKEN_RATE_LIMIT = { limit: 30, windowMs: 60_000 } as const
export const MEDIAMTX_AUTH_RATE_LIMIT = { limit: 120, windowMs: 60_000 } as const
