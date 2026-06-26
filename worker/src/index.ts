import { config as loadEnv } from 'dotenv'
import Queue from 'bull'

import { processStartJob, processStopJob, reconcileJobsOnStartup, startLiveReconcileLoop } from './forwarding.js'
import { startHealthServer } from './health.js'
import { buildRedisUrl, IOREDIS_CLIENT_OPTIONS } from './redis-url.js'

loadEnv()

const redisUrl = buildRedisUrl()
const concurrency = Number(process.env.WORKER_CONCURRENCY || 2)

const queue = new Queue('mtxfoil-forwarding', redisUrl, { redis: IOREDIS_CLIENT_OPTIONS })

queue.process('start', concurrency, processStartJob)
queue.process('stop', concurrency, processStopJob)

queue.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message)
})

queue.on('error', (err) => {
  console.error('[worker] queue error:', err.message)
})

startHealthServer(queue)

void reconcileJobsOnStartup(queue)
startLiveReconcileLoop(queue)

console.log(`[mtxfoil-worker] listening on redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'} (concurrency=${concurrency})`)
