import type { HostMetrics } from '@/lib/host-metrics'
import type { DashboardMetrics } from '@/lib/mediamtx/metrics'
import { ensureRedisReady, getRedisClient } from '@/lib/redis'

const REDIS_KEY = 'mtxfoil:metrics:samples'
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export type MetricsSample = {
  t: number
  cpuPercent: number | null
  ramUsedBytes: number
  ramTotalBytes: number
  diskUsedBytes: number | null
  diskTotalBytes: number | null
  netRxBytes: number | null
  netTxBytes: number | null
  gpuAvailable: boolean
  gpuUtilPercent: number | null
  mtxRxBytes: number
  mtxTxBytes: number
}

export type MetricsHistoryRange = 'hour' | 'day' | 'week' | 'month'

export type MetricsHistoryPoint = {
  t: number
  cpuPercent: number | null
  ramPercent: number | null
  diskPercent: number | null
  netRxRate: number | null
  netTxRate: number | null
  mtxRxRate: number | null
  mtxTxRate: number | null
  gpuUtilPercent: number | null
}

const RANGE_MS: Record<MetricsHistoryRange, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
}

const DOWNSAMPLE: Record<MetricsHistoryRange, number> = {
  hour: 1,
  day: 6,
  week: 30,
  month: 180,
}

function mtxTotals(metrics: DashboardMetrics | null): { rx: number; tx: number } {
  if (!metrics) return { rx: 0, tx: 0 }
  return metrics.paths.reduce(
    (acc, p) => ({ rx: acc.rx + p.bytesReceived, tx: acc.tx + p.bytesSent }),
    { rx: 0, tx: 0 },
  )
}

export function buildMetricsSample(
  host: HostMetrics,
  metrics: DashboardMetrics | null,
): MetricsSample {
  const mtx = mtxTotals(metrics)
  return {
    t: Date.now(),
    cpuPercent: host.cpuPercent,
    ramUsedBytes: host.ramUsedBytes,
    ramTotalBytes: host.ramTotalBytes,
    diskUsedBytes: host.diskUsedBytes,
    diskTotalBytes: host.diskTotalBytes,
    netRxBytes: host.netRxBytes,
    netTxBytes: host.netTxBytes,
    gpuAvailable: host.gpu.available,
    gpuUtilPercent: host.gpu.available ? host.gpu.utilizationPercent : null,
    mtxRxBytes: mtx.rx,
    mtxTxBytes: mtx.tx,
  }
}

export async function recordMetricsSample(sample: MetricsSample): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  if (!(await ensureRedisReady(redis))) return

  try {
    const member = JSON.stringify(sample)
    await redis.zadd(REDIS_KEY, sample.t, member)
    const cutoff = Date.now() - RETENTION_MS
    await redis.zremrangebyscore(REDIS_KEY, 0, cutoff)
  } catch {
    // History is best-effort when Redis is unavailable.
  }
}

function parseSamples(raw: string[]): MetricsSample[] {
  const out: MetricsSample[] = []
  for (const item of raw) {
    try {
      const parsed = JSON.parse(item) as MetricsSample
      if (typeof parsed.t === 'number') out.push(parsed)
    } catch {
      // skip corrupt entries
    }
  }
  return out.sort((a, b) => a.t - b.t)
}

function rate(curr: number | null, prev: number | null, dtSec: number): number | null {
  if (curr == null || prev == null || dtSec <= 0) return null
  return Math.max(0, (curr - prev) / dtSec)
}

function toHistoryPoints(samples: MetricsSample[]): MetricsHistoryPoint[] {
  const points: MetricsHistoryPoint[] = []
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!
    const prev = i > 0 ? samples[i - 1]! : null
    const dtSec = prev ? (s.t - prev.t) / 1000 : 0
    points.push({
      t: s.t,
      cpuPercent: s.cpuPercent,
      ramPercent: s.ramTotalBytes > 0 ? (s.ramUsedBytes / s.ramTotalBytes) * 100 : null,
      diskPercent:
        s.diskTotalBytes && s.diskUsedBytes != null
          ? (s.diskUsedBytes / s.diskTotalBytes) * 100
          : null,
      netRxRate: rate(s.netRxBytes, prev?.netRxBytes ?? null, dtSec),
      netTxRate: rate(s.netTxBytes, prev?.netTxBytes ?? null, dtSec),
      mtxRxRate: rate(s.mtxRxBytes, prev?.mtxRxBytes ?? null, dtSec),
      mtxTxRate: rate(s.mtxTxBytes, prev?.mtxTxBytes ?? null, dtSec),
      gpuUtilPercent: s.gpuAvailable ? s.gpuUtilPercent : null,
    })
  }
  return points
}

export async function getMetricsHistory(
  range: MetricsHistoryRange,
): Promise<{ range: MetricsHistoryRange; points: MetricsHistoryPoint[] }> {
  const redis = getRedisClient()
  const since = Date.now() - RANGE_MS[range]
  const step = DOWNSAMPLE[range]

  if (!redis || !(await ensureRedisReady(redis))) {
    return { range, points: [] }
  }

  try {
    const raw = await redis.zrangebyscore(REDIS_KEY, since, '+inf')
    const all = parseSamples(raw)
    const samples = all.filter((_, idx) => idx % step === 0 || idx === all.length - 1)
    return { range, points: toHistoryPoints(samples) }
  } catch {
    return { range, points: [] }
  }
}
