import { headers } from 'next/headers'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import { StreamForm, type EventOption } from '@/components/operator/stream-form'
import { Card, CardContent } from '@/components/ui/card'
import { canManageStreams } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function NewStreamPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!canManageStreams(user)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create Stream</h1>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted">
            You do not have permission to create streams. This action requires an operator role or
            higher.
          </CardContent>
        </Card>
      </div>
    )
  }

  let events: EventOption[] = []
  try {
    const result = await payload.find({ collection: 'events', limit: 200, sort: 'title', depth: 0 })
    events = result.docs.map((ev) => ({ id: String(ev.id), title: ev.title }))
  } catch {
    events = []
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">
          <Link href="/streams" className="hover:underline">
            Streams
          </Link>{' '}
          / New
        </p>
        <h1 className="text-3xl font-bold">Create Stream</h1>
        <p className="mt-2 text-muted">
          Saved through Payload so MediaMTX config (mediamtx.yml + API) stays in sync.
        </p>
      </div>
      <StreamForm mode="create" events={events} />
    </div>
  )
}
