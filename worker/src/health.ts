import { createServer, type Server } from 'node:http'

import type Queue from 'bull'

import { getActiveJobs } from './forwarding.js'

const startedAt = Date.now()

/**
 * Lightweight HTTP health endpoint for the worker.
 * GET /health -> 200 with queue/heartbeat status and active job count.
 * Returns 503 if Redis (the Bull queue backend) is unreachable.
 */
export function startHealthServer(queue: Queue.Queue): Server {
  const port = Number(process.env.WORKER_HEALTH_PORT || 9999)

  const server = createServer(async (req, res) => {
    if (req.url !== '/health' && req.url !== '/') {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'not found' }))
      return
    }

    const jobs = getActiveJobs()
    let redisReady = false
    let counts: unknown
    try {
      const client = await queue.isReady()
      redisReady = client.client.status === 'ready'
      counts = await queue.getJobCounts()
    } catch (err) {
      console.error(
        '[worker] health check redis error:',
        err instanceof Error ? err.message : String(err),
      )
    }

    const body = {
      status: redisReady ? 'ok' : 'degraded',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      redis: redisReady ? 'ready' : 'unavailable',
      activeJobs: jobs.length,
      jobs,
      queue: counts,
    }

    res.writeHead(redisReady ? 200 : 503, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body))
  })

  server.listen(port, () => {
    console.log(`[mtxfoil-worker] health endpoint on :${port}/health`)
  })

  return server
}
