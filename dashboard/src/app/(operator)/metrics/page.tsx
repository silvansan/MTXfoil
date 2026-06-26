import { getDashboardMetrics, listRtmpConnections, listSrtConnections, listWebRtcSessions } from '@/lib/mediamtx/metrics'
import { MediaMtxLogs } from '@/components/operator/mediamtx-logs'
import { MediaMtxServerBadge } from '@/components/operator/mediamtx-server-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function MetricsPage() {
  let dashboard = null
  let srt: unknown = null
  let rtmp: unknown = null
  let webrtc: unknown = null

  try {
    ;[dashboard, srt, rtmp, webrtc] = await Promise.all([
      getDashboardMetrics(),
      listSrtConnections(),
      listRtmpConnections(),
      listWebRtcSessions(),
    ])
  } catch {
    // MediaMTX may be offline
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Metrics & Sessions</h1>
        <p className="mt-2 text-zinc-400">Prometheus metrics and connection tables (internal scrape).</p>
        <div className="mt-3">
          <MediaMtxServerBadge />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Path throughput</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm font-mono">
            {dashboard?.paths.map((p) => (
              <div key={p.name} className="flex justify-between gap-4">
                <span>{p.name}</span>
                <span className="text-zinc-500">↓{p.bytesReceived} ↑{p.bytesSent}</span>
              </div>
            )) || <p className="text-zinc-500">No metrics available</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection counts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm font-mono">
            {dashboard &&
              Object.entries(dashboard.connectionCounts).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ['SRT connections', srt],
          ['RTMP connections', rtmp],
          ['WebRTC sessions', webrtc],
        ].map(([title, data]) => (
          <Card key={title as string}>
            <CardHeader>
              <CardTitle>{title as string}</CardTitle>
            </CardHeader>
            <CardContent>
              <pre
                aria-label={`${title as string} data`}
                className="max-h-64 overflow-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-300"
              >
                {JSON.stringify(data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>

      <MediaMtxLogs />
    </div>
  )
}
