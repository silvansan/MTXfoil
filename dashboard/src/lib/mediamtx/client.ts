export class MediaMtxError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'MediaMtxError'
  }
}

export type MediaMtxServer = {
  name: string
  apiUrl: string
  metricsUrl?: string
}

function defaultPrimaryServer(): MediaMtxServer {
  return {
    name: 'primary',
    apiUrl: process.env.MEDIAMTX_API_URL || 'http://mediamtx:9997',
    metricsUrl: process.env.MEDIAMTX_METRICS_URL || 'http://mediamtx:9998',
  }
}

/** Primary + optional multi-server registry from MEDIAMTX_SERVERS JSON env. */
export function getMediaMtxServers(): { primary: MediaMtxServer; servers: MediaMtxServer[] } {
  const fallback = defaultPrimaryServer()
  const raw = process.env.MEDIAMTX_SERVERS?.trim()
  if (!raw) {
    return { primary: fallback, servers: [fallback] }
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { primary: fallback, servers: [fallback] }
    }

    const servers = parsed.map((entry, index) => {
      const item = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
      return {
        name: String(item.name || `server-${index + 1}`),
        apiUrl: String(item.apiUrl || fallback.apiUrl),
        metricsUrl: item.metricsUrl ? String(item.metricsUrl) : fallback.metricsUrl,
      }
    })

    return { primary: servers[0], servers }
  } catch {
    return { primary: fallback, servers: [fallback] }
  }
}

export function getApiBaseUrl(): string {
  return getMediaMtxServers().primary.apiUrl
}

export function getMetricsBaseUrl(): string {
  const { primary } = getMediaMtxServers()
  return primary.metricsUrl || process.env.MEDIAMTX_METRICS_URL || 'http://mediamtx:9998'
}

export function getMtxAuthHeaders(): Record<string, string> {
  const user = process.env.MEDIAMTX_INTERNAL_USER || 'mtxfoil'
  const pass = process.env.MEDIAMTX_INTERNAL_PASS || 'mtxfoil'
  if (!user || !pass) return {}
  const token = Buffer.from(`${user}:${pass}`).toString('base64')
  return { Authorization: `Basic ${token}` }
}

export type MtxFetchOptions = RequestInit & {
  parseJson?: boolean
}

export async function mtxFetch<T = unknown>(
  path: string,
  options: MtxFetchOptions = {},
): Promise<T> {
  const base = path.startsWith('/metrics') ? getMetricsBaseUrl() : getApiBaseUrl()
  const url = path.startsWith('http') ? path : `${base}${path}`
  const { parseJson = true, ...init } = options

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...getMtxAuthHeaders(),
      ...init.headers,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    throw new MediaMtxError(`MediaMTX request failed: ${res.status}`, res.status, body)
  }

  if (!parseJson) {
    return (await res.text()) as T
  }

  const text = await res.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}

export async function mtxHealthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    await mtxFetch('/v3/paths/list')
    return { ok: true, latencyMs: Date.now() - start }
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
