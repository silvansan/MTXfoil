import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { StreamForm, type EventOption, type StreamInitial } from '@/components/operator/stream-form'
import { Card, CardContent } from '@/components/ui/card'
import { canManageStreams } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export default async function EditStreamPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  const result = await payload.find({
    collection: 'streams',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  const stream = result.docs[0]
  if (!stream) notFound()

  if (!canManageStreams(user)) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Edit Stream</h1>
        <Card>
          <CardContent className="py-8 text-center text-zinc-400">
            You do not have permission to edit streams. This action requires an operator role or
            higher.
          </CardContent>
        </Card>
      </div>
    )
  }

  let events: EventOption[] = []
  try {
    const evResult = await payload.find({ collection: 'events', limit: 200, sort: 'title', depth: 0 })
    events = evResult.docs.map((ev) => ({ id: String(ev.id), title: ev.title }))
  } catch {
    events = []
  }

  const eventId =
    typeof stream.event === 'object' && stream.event !== null
      ? String((stream.event as { id: string | number }).id)
      : stream.event
        ? String(stream.event)
        : ''

  const initial: StreamInitial = {
    id: String(stream.id),
    name: stream.name,
    slug: stream.slug,
    event: eventId,
    sourceType: stream.sourceType ?? 'publisher',
    sourceUrl: stream.sourceUrl ?? '',
    ingestProtocol: stream.ingestProtocol ?? 'srt',
    enabledProtocols: (stream.enabledProtocols ?? []) as string[],
    recordingEnabled: Boolean(stream.recordingEnabled),
    playbackEnabled: stream.playbackEnabled ?? true,
    authMode: stream.authMode ?? 'internal',
    publishPassword: stream.publishPassword ?? '',
    readPassword: stream.readPassword ?? '',
    notes: stream.notes ?? '',
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">
          <Link href="/streams" className="hover:underline">
            Streams
          </Link>{' '}
          /{' '}
          <Link href={`/streams/${stream.slug}`} className="hover:underline">
            {stream.slug}
          </Link>{' '}
          / Edit
        </p>
        <h1 className="text-3xl font-bold">Edit {stream.name}</h1>
      </div>
      <StreamForm mode="edit" events={events} initial={initial} />
    </div>
  )
}
