import { createHmac, timingSafeEqual } from 'node:crypto'

export type PlaybackTokenPayload = {
  slug: string
  exp: number
  gen?: number
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString('base64url')
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8')
}

export function issuePlaybackToken(
  payload: PlaybackTokenPayload,
  secret: string,
): string {
  const body = base64UrlEncode(JSON.stringify(payload))
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyPlaybackToken(
  token: string,
  secret: string,
): PlaybackTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [body, sig] = parts
  const expected = createHmac('sha256', secret).update(body).digest('base64url')

  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as PlaybackTokenPayload
    if (!payload.slug || !payload.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function getPlaybackTokenSecret(): string {
  return process.env.PLAYBACK_TOKEN_SECRET || process.env.PAYLOAD_SECRET || 'dev-secret'
}
