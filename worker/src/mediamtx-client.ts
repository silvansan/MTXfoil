const MEDIAMTX_API_URL = process.env.MEDIAMTX_API_URL || 'http://mediamtx:9997'

export function getMtxAuthHeaders(): Record<string, string> {
  const user = process.env.MEDIAMTX_INTERNAL_USER || 'mtxfoil'
  const pass = process.env.MEDIAMTX_INTERNAL_PASS || 'mtxfoil'
  const token = Buffer.from(`${user}:${pass}`).toString('base64')
  return { Authorization: `Basic ${token}`, Accept: 'application/json' }
}

export async function mtxFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${MEDIAMTX_API_URL}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      ...getMtxAuthHeaders(),
      ...init?.headers,
    },
    signal: init?.signal ?? AbortSignal.timeout(8_000),
  })

  if (!res.ok) {
    throw new Error(`MediaMTX ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as T
}
