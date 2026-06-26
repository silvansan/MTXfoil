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

export function getMtxAuthHeadersFor(user: string, pass: string): Record<string, string> {
  if (!user || !pass) return {}
  const token = Buffer.from(`${user}:${pass}`).toString('base64')
  return { Authorization: `Basic ${token}` }
}

export function getMtxAuthHeaders(): Record<string, string> {
  const user = process.env.MEDIAMTX_INTERNAL_USER || 'mtxfoil'
  const pass = process.env.MEDIAMTX_INTERNAL_PASS || 'mtxfoil'
  return getMtxAuthHeadersFor(user, pass)
}

export type MtxFetchOptions = RequestInit & {
  parseJson?: boolean
  /** Request timeout in ms; defaults to 8000 unless `signal` is provided. */
  timeoutMs?: number
  /** Override Basic auth (bootstrap when env creds differ from mediamtx.yml). */
  basicAuth?: { user: string; pass: string }
}

const DEFAULT_MTX_FETCH_TIMEOUT_MS = 8_000

async function readResponseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function resolveFetchSignal(
  signal: AbortSignal | null | undefined,
  timeoutMs: number,
): AbortSignal | undefined {
  if (signal) return signal
  return AbortSignal.timeout(timeoutMs)
}

export async function mtxFetch<T = unknown>(
  path: string,
  options: MtxFetchOptions = {},
): Promise<T> {
  const base = path.startsWith('/metrics') ? getMetricsBaseUrl() : getApiBaseUrl()
  const url = path.startsWith('http') ? path : `${base}${path}`
  const {
    parseJson = true,
    timeoutMs = DEFAULT_MTX_FETCH_TIMEOUT_MS,
    signal,
    basicAuth,
    ...init
  } = options

  const res = await fetch(url, {
    ...init,
    signal: resolveFetchSignal(signal, timeoutMs),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(basicAuth ? getMtxAuthHeadersFor(basicAuth.user, basicAuth.pass) : getMtxAuthHeaders()),
      ...init.headers,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await readResponseBody(res)
    throw new MediaMtxError(`MediaMTX request failed: ${res.status}`, res.status, body)
  }

  if (!parseJson) {
    return (await res.text()) as T
  }

  const text = await res.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}

/** Redact credentials from a MediaMTX base URL for operator-visible diagnostics. */
export function redactMediaMtxUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.password) parsed.password = '***'
    if (parsed.username) parsed.username = '***'
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return url.replace(/:\/\/[^:@/]+:[^@/]+@/, '://***:***@')
  }
}

export function getRedactedApiBaseUrl(): string {
  return redactMediaMtxUrl(getApiBaseUrl())
}

function getFetchCause(err: unknown): string | undefined {
  if (!(err instanceof Error) || !('cause' in err)) return undefined
  const { cause } = err
  if (cause instanceof Error && cause.message && cause.message !== err.message) {
    return cause.message
  }
  if (typeof cause === 'string' && cause !== err.message) {
    return cause
  }
  return undefined
}

/** Human-readable reachability error for API/metrics fetch failures. */
export function formatMtxReachabilityError(err: unknown, baseUrl = getApiBaseUrl()): string {
  const target = redactMediaMtxUrl(baseUrl)

  if (err instanceof MediaMtxError) {
    if (err.status === 401 || err.status === 403) {
      return `API auth failed (${err.status}) at ${target} — MEDIAMTX_INTERNAL_USER/PASS may not match mediamtx.yml; apply config from /settings`
    }
    return `${err.message} (${target})`
  }

  const message = err instanceof Error ? err.message : 'Unknown error'
  const cause = getFetchCause(err)
  const detail = cause && !message.includes(cause) ? `${message} (${cause})` : message

  if (
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED') ||
    cause?.includes('ECONNREFUSED') ||
    cause?.includes('ENOTFOUND') ||
    cause?.includes('EHOSTUNREACH')
  ) {
    return `${detail} — MediaMTX unreachable at ${target} (is mtxfoil-mediamtx running on network mtxfoil?)`
  }
  if (message.includes('timeout') || message.includes('ETIMEDOUT') || cause?.includes('ETIMEDOUT')) {
    return `${detail} — MediaMTX not responding at ${target} (check mtxfoil-mediamtx logs; confirm api: yes in mediamtx.yml)`
  }
  return `${detail} (${target})`
}

export type MtxHealthResult = {
  ok: boolean
  latencyMs: number
  error?: string
  /** Redacted MEDIAMTX_API_URL used for the probe */
  target?: string
  /** Underlying network error when fetch fails before HTTP */
  cause?: string
}

export async function mtxHealthCheck(): Promise<MtxHealthResult> {
  const target = getRedactedApiBaseUrl()
  const start = Date.now()
  try {
    await mtxFetch('/v3/paths/list', { signal: AbortSignal.timeout(8_000) })
    return { ok: true, latencyMs: Date.now() - start, target }
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      target,
      cause: getFetchCause(err),
      error: formatMtxReachabilityError(err),
    }
  }
}
