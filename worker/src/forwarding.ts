import { spawn, type ChildProcess } from 'node:child_process'

import type { Job } from 'bull'
import type Queue from 'bull'

import { mtxFetchJson } from './mediamtx-client.js'

export type ForwardingJobData = {
  jobId: string
  streamSlug: string
  type: string
  destinationUrl: string
  restartOnFailure: boolean
}

type ManagedJob = {
  data: ForwardingJobData
  child: ChildProcess | null
  stopRequested: boolean
  restartCount: number
  restartTimer: ReturnType<typeof setTimeout> | null
  startedAt: number
  lastError?: string
}

const managed = new Map<string, ManagedJob>()

// Backoff bounds for restart-on-failure (avoid tight crash loops).
const RESTART_BASE_MS = 2000
const RESTART_MAX_MS = 30000
// A process that survives this long is considered healthy; reset its backoff.
const STABLE_RUN_MS = 60000

const MEDIAMTX_HOST = process.env.MEDIAMTX_HOST || 'mediamtx'
const LIVE_RECONCILE_MS = Number(process.env.FORWARDING_LIVE_RECONCILE_MS || 30000)

/** RTMP push jobs are handled by MediaMTX runOnReady in path config, not the worker. */
function isWorkerManagedType(type: string): boolean {
  return type !== 'rtmp-push'
}
const RTMP_PORT = process.env.RTMP_PORT || '1935'
const RTSP_PORT = process.env.RTSP_PORT || '8554'
const SRT_PORT = process.env.SRT_PORT || '8890'
const MTX_USER = process.env.MEDIAMTX_INTERNAL_USER || 'mtxfoil'
const MTX_PASS = process.env.MEDIAMTX_INTERNAL_PASS || 'mtxfoil'

function localRtmpReadUrl(slug: string): string {
  const q = `?user=${encodeURIComponent(MTX_USER)}&pass=${encodeURIComponent(MTX_PASS)}`
  return `rtmp://${MEDIAMTX_HOST}:${RTMP_PORT}/${slug}${q}`
}

function localSrtReadUrl(slug: string): string {
  const streamid = `read:${slug}:${MTX_USER}:${MTX_PASS}`
  return `srt://${MEDIAMTX_HOST}:${SRT_PORT}?streamid=${encodeURIComponent(streamid)}`
}

function localRtspPublishUrl(slug: string): string {
  return `rtsp://${encodeURIComponent(MTX_USER)}:${encodeURIComponent(MTX_PASS)}@${MEDIAMTX_HOST}:${RTSP_PORT}/${slug}`
}

/**
 * Build FFmpeg args per job type.
 * - rtmp-push: read local MediaMTX path via RTMP, push to remote RTMP (flv, copy).
 * - srt-push:  read local MediaMTX path via SRT, push to remote SRT (mpegts, copy).
 * - hls-pull:  pull a remote source (destinationUrl) and publish into the local
 *              MediaMTX path via RTSP (copy). `destinationUrl` is the remote source here.
 */
function buildFfmpegArgs(data: ForwardingJobData): string[] {
  const common = ['-nostdin', '-hide_banner', '-nostats', '-loglevel', 'warning']

  if (data.type === 'rtmp-push') {
    return [
      ...common,
      '-rw_timeout',
      '5000000',
      '-i',
      localRtmpReadUrl(data.streamSlug),
      '-c',
      'copy',
      '-f',
      'flv',
      data.destinationUrl,
    ]
  }

  if (data.type === 'srt-push') {
    return [
      ...common,
      '-i',
      localSrtReadUrl(data.streamSlug),
      '-c',
      'copy',
      '-pes_payload_size',
      '0',
      '-f',
      'mpegts',
      data.destinationUrl,
    ]
  }

  if (data.type === 'hls-pull') {
    return [
      ...common,
      '-re',
      '-i',
      data.destinationUrl,
      '-c',
      'copy',
      '-rtsp_transport',
      'tcp',
      '-f',
      'rtsp',
      localRtspPublishUrl(data.streamSlug),
    ]
  }

  // Fallback: generic MPEG-TS push from the local path.
  return [
    ...common,
    '-i',
    localSrtReadUrl(data.streamSlug),
    '-c',
    'copy',
    '-pes_payload_size',
    '0',
    '-f',
    'mpegts',
    data.destinationUrl,
  ]
}

