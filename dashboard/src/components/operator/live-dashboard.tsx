'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { MetricsSummary, type MetricsData } from '@/components/operator/metrics-summary'
import { StreamCard } from '@/components/operator/stream-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { StreamStatus } from '@/lib/mediamtx/paths'

type DashboardData = {
  health: { ok: boolean; latencyMs: number; error?: string }
  streams: Array<{
    id: string
    name: string
    slug: string
    recordingEnabled?: boolean | null
    urls: { srtPublish: string; hlsPlayback: string }
    status?: StreamStatus | null
  }>
  metrics?: MetricsData | null
}

type Rates = { rx: number | null; tx: number | null }

export function LiveDashboard({ intervalSec = 5 }: { intervalSec?: number }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [rates, setRates] = useState<Rates>({ rx: null, tx: null })
  const [error, setError] = useState<string | null>(null)
  const prevSample = useRef<{ rx: number; tx: number; t: number } | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const res = await fetch('/api/status', { cache: 'no-store' })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const json = (await res.json()) as DashboardData
        if (!active) return

        // Derive a rough throughput rate from deltas of the cumulative byte
        // counters between successive polls.
        if (json.metrics) {
          const rx = json.metrics.paths.reduce((s, p) => s + p.bytesReceived, 0)
          const tx = json.metrics.paths.reduce((s, p) => s + p.bytesSent, 0)
          const now = Date.now()
          const prev = prevSample.current
          if (prev && now > prev.t) {
            const dt = (now - prev.t) / 1000
            setRates({
              rx: Math.max(0, (rx - prev.rx) / dt),
              tx: Math.max(0, (tx - prev.tx) / dt),
            })
          }
          prevSample.current = { rx, tx, t: now }
        }

        setData(json)
        setError(null)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load status')
      }
    }

    load()
    const timer = setInterval(load, intervalSec * 1000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [intervalSec])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            MediaMTX Connection
            {data?.health.ok ? <Badge variant="success">Connected</Badge> : <Badge variant="danger">Disconnected</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-400">
          {data ? (
            <p>Latency: {data.health.latencyMs}ms {data.health.error ? `— ${data.health.error}` : ''}</p>
          ) : (
            <p>Checking connection…</p>
          )}
          {error && <p className="text-red-400">{error}</p>}
        </CardContent>
      </Card>

      {data?.metrics && <MetricsSummary metrics={data.metrics} rxRate={rates.rx} txRate={rates.tx} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.streams.map((stream) => (
          <StreamCard key={stream.id} stream={stream} status={stream.status} urls={stream.urls} />
        ))}
      </div>

      {data?.streams.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-zinc-400">
            No streams configured yet. <Link href="/streams/new" className="text-emerald-400 underline">Create a stream</Link> or use <Link href="/admin" className="text-emerald-400 underline">Admin</Link>.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
