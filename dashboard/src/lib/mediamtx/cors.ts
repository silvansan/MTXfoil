export type CorsSettings = {
  apiAllowOrigins?: string[]
  hlsAllowOrigins?: string[]
  webrtcAllowOrigins?: string[]
  playbackAllowOrigins?: string[]
  metricsAllowOrigins?: string[]
  trustedProxies?: string[]
}

export function mapCorsToYaml(settings: CorsSettings): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  if (settings.apiAllowOrigins) result.apiAllowOrigins = settings.apiAllowOrigins
  if (settings.hlsAllowOrigins) result.hlsAllowOrigins = settings.hlsAllowOrigins
  if (settings.webrtcAllowOrigins) result.webrtcAllowOrigins = settings.webrtcAllowOrigins
  if (settings.playbackAllowOrigins) result.playbackAllowOrigins = settings.playbackAllowOrigins
  if (settings.metricsAllowOrigins) result.metricsAllowOrigins = settings.metricsAllowOrigins
  if (settings.trustedProxies) result.trustedProxies = settings.trustedProxies
  return result
}

export function hasWildcardOrigin(origins: string[] | undefined): boolean {
  return Boolean(origins?.includes('*'))
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

  const production = process.env.NODE_ENV === 'production'

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

export async function patchCorsViaApi(settings: CorsSettings): Promise<void> {
  const { mtxFetch } = await import('./client')
  const patch = mapCorsToYaml(settings)
  await mtxFetch('/v3/config/global/patch', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}
