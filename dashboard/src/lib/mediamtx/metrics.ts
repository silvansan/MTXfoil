import { MediaMtxError, mtxFetch } from './client'
import type { components } from './openapi-types'

export type SRTConnList = components['schemas']['SRTConnList']
export type RTMPConnList = components['schemas']['RTMPConnList']
export type WebRTCSessionList = components['schemas']['WebRTCSessionList']

export function formatMetricsFetchError(err: unknown): string {
  if (err instanceof MediaMtxError) {
    if (err.status === 401 || err.status === 403) {
      return `API auth failed (${err.status}) — MEDIAMTX_INTERNAL_USER/PASS may not match mediamtx.yml; apply config from /settings`
    }
    return err.message
  }

  const message = err instanceof Error ? err.message : 'Request failed'
  if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
    return 'MediaMTX unreachable at MEDIAMTX_API_URL (is mtxfoil-mediamtx running?)'
  }
  return message
}

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
  return mtxFetch('/metrics', { parseJson: false })
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

export async function listSrtConnections(): Promise<SRTConnList> {
  return mtxFetch<SRTConnList>('/v3/srtconns/list')
}

export async function listRtmpConnections(): Promise<RTMPConnList> {
  return mtxFetch<RTMPConnList>('/v3/rtmpconns/list')
}

export async function listWebRtcSessions(): Promise<WebRTCSessionList> {
  return mtxFetch<WebRTCSessionList>('/v3/webrtcsessions/list')
}
