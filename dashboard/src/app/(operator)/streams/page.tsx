import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import { StatusBadge } from '@/components/operator/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { listStreamStatuses } from '@/lib/mediamtx/paths'

export default async function StreamsPage() {
  const payload = await getPayload({ config })
  const streams = await payload.find({ collection: 'streams', limit: 200, sort: 'name' })

  let statuses: Awaited<ReturnType<typeof listStreamStatuses>> = []
  try {
    const recording = new Set(
      streams.docs.filter((s) => s.recordingEnabled).map((s) => s.slug),
    )
    statuses = await listStreamStatuses(recording)
  } catch {
    statuses = []
  }

  const statusBySlug = new Map(statuses.map((s) => [s.name, s]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Streams</h1>
        <p className="mt-2 text-zinc-400">Configured paths and live status.</p>
      </div>
      <div className="grid gap-4">
        {streams.docs.map((stream) => {
          const status = statusBySlug.get(stream.slug)
          return (
            <Card key={stream.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  <Link href={`/streams/${stream.slug}`} className="hover:underline">
                    {stream.name}
                  </Link>
                </CardTitle>
                <StatusBadge ready={Boolean(status?.ready)} recording={stream.recordingEnabled || false} />
              </CardHeader>
              <CardContent className="text-sm text-zinc-400">
                <p>Slug: {stream.slug}</p>
                <p>Readers: {status?.readerCount ?? 0}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
