import { headers } from 'next/headers'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import { StreamRow } from '@/components/operator/stream-row'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { listStreamStatuses } from '@/lib/mediamtx/paths'
import { canManageStreams, isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function StreamsPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const canManage = canManageStreams(user)
  const canDelete = isAdmin(user)
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Streams</h1>
          <p className="mt-2 text-muted">Configured paths and live status.</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/streams/new">Create Stream</Link>
          </Button>
        )}
      </div>
      <div className="grid gap-4">
        {streams.docs.map((stream) => {
          const status = statusBySlug.get(stream.slug)
          return (
            <StreamRow
              key={stream.id}
              canManage={canManage}
              canDelete={canDelete}
              stream={{
                id: String(stream.id),
                name: stream.name,
                slug: stream.slug,
                authMode: stream.authMode,
                recordingEnabled: stream.recordingEnabled,
                ready: Boolean(status?.ready),
                readerCount: status?.readerCount ?? 0,
              }}
            />
          )
        })}
        {streams.docs.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted">
              No streams configured yet.{' '}
              {canManage ? (
                <Link href="/streams/new" className="text-accent-link underline">
                  Create your first stream
                </Link>
              ) : (
                'Ask an operator to create one.'
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
