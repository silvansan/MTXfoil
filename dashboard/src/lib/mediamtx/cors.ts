export type CorsSettings = {
  apiAllowOrigins?: string[]
  hlsAllowOrigins?: string[]
  webrtcAllowOrigins?: string[]
  playbackAllowOrigins?: string[]
  metricsAllowOrigins?: string[]
  trustedProxies?: string[]
}

/** MediaMTX has per-service trusted proxy lists, not a global `trustedProxies` key. */
const TRUSTED_PROXY_YAML_FIELDS = [
  'apiTrustedProxies',
  'metricsTrustedProxies',
  'hlsTrustedProxies',
  'webrtcTrustedProxies',
  'playbackTrustedProxies',
  'rtmpTrustedProxies',
  'rtspTrustedProxies',
] as const

/** Remove invalid global key left by older MTXfoil builds (MediaMTX 1.11.x rejects it). */
export function stripLegacyTrustedProxies(doc: Record<string, unknown>): void {
  delete doc.trustedProxies
}

export function mapCorsToYaml(settings: CorsSettings): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  if (settings.apiAllowOrigins) result.apiAllowOrigins = settings.apiAllowOrigins
  if (settings.hlsAllowOrigins) result.hlsAllowOrigins = settings.hlsAllowOrigins
  if (settings.webrtcAllowOrigins) result.webrtcAllowOrigins = settings.webrtcAllowOrigins
  if (settings.playbackAllowOrigins) result.playbackAllowOrigins = settings.playbackAllowOrigins
  if (settings.metricsAllowOrigins) result.metricsAllowOrigins = settings.metricsAllowOrigins
  if (settings.trustedProxies?.length) {
    for (const field of TRUSTED_PROXY_YAML_FIELDS) {
      result[field] = settings.trustedProxies
    }
  }
  return result
}

export function hasWildcardOrigin(origins: string[] | undefined): boolean {
  return Boolean(origins?.includes('*'))
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function getCorsWarnings(settings: CorsSettings): string[] {
  const warnings: string[] = []
  const fields: Array<[string, string[] | undefined]> = [
    ['API', settings.apiAllowOrigins],
    ['HLS', settings.hlsAllowOrigins],
    ['WebRTC', settings.webrtcAllowOrigins],
    ['Playback', settings.playbackAllowOrigins],
    ['Metrics', settings.metricsAllowOrigins],
  ]

  const production = isProduction()

  for (const [label, origins] of fields) {
    if (hasWildcardOrigin(origins)) {
      warnings.push(
        production
          ? `${label} CORS allows wildcard (*) — lock down origins before serving production traffic`
          : `${label} CORS allows wildcard (*) — not recommended in production`,
      )
    }
  }

  return warnings
}

export function getTrustedProxyWarnings(trustedProxies: string[] | undefined): string[] {
  if (!isProduction()) return []
  if (trustedProxies?.length) return []
  return [
    'No trusted proxies configured — add NPM or Docker network IPs when the dashboard is behind a reverse proxy',
  ]
}

function mergeOrigin(origin: string, list: string[] | undefined): string[] {
  const base = list ?? []
  return base.includes(origin) ? base : [...base, origin]
}

/** Merge DASHBOARD_PUBLIC_URL origin into CORS lists when set (idempotent). */
export function enrichCorsFromEnv(settings: CorsSettings): CorsSettings {
  const dashboardUrl = process.env.DASHBOARD_PUBLIC_URL?.trim()
  if (!dashboardUrl) return settings

  try {
    const origin = new URL(dashboardUrl).origin
    return {
      ...settings,
      apiAllowOrigins: mergeOrigin(origin, settings.apiAllowOrigins),
      playbackAllowOrigins: mergeOrigin(origin, settings.playbackAllowOrigins),
      webrtcAllowOrigins: mergeOrigin(origin, settings.webrtcAllowOrigins),
      hlsAllowOrigins: mergeOrigin(origin, settings.hlsAllowOrigins),
    }
  } catch {
    return settings
  }
}

/** Production gate: block apply when CORS is unsafe for go-live. */
export function validateCorsForProduction(settings: CorsSettings): string[] {
  if (!isProduction()) return []

  const errors = [...getCorsWarnings(settings), ...getTrustedProxyWarnings(settings.trustedProxies)]

  const dashboardUrl = process.env.DASHBOARD_PUBLIC_URL?.trim()
  if (dashboardUrl) {
    try {
      const origin = new URL(dashboardUrl).origin
      const required: Array<[string, string[] | undefined]> = [
        ['Playback', settings.playbackAllowOrigins],
        ['WebRTC', settings.webrtcAllowOrigins],
      ]
      for (const [label, origins] of required) {
        if (!hasWildcardOrigin(origins) && !origins?.includes(origin)) {
          errors.push(
            `${label} CORS does not include dashboard origin ${origin} — set DASHBOARD_PUBLIC_URL and apply, or add the origin manually`,
          )
        }
      }
    } catch {
      errors.push('DASHBOARD_PUBLIC_URL is not a valid URL')
    }
  }

  return errors
}

export async function patchCorsViaApi(settings: CorsSettings): Promise<void> {
  const { mtxFetch } = await import('./client')
  const patch = mapCorsToYaml(settings)
  await mtxFetch('/v3/config/global/patch', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}