function spawnProcess(entry: ManagedJob): void {
  const { data } = entry
  const args = buildFfmpegArgs(data)
  const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })

  entry.child = child
  entry.startedAt = Date.now()

  child.stderr?.on('data', (chunk: Buffer) => {
    const line = chunk.toString().trim()
    if (line) {
      entry.lastError = line
      console.log(`[ffmpeg:${data.jobId}] ${line}`)
    }
  })

  child.on('error', (err) => {
    entry.lastError = err.message
    console.error(`[worker] ffmpeg spawn error for job ${data.jobId}:`, err.message)
  })

  child.on('exit', (code, signal) => {
    entry.child = null
    const ranMs = Date.now() - entry.startedAt
    console.warn(
      `[worker] ffmpeg for job ${data.jobId} exited (code=${code} signal=${signal} ran=${ranMs}ms)`,
    )

    if (entry.stopRequested) {
      managed.delete(data.jobId)
      return
    }

    if (data.restartOnFailure) {
      if (ranMs >= STABLE_RUN_MS) entry.restartCount = 0
      scheduleRestart(entry)
    } else {
      managed.delete(data.jobId)
      void updateJobStatus(data.jobId, 'error')
    }
  })
}

function scheduleRestart(entry: ManagedJob): void {
  const delay = Math.min(RESTART_BASE_MS * 2 ** entry.restartCount, RESTART_MAX_MS)
  entry.restartCount += 1
  console.warn(
    `[worker] restarting job ${entry.data.jobId} in ${delay}ms (attempt ${entry.restartCount})`,
  )
  void updateJobStatus(entry.data.jobId, 'error')

  entry.restartTimer = setTimeout(() => {
    entry.restartTimer = null
    if (entry.stopRequested) {
      managed.delete(entry.data.jobId)
      return
    }
    spawnProcess(entry)
    void updateJobStatus(entry.data.jobId, 'running')
  }, delay)
}

export function startForward(data: ForwardingJobData): void {
  const existing = managed.get(data.jobId)
  if (existing) {
    // Refresh config; if it's already running leave the process as-is.
    existing.data = data
    existing.stopRequested = false
    if (existing.child || existing.restartTimer) return
    spawnProcess(existing)
    return
  }

  const entry: ManagedJob = {
    data,
    child: null,
    stopRequested: false,
    restartCount: 0,
    restartTimer: null,
    startedAt: 0,
  }
  managed.set(data.jobId, entry)
  spawnProcess(entry)
}

export function stopForward(jobId: string): void {
  const entry = managed.get(jobId)
  if (!entry) return
  entry.stopRequested = true
  if (entry.restartTimer) {
    clearTimeout(entry.restartTimer)
    entry.restartTimer = null
  }
  if (entry.child && !entry.child.killed) {
    entry.child.kill('SIGTERM')
  } else {
    managed.delete(jobId)
  }
}

export type ActiveJobInfo = {
  jobId: string
  type: string
  streamSlug: string
  running: boolean
  restarting: boolean
  restartCount: number
  lastError?: string
}

export function getActiveJobs(): ActiveJobInfo[] {
  return Array.from(managed.values()).map((entry) => ({
    jobId: entry.data.jobId,
    type: entry.data.type,
    streamSlug: entry.data.streamSlug,
    running: Boolean(entry.child) && !entry.child?.killed,
    restarting: Boolean(entry.restartTimer),
    restartCount: entry.restartCount,
    lastError: entry.lastError,
  }))
}

export async function processStartJob(job: Job<{ jobId: string }>): Promise<{ success: boolean }> {
  const { jobId } = job.data
  const row = await fetchJobFromDb(jobId)
  if (!row) throw new Error(`Forwarding job ${jobId} not found`)

  if (!isWorkerManagedType(row.type)) {
    console.log(`[worker] skipping job ${jobId} (${row.type}) — handled by MediaMTX runOnReady`)
    return { success: true }
  }

  if (!row.enabled) {
    // Job was disabled between enqueue and processing; ensure it is stopped.
    stopForward(jobId)
    await updateJobStatus(jobId, 'stopped')
    return { success: true }
  }

  startForward({
    jobId,
    streamSlug: row.stream_slug,
    type: row.type,
    destinationUrl: row.destination_url,
    restartOnFailure: row.restart_on_failure ?? true,
  })

  await updateJobStatus(jobId, 'running')
  return { success: true }
}

export async function processStopJob(job: Job<{ jobId: string }>): Promise<{ success: boolean }> {
  stopForward(job.data.jobId)
  await updateJobStatus(job.data.jobId, 'stopped')
  return { success: true }
}

type DbJob = {
  stream_slug: string
  type: string
  destination_url: string
  enabled: boolean
  restart_on_failure: boolean
}

async function fetchJobFromDb(jobId: string): Promise<DbJob | null> {
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const res = await pool.query(
      `SELECT fj.type, fj.destination_url, fj.enabled, fj.restart_on_failure, s.slug AS stream_slug
       FROM forwarding_jobs fj
       LEFT JOIN streams s ON s.id = fj.stream_id
       WHERE fj.id = $1`,
      [jobId],
    )
    return (res.rows[0] as DbJob | undefined) || null
  } finally {
    await pool.end()
  }
}

