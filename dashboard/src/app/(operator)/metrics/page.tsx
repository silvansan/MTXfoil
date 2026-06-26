import Link from 'next/link'

import { ConnectionSessionsCard, type ConnectionSessionRow } from '@/components/operator/connection-sessions-card'
import { MediaMtxConnectionCard } from '@/components/operator/mediamtx-connection-card'
import { MediaMtxLogs } from '@/components/operator/mediamtx-logs'
import { MediaMtxServerBadge } from '@/components/operator/mediamtx-server-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mtxHealthCheck } from '@/lib/mediamtx/client'
import {
  formatMetricsFetchError,
  getDashboardMetrics,
  listRtmpConnections,
  listSrtConnections,
  listWebRtcSessions,
  type DashboardMetrics,
  type RTMPConnList,
  type SRTConnList,
  type WebRTCSessionList,
} from '@/lib/mediamtx/metrics'

function toSessionRows(
  items: Array<{ id?: string; remoteAddr?: string; path?: string; state?: string }> | undefined,
): ConnectionSessionRow[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    remoteAddr: item.remoteAddr,
    path: item.path,
    state: item.state,
  }))
}

export default async function MetricsPage() {
  const health = await mtxHealthCheck()

  let dashboard: DashboardMetrics | null = null
  let dashboardError: string | null = null
  let srt: SRTConnList | null = null
  let srtError: string | null = null
  let rtmp: RTMPConnList | null = null
  let rtmpError: string | null = null
  let webrtc: WebRTCSessionList | null = null
  let webrtcError: string | null = null

  if (health.ok) {
    try {
      dashboard = await getDashboardMetrics()
    } catch (err) {
      dashboardError = formatMetricsFetchError(err)
    }

    try {
      srt = await listSrtConnections()
    } catch (err) {
      srtError = formatMetricsFetchError(err)
    }

    try {
      rtmp = await listRtmpConnections()
    } catch (err) {
      rtmpError = formatMetricsFetchError(err)
    }

    try {
      webrtc = await listWebRtcSessions()
    } catch (err) {
      webrtcError = formatMetricsFetchError(err)
    }
  }

  const offlineHint =
    'Metrics and session tables require a live MediaMTX connection. Ensure mtxfoil-mediamtx is running and credentials match /settings.'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Metrics & Sessions</h1>
        <p className="mt-2 text-muted">Prometheus metrics and connection tables (internal scrape).</p>
        <div className="mt-3">
          <MediaMtxServerBadge />
        </div>
      </div>

      <MediaMtxConnectionCard health={health} offlineHint={health.ok ? undefined : offlineHint} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Path throughput</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm font-mono">
            {!health.ok ? (
              <p className="text-muted">Unavailable — MediaMTX not connected.</p>
            ) : dashboardError ? (
              <p className="text-red-600 dark:text-red-400" role="alert">
                {dashboardError}
              </p>
            ) : dashboard?.paths.length ? (
              dashboard.paths.map((p) => (
                <Link
                  key={p.name}
                  href={`/streams/${p.name}`}
                  className="flex justify-between gap-4 rounded-md px-1 py-0.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  <span>{p.name}</span>
                  <span className="text-zinc-500">
                    ↓{p.bytesReceived} ↑{p.bytesSent}
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-muted">No path metrics yet — connect a publisher to see throughput.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection counts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm font-mono">
            {!health.ok ? (
              <p className="text-muted">Unavailable — MediaMTX not connected.</p>
            ) : dashboardError ? (
              <p className="text-red-600 dark:text-red-400" role="alert">
                {dashboardError}
              </p>
            ) : dashboard && Object.keys(dashboard.connectionCounts).length > 0 ? (
              Object.entries(dashboard.connectionCounts).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span>{v}</span>
                </div>
              ))
            ) : (
              <p className="text-muted">No connection metrics available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ConnectionSessionsCard
          title="SRT connections"
          rows={toSessionRows(srt?.items)}
          error={srtError}
          unavailable={!health.ok}
        />
        <ConnectionSessionsCard
          title="RTMP connections"
          rows={toSessionRows(rtmp?.items)}
          error={rtmpError}
          unavailable={!health.ok}
        />
        <ConnectionSessionsCard
          title="WebRTC sessions"
          rows={toSessionRows(webrtc?.items)}
          error={webrtcError}
          unavailable={!health.ok}
        />
      </div>

      <MediaMtxLogs />
    </div>
  )
}
