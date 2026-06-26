'use client'

import { useEffect, useMemo, useState } from 'react'

import type { MetricsData } from '@/components/operator/metrics-summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { MetricsHistoryPoint, MetricsHistoryRange } from '@/lib/metrics-history'

export type HostMetricsData = {
  cpuPercent: number | null
  ramUsedBytes: number
  ramTotalBytes: number
  diskUsedBytes: number | null
  diskTotalBytes: number | null
  diskPath: string | null
  netRxBytes: number | null
  netTxBytes: number | null
  gpu: { available: false } | { available: true; name: string; utilizationPercent: number | null }
  scope: 'container' | 'host'
}

const RANGES: { value: MetricsHistoryRange; label: string }[] = [
  { value: 'hour', label: '1h' },
  { value: 'day', label: '24h' },
  { value: 'week', label: '7d' },
  { value: 'month', label: '30d' },
]

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

function formatPercent(value: number | null): string {
  if (value == null) return '—'
  return `${value.toFixed(1)}%`
}

function labelFor(metricName: string): string {
  return metricName
    .replace(/_/g, ' ')
    .replace(/\bconns\b/, 'connections')
    .replace(/\b(\w)/g, (m) => m.toUpperCase())
}

export function SystemMetricsPanel({
  host,
  metrics,
  mtxRxRate,
  mtxTxRate,
}: {
  host: HostMetricsData | null
  metrics: MetricsData | null
  mtxRxRate: number | null
  mtxTxRate: number | null
}) {
  const [range, setRange] = useState<MetricsHistoryRange>('hour')
  const [points, setPoints] = useState<MetricsHistoryPoint[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await fetch(`/api/metrics/history?range=${range}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`History ${res.status}`)
        const json = (await res.json()) as { points: MetricsHistoryPoint[] }
        if (!active) return
        setPoints(json.points ?? [])
        setHistoryError(null)
      } catch (err) {
        if (active) {
          setHistoryError(err instanceof Error ? err.message : 'Failed to load history')
          setPoints([])
        }
      }
    }
    load()
    const timer = setInterval(load, 30_000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [range])

  const ramPercent =
    host && host.ramTotalBytes > 0 ? (host.ramUsedBytes / host.ramTotalBytes) * 100 : null
  const diskPercent =
    host?.diskTotalBytes && host.diskUsedBytes != null
      ? (host.diskUsedBytes / host.diskTotalBytes) * 100
      : null

  const connEntries = useMemo(
    () => Object.entries(metrics?.connectionCounts ?? {}).filter(([, v]) => v > 0),
    [metrics],
  )
  const totalConns = connEntries.reduce((sum, [, v]) => sum + v, 0)

  const latestPoint = points.length > 0 ? points[points.length - 1]! : null

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>System Metrics</CardTitle>
          <p className="mt-1 text-xs text-muted">
            {host?.scope === 'container'
              ? 'Container-level stats (not full host). GPU requires nvidia-smi.'
              : 'Collecting system metrics…'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              type="button"
              size="sm"
              variant={range === r.value ? 'default' : 'outline'}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="CPU" value={formatPercent(host?.cpuPercent ?? latestPoint?.cpuPercent ?? null)} />
          <Stat
            label="RAM"
            value={
              host
                ? `${formatPercent(ramPercent)} · ${formatBytes(host.ramUsedBytes)}`
                : formatPercent(latestPoint?.ramPercent ?? null)
            }
          />
          <Stat
            label="Disk"
            value={
              host?.diskTotalBytes
                ? `${formatPercent(diskPercent)} · ${formatBytes(host.diskUsedBytes ?? 0)}`
                : '—'
            }
            hint={host?.diskPath ?? undefined}
          />
          <Stat
            label="GPU"
            value={
              host?.gpu.available
                ? `${host.gpu.name}${host.gpu.utilizationPercent != null ? ` · ${formatPercent(host.gpu.utilizationPercent)}` : ''}`
                : 'Unavailable'
            }
          />
          <Stat label="Media ingress" value={formatRate(mtxRxRate ?? latestPoint?.mtxRxRate ?? null)} />
          <Stat label="Media egress" value={formatRate(mtxTxRate ?? latestPoint?.mtxTxRate ?? null)} />
        </div>

        {historyError && (
          <p className="text-xs text-amber-600 dark:text-amber-400" role="status">
            History unavailable: {historyError}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <MetricChart title="CPU %" points={points} pick={(p) => p.cpuPercent} suffix="%" maxY={100} />
          <MetricChart title="RAM %" points={points} pick={(p) => p.ramPercent} suffix="%" maxY={100} />
          <MetricChart
            title="Media bandwidth (ingress)"
            points={points}
            pick={(p) => p.mtxRxRate}
            formatValue={formatRate}
          />
          <MetricChart
            title="Media bandwidth (egress)"
            points={points}
            pick={(p) => p.mtxTxRate}
            formatValue={formatRate}
          />
        </div>

        {metrics && (
          <div>
            <p className="text-xs uppercase tracking-wide text-subtle">
              MediaMTX connections {totalConns > 0 ? `(${totalConns})` : ''}
            </p>
            {connEntries.length === 0 ? (
              <p className="mt-1 text-subtle">No active connections.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {connEntries.map(([name, count]) => (
                  <span
                    key={name}
                    className="chip"
                  >
                    {labelFor(name)}: <span className="font-semibold text-accent">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat-box border border-default">
      <p className="text-[10px] uppercase tracking-wide text-subtle">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-value">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[10px] text-subtle">{hint}</p>}
    </div>
  )
}

function MetricChart({
  title,
  points,
  pick,
  suffix,
  maxY,
  formatValue,
}: {
  title: string
  points: MetricsHistoryPoint[]
  pick: (p: MetricsHistoryPoint) => number | null
  suffix?: string
  maxY?: number
  formatValue?: (v: number | null) => string
}) {
  const values = points.map(pick).filter((v): v is number => v != null)
  const latest = values.length > 0 ? values[values.length - 1]! : null
  const display = formatValue ? formatValue(latest) : latest != null ? `${latest.toFixed(1)}${suffix ?? ''}` : '—'

  return (
    <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">{title}</p>
        <p className="font-mono text-xs text-value">{display}</p>
      </div>
      <Sparkline values={values} maxY={maxY} />
      {values.length === 0 && (
        <p className="mt-1 text-center text-[10px] text-subtle">No samples yet — leave dashboard open to collect.</p>
      )}
    </div>
  )
}

function Sparkline({ values, maxY }: { values: number[]; maxY?: number }) {
  if (values.length < 2) {
    return <div className="h-16 rounded bg-surface-muted" />
  }

  const width = 320
  const height = 64
  const pad = 4
  const max = maxY ?? Math.max(...values, 1)
  const min = maxY != null ? 0 : Math.min(...values, 0)
  const span = max - min || 1

  const coords = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (v - min) / span) * (height - pad * 2)
    return `${x},${y}`
  })

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full text-[var(--mtx-accent-primary)]" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords.join(' ')}
      />
    </svg>
  )
}
