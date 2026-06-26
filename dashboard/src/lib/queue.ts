import Queue from 'bull'

let forwardingQueue: Queue.Queue | null = null

function getRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://localhost:6379'
}

export function getForwardingQueue(): Queue.Queue {
  if (!forwardingQueue) {
    forwardingQueue = new Queue('mtxfoil-forwarding', getRedisUrl())
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
