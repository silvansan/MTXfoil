'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { StreamCard } from '@/components/operator/stream-card'
import { MediaMtxConnectionCard } from '@/components/operator/mediamtx-connection-card'
import { SystemMetricsPanel, type HostMetricsData } from '@/components/operator/system-metrics-panel'
import { Card, CardContent } from '@/components/ui/card'
import type { StreamStatus } from '@/lib/mediamtx/paths'
import type { MetricsData } from '@/components/operator/metrics-summary'

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
  host?: HostMetricsData | null
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
    <div className="space-y-4">
      {data ? (
        <MediaMtxConnectionCard health={data.health} fetchError={error} />
      ) : (
        <MediaMtxConnectionCard
          health={{ ok: false, latencyMs: 0, error: 'Checking connection…' }}
          fetchError={error}
        />
      )}

      <SystemMetricsPanel
        host={data?.host ?? null}
        metrics={data?.metrics ?? null}
        mtxRxRate={rates.rx}
        mtxTxRate={rates.tx}
      />

      <div className="space-y-2">
        {data?.streams.map((stream) => (
          <StreamCard key={stream.id} stream={stream} status={stream.status} urls={stream.urls} />
        ))}
      </div>

      {data?.streams.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted">
            No streams configured yet. <Link href="/streams/new" className="text-accent-link underline">Create a stream</Link> or use <Link href="/admin" className="text-accent-link underline">Admin</Link>.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
