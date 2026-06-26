/**
 * Security response headers for the operator UI and player.
 *
 * HSTS (Strict-Transport-Security) is intentionally omitted here — terminate TLS
 * at Nginx Proxy Manager (or your reverse proxy) and set HSTS there to avoid
 * duplicate or conflicting headers from the Node process.
 */

function parseOrigin(url: string | undefined): string | null {
  if (!url?.trim()) return null
  try {
    return new URL(url.trim()).origin
  } catch {
    return null
  }
}

/** MediaMTX playback / WHIP origins used by the player and operator preview. */
export function collectMediaOrigins(): string[] {
  const origins = new Set<string>()
  for (const envVar of [
    process.env.HLS_BASE_URL,
    process.env.WEBRTC_BASE_URL,
    process.env.PUBLIC_STREAM_DOMAIN
      ? `https://${process.env.PUBLIC_STREAM_DOMAIN.replace(/^https?:\/\//, '')}`
      : undefined,
  ]) {
    const origin = parseOrigin(envVar)
    if (origin) origins.add(origin)
  }
  return [...origins]
}

function joinSources(sources: string[]): string {
  return sources.filter(Boolean).join(' ')
}

/** Operator dashboard CSP — blocks framing, allows media fetches to configured origins. */
export function buildDashboardCsp(mediaOrigins: string[]): string {
  const media = joinSources(["'self'", 'blob:', 'data:', ...mediaOrigins])
  const connect = joinSources(["'self'", 'ws:', 'wss:', ...mediaOrigins])

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `media-src ${media}`,
    `connect-src ${connect}`,
    "font-src 'self' data:",
    "worker-src 'self' blob:",
  ].join('; ')
}

/** Player page CSP — embeddable via frame-ancestors; same media/connect allowances. */
export function buildPlayerCsp(mediaOrigins: string[]): string {
  const media = joinSources(["'self'", 'blob:', 'data:', ...mediaOrigins])
  const connect = joinSources(["'self'", 'ws:', 'wss:', ...mediaOrigins])

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors *",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `media-src ${media}`,
    `connect-src ${connect}`,
    "font-src 'self' data:",
    "worker-src 'self' blob:",
  ].join('; ')
}

/** Scalar API docs page loads scripts from jsDelivr. */
export function buildApiDocsCsp(): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self' data: https://cdn.jsdelivr.net",
  ].join('; ')
}

export const BASE_SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
] as const

export const WHIP_SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), display-capture=(self), geolocation=()',
  },
] as const
