'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type MetricsData = {
  paths: Array<{ name: string; bytesReceived: number; bytesSent: number }>
  connectionCounts: Record<string, number>
  rawCount: number
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatRate(bytesPerSec: number | null): string {
  if (bytesPerSec == null) return '—'
  const bits = bytesPerSec * 8
  if (bits < 1000) return `${bits.toFixed(0)} bps`
  if (bits < 1_000_000) return `${(bits / 1000).toFixed(1)} kbps`
  return `${(bits / 1_000_000).toFixed(2)} Mbps`
}

function labelFor(metricName: string): string {
  return metricName
    .replace(/_/g, ' ')
    .replace(/\bconns\b/, 'connections')
    .replace(/\b(\w)/g, (m) => m.toUpperCase())
}

export function MetricsSummary({
  metrics,
  rxRate,
  txRate,
}: {
  metrics: MetricsData
  rxRate: number | null
  txRate: number | null
}) {
  const totalReceived = metrics.paths.reduce((sum, p) => sum + p.bytesReceived, 0)
  const totalSent = metrics.paths.reduce((sum, p) => sum + p.bytesSent, 0)
  const connEntries = Object.entries(metrics.connectionCounts).filter(([, v]) => v > 0)
  const totalConns = connEntries.reduce((sum, [, v]) => sum + v, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Live Metrics</span>
          <span className="text-sm font-normal text-zinc-500">{metrics.paths.length} active paths</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ingress rate" value={formatRate(rxRate)} />
          <Stat label="Egress rate" value={formatRate(txRate)} />
          <Stat label="Total received" value={formatBytes(totalReceived)} />
          <Stat label="Total sent" value={formatBytes(totalSent)} />
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Connections {totalConns > 0 ? `(${totalConns})` : ''}
          </p>
          {connEntries.length === 0 ? (
            <p className="mt-1 text-zinc-500">No active connections.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {connEntries.map(([name, count]) => (
                <span
                  key={name}
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {labelFor(name)}: <span className="font-semibold text-emerald-300">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-950 p-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-base text-zinc-100">{value}</p>
    </div>
  )
}
