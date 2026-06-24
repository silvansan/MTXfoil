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

export function getApiBaseUrl(): string {
  return process.env.MEDIAMTX_API_URL || 'http://mediamtx:9997'
}

export function getMetricsBaseUrl(): string {
  return process.env.MEDIAMTX_METRICS_URL || 'http://mediamtx:9998'
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
