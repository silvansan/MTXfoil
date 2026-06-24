import { config as loadEnv } from 'dotenv'
import Queue from 'bull'

import { processStartJob, processStopJob } from './forwarding.js'

loadEnv()

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const concurrency = Number(process.env.WORKER_CONCURRENCY || 2)

const queue = new Queue('mtxfoil-forwarding', redisUrl)

queue.process('start', concurrency, processStartJob)
queue.process('stop', concurrency, processStopJob)

queue.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message)
})

console.log(`[mtxfoil-worker] listening on ${redisUrl} (concurrency=${concurrency})`)
