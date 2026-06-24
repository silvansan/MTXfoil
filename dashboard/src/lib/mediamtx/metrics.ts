import { mtxFetch } from './client'

export type ParsedMetric = {
  name: string
  labels: Record<string, string>
  value: number
}

function parsePrometheusLine(line: string): ParsedMetric | null {
  if (!line || line.startsWith('#')) return null
  const spaceIdx = line.lastIndexOf(' ')
  if (spaceIdx === -1) return null

  const value = Number(line.slice(spaceIdx + 1))
  if (Number.isNaN(value)) return null

  const metricPart = line.slice(0, spaceIdx)
  const braceIdx = metricPart.indexOf('{')
  if (braceIdx === -1) {
    return { name: metricPart, labels: {}, value }
  }

  const name = metricPart.slice(0, braceIdx)
  const labelsStr = metricPart.slice(braceIdx + 1, -1)
  const labels: Record<string, string> = {}
  for (const part of labelsStr.split(',')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    const val = part.slice(eq + 1).trim().replace(/^"|"$/g, '')
    labels[key] = val
  }

  return { name, labels, value }
}

export async function fetchMetricsText(): Promise<string> {
  const base = process.env.MEDIAMTX_METRICS_URL || 'http://mediamtx:9998'
  const res = await fetch(`${base}/metrics`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Metrics fetch failed: ${res.status}`)
  return res.text()
}

export async function parseMetrics(): Promise<ParsedMetric[]> {
  const text = await fetchMetricsText()
  return text
    .split('\n')
    .map(parsePrometheusLine)
    .filter((m): m is ParsedMetric => m !== null)
}

export function getPathBitrate(metrics: ParsedMetric[], pathName: string): number | null {
  const received = metrics.find(
    (m) => m.name === 'paths_bytes_received' && m.labels.name === pathName,
  )
  if (!received) return null
  return received.value
}

export function getConnectionCounts(metrics: ParsedMetric[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const m of metrics) {
    if (m.name.endsWith('_conns') || m.name.includes('sessions')) {
      counts[m.name] = (counts[m.name] || 0) + m.value
    }
  }
  return counts
}

export type DashboardMetrics = {
  paths: Array<{ name: string; bytesReceived: number; bytesSent: number }>
  connectionCounts: Record<string, number>
  rawCount: number
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const metrics = await parseMetrics()
  const paths = new Map<string, { bytesReceived: number; bytesSent: number }>()

  for (const m of metrics) {
    if (m.name === 'paths_bytes_received' && m.labels.name) {
      const existing = paths.get(m.labels.name) || { bytesReceived: 0, bytesSent: 0 }
      existing.bytesReceived = m.value
      paths.set(m.labels.name, existing)
    }
    if (m.name === 'paths_bytes_sent' && m.labels.name) {
      const existing = paths.get(m.labels.name) || { bytesReceived: 0, bytesSent: 0 }
      existing.bytesSent = m.value
      paths.set(m.labels.name, existing)
    }
  }

  return {
    paths: Array.from(paths.entries()).map(([name, v]) => ({ name, ...v })),
    connectionCounts: getConnectionCounts(metrics),
    rawCount: metrics.length,
  }
}

export async function listSrtConnections(): Promise<unknown> {
  return mtxFetch('/v3/srtconns/list')
}

export async function listRtmpConnections(): Promise<unknown> {
  return mtxFetch('/v3/rtmpconns/list')
}

export async function listWebRtcSessions(): Promise<unknown> {
  return mtxFetch('/v3/webrtcsessions/list')
}
