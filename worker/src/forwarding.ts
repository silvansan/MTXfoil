import { spawn, type ChildProcess } from 'node:child_process'

import type { Job } from 'bull'

const activePushes = new Map<string, ChildProcess>()

export type ForwardingJobData = {
  jobId: string
  streamSlug: string
  type: string
  destinationUrl: string
  sourceUrl: string
}

function jobKey(jobId: string): string {
  return jobId
}

function buildFfmpegArgs(type: string, sourceUrl: string, destinationUrl: string): string[] {
  const base = ['-nostats', '-loglevel', 'warning', '-re', '-i', sourceUrl]

  if (type === 'rtmp-push') {
    return [...base, '-c', 'copy', '-f', 'flv', destinationUrl]
  }

  return [...base, '-c', 'copy', '-pes_payload_size', '0', '-f', 'mpegts', destinationUrl]
}

export function spawnForward(job: ForwardingJobData): ChildProcess {
  const key = jobKey(job.jobId)
  const existing = activePushes.get(key)
  if (existing && !existing.killed) return existing

  const args = buildFfmpegArgs(job.type, job.sourceUrl, job.destinationUrl)
  const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })

  child.stderr?.on('data', (chunk: Buffer) => {
    const line = chunk.toString().trim()
    if (line) console.log(`[ffmpeg:${job.jobId}] ${line}`)
  })

  child.on('exit', () => activePushes.delete(key))
  child.on('error', () => activePushes.delete(key))
  activePushes.set(key, child)
  return child
}

export function stopForward(jobId: string): void {
  const child = activePushes.get(jobKey(jobId))
  if (child && !child.killed) {
    child.kill('SIGTERM')
  }
  activePushes.delete(jobKey(jobId))
}

export async function processStartJob(job: Job<{ jobId: string }>): Promise<{ success: boolean }> {
  const { jobId } = job.data
  const row = await fetchJobFromDb(jobId)
  if (!row) throw new Error(`Forwarding job ${jobId} not found`)

  const sourceUrl = row.source_url || `rtsp://mediamtx:8554/${row.stream_slug}`
  spawnForward({
    jobId,
    streamSlug: row.stream_slug,
    type: row.type,
    destinationUrl: row.destination_url,
    sourceUrl,
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
  source_url?: string
}

async function fetchJobFromDb(jobId: string): Promise<DbJob | null> {
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const res = await pool.query(
      `SELECT fj.type, fj.destination_url, s.slug as stream_slug
       FROM forwarding_jobs fj
       LEFT JOIN streams s ON s.id = fj.stream_id
       WHERE fj.id = $1`,
      [jobId],
    )
    return res.rows[0] || null
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
  } catch {
    // table/column names may differ until Payload push runs
  } finally {
    await pool.end()
  }
}
