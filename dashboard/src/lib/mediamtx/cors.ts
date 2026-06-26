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

/**
 * MediaMTX 1.11.x (prod pin) uses singular `*AllowOrigin` strings.
 * Plural `*AllowOrigins` arrays were added in v1.15.4+ and crash 1.11.x at startup.
 */
const CORS_ORIGIN_YAML_FIELDS = {
  apiAllowOrigins: 'apiAllowOrigin',
  hlsAllowOrigins: 'hlsAllowOrigin',
  webrtcAllowOrigins: 'webrtcAllowOrigin',
  playbackAllowOrigins: 'playbackAllowOrigin',
  metricsAllowOrigins: 'metricsAllowOrigin',
} as const

const LEGACY_CORS_YAML_KEYS = [
  'trustedProxies',
  ...Object.keys(CORS_ORIGIN_YAML_FIELDS),
] as const

/** Map dashboard origin arrays to a single MediaMTX 1.11.x AllowOrigin string. */
export function originsToAllowOrigin(origins: string[] | undefined): string | undefined {
  if (!origins?.length) return undefined
  if (origins.includes('*')) return '*'
  if (origins.length === 1) return origins[0]
  // 1.11.x accepts one origin string only; newer MediaMTX adds *AllowOrigins arrays.
  return origins[0]
}

/** Remove invalid keys left by older MTXfoil builds (MediaMTX 1.11.x rejects them). */
export function stripLegacyCorsKeys(doc: Record<string, unknown>): void {
  for (const key of LEGACY_CORS_YAML_KEYS) {
    delete doc[key]
  }
}

/** @deprecated Use stripLegacyCorsKeys */
export function stripLegacyTrustedProxies(doc: Record<string, unknown>): void {
  stripLegacyCorsKeys(doc)
}

export function mapCorsToYaml(settings: CorsSettings): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [settingsKey, yamlKey] of Object.entries(CORS_ORIGIN_YAML_FIELDS)) {
    const allowOrigin = originsToAllowOrigin(
      settings[settingsKey as keyof CorsSettings] as string[] | undefined,
    )
    if (allowOrigin !== undefined) result[yamlKey] = allowOrigin
  }
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
    } else if ((origins?.length ?? 0) > 1) {
      warnings.push(
        `${label} CORS has multiple origins — MediaMTX 1.11.x uses a single AllowOrigin string; only the first origin is written to mediamtx.yml (upgrade MediaMTX for per-origin matching)`,
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
