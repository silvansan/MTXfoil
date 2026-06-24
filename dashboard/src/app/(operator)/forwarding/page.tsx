import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ForwardingPage() {
  const payload = await getPayload({ config })
  const jobs = await payload.find({ collection: 'forwarding-jobs', limit: 100, depth: 1 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Forwarding Jobs</h1>
        <p className="mt-2 text-zinc-400">FFmpeg push jobs managed by the worker (Bull + Redis).</p>
      </div>

      <div className="grid gap-4">
        {jobs.docs.map((job) => (
          <Card key={job.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{job.name}</CardTitle>
              <Badge variant={job.workerStatus === 'running' ? 'success' : job.enabled ? 'warning' : 'muted'}>
                {job.workerStatus || (job.enabled ? 'queued' : 'disabled')}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-zinc-400">
              <p>Type: {job.type}</p>
              <p>Destination: {job.destinationUrl}</p>
              <p>Auto-start: {job.autoStart ? 'Yes' : 'No'}</p>
            </CardContent>
          </Card>
        ))}
        {jobs.docs.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-zinc-500">
              No forwarding jobs. Create one in{' '}
              <Link href="/admin/collections/forwarding-jobs" className="text-emerald-400 underline">
                Admin
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
