import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

import {
  ForwardingManager,
  type ForwardingJobView,
  type StreamOption,
} from '@/components/operator/forwarding-manager'
import { canManageForwarding, isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function ForwardingPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const canManage = canManageForwarding(user)
  const canDelete = isAdmin(user)

  const [jobsResult, streamsResult] = await Promise.all([
    payload.find({ collection: 'forwarding-jobs', limit: 100, depth: 1 }),
    payload.find({ collection: 'streams', limit: 500, sort: 'name', depth: 0 }),
  ])

  const streamOptions: StreamOption[] = streamsResult.docs.map((s) => ({
    id: String(s.id),
    name: s.name,
  }))

  const jobs: ForwardingJobView[] = jobsResult.docs.map((job) => {
    const streamRef = job.stream as { id?: string | number; name?: string } | string | number | null
    const streamId =
      typeof streamRef === 'object' && streamRef !== null ? String(streamRef.id) : String(streamRef ?? '')
    const streamName =
      typeof streamRef === 'object' && streamRef !== null && streamRef.name ? streamRef.name : streamId
    return {
      id: String(job.id),
      name: job.name,
      streamId,
      streamName,
      type: job.type,
      destinationUrl: job.destinationUrl,
      enabled: Boolean(job.enabled),
      autoStart: Boolean(job.autoStart),
      restartOnFailure: Boolean(job.restartOnFailure),
      notes: job.notes ?? '',
      workerStatus: job.workerStatus ?? 'idle',
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Forwarding Jobs</h1>
        <p className="mt-2 text-zinc-400">
          Restream paths to external destinations. FFmpeg push jobs run in the worker (Bull + Redis).
        </p>
      </div>

      <ForwardingManager
        jobs={jobs}
        streamOptions={streamOptions}
        canManage={canManage}
        canDelete={canDelete}
      />
    </div>
  )
}