async function fetchLiveStreamSlugs(): Promise<Set<string>> {
  try {
    const data = await mtxFetchJson<{ items?: Array<{ name?: string; ready?: boolean }> }>(
      '/v3/paths/list',
    )
    const live = new Set<string>()
    for (const item of data.items || []) {
      if (item.ready && item.name) live.add(item.name)
    }
    return live
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const hint =
      message.includes('401') || message.includes('403')
        ? ' — check MEDIAMTX_INTERNAL_USER/PASS and apply config from /settings'
        : message.includes('fetch failed') || message.includes('timeout')
          ? ' — is mtxfoil-mediamtx running on the Docker network?'
          : ''
    console.error(`[worker] failed to list MediaMTX paths: ${message}${hint}`)
    return new Set()
  }
}

type AutoStartJobRow = {
  id: string
  stream_slug: string
  type: string
}

async function fetchAutoStartJobs(): Promise<AutoStartJobRow[]> {
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const res = await pool.query<AutoStartJobRow>(
      `SELECT fj.id, fj.type, s.slug AS stream_slug
       FROM forwarding_jobs fj
       LEFT JOIN streams s ON s.id = fj.stream_id
       WHERE fj.enabled = true
         AND fj.auto_start = true
         AND fj.type <> 'rtmp-push'
         AND s.slug IS NOT NULL`,
    )
    return res.rows
  } finally {
    await pool.end()
  }
}

function isJobActive(jobId: string): boolean {
  const entry = managed.get(jobId)
  if (!entry) return false
  return Boolean(entry.child) || Boolean(entry.restartTimer)
}

export async function reconcileLiveStreams(queue: Queue.Queue): Promise<void> {
  const liveSlugs = await fetchLiveStreamSlugs()
  if (liveSlugs.size === 0) return

  try {
    const jobs = await fetchAutoStartJobs()
    for (const row of jobs) {
      if (!liveSlugs.has(row.stream_slug)) continue
      if (!isWorkerManagedType(row.type)) continue
      if (isJobActive(String(row.id))) continue

      await queue.add(
        'start',
        { jobId: String(row.id) },
        { removeOnComplete: true, removeOnFail: 50 },
      )
      console.log(
        `[worker] auto-start enqueued job ${row.id} for live stream ${row.stream_slug}`,
      )
    }
  } catch (err) {
    console.error(
      '[worker] live reconcile failed:',
      err instanceof Error ? err.message : String(err),
    )
  }
}

export function startLiveReconcileLoop(queue: Queue.Queue): void {
  const tick = () => {
    void reconcileLiveStreams(queue)
  }
  tick()
  setInterval(tick, LIVE_RECONCILE_MS)
  console.log(`[worker] live stream reconcile every ${LIVE_RECONCILE_MS}ms`)
}

export async function reconcileJobsOnStartup(queue: Queue.Queue): Promise<void> {
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    await pool.query(
      `UPDATE forwarding_jobs SET worker_status = 'stopped', updated_at = NOW()
       WHERE worker_status = 'running'`,
    )

    const liveSlugs = await fetchLiveStreamSlugs()
    const res = await pool.query<{ id: string; stream_slug: string }>(
      `SELECT fj.id, s.slug AS stream_slug
       FROM forwarding_jobs fj
       LEFT JOIN streams s ON s.id = fj.stream_id
       WHERE fj.enabled = true
         AND fj.auto_start = true
         AND fj.type <> 'rtmp-push'
         AND s.slug IS NOT NULL`,
    )

    for (const row of res.rows) {
      if (!liveSlugs.has(row.stream_slug)) continue
      await queue.add('start', { jobId: String(row.id) }, { removeOnComplete: true, removeOnFail: 50 })
      console.log(`[worker] re-enqueued forwarding job ${row.id} on startup (stream live)`)
    }
  } catch (err) {
    console.error(
      '[worker] startup reconcile failed:',
      err instanceof Error ? err.message : String(err),
    )
  } finally {
    await pool.end()
  }
}

async function updateJobStatus(jobId: string, status: string): Promise<void> {
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    await pool.query(
      `UPDATE forwarding_jobs SET worker_status = $1, updated_at = NOW() WHERE id = $2`,
      [status, jobId],
    )
  } catch (err) {
    console.error(
      `[worker] failed to update status for job ${jobId}:`,
      err instanceof Error ? err.message : String(err),
    )
  } finally {
    await pool.end()
  }
}
