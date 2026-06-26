import Queue from 'bull'

import { buildRedisUrl, IOREDIS_CLIENT_OPTIONS } from '@/lib/redis-url'

let forwardingQueue: Queue.Queue | null = null

export function getForwardingQueue(): Queue.Queue {
  if (!forwardingQueue) {
    forwardingQueue = new Queue('mtxfoil-forwarding', buildRedisUrl(), {
      redis: IOREDIS_CLIENT_OPTIONS,
    })
  }
  return forwardingQueue
}

export async function enqueueForwardingJob(
  action: 'start' | 'stop',
  jobId: string,
): Promise<void> {
  const queue = getForwardingQueue()
  await queue.add(action, { jobId }, { removeOnComplete: true, removeOnFail: 50 })
}
