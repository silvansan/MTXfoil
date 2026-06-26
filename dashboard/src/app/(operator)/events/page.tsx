import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

import { EventsManager, type EventView, type RelatedStream } from '@/components/operator/events-manager'
import { isAdmin, isOperator } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const canManage = isOperator(user)
  const canDelete = isAdmin(user)

  const [events, streams] = await Promise.all([
    payload.find({ collection: 'events', limit: 100, sort: '-date' }),
    payload.find({ collection: 'streams', limit: 500, depth: 0 }),
  ])

  const streamsByEvent = new Map<string, RelatedStream[]>()
  for (const stream of streams.docs) {
    const eventId =
      typeof stream.event === 'object' && stream.event !== null
        ? String((stream.event as { id: string | number }).id)
        : stream.event
          ? String(stream.event)
          : null
    if (!eventId) continue
    const list = streamsByEvent.get(eventId) ?? []
    list.push({ slug: stream.slug, name: stream.name })
    streamsByEvent.set(eventId, list)
  }

  const eventViews: EventView[] = events.docs.map((event) => ({
    id: String(event.id),
    title: event.title,
    slug: event.slug,
    date: event.date ?? null,
    status: event.status ?? 'draft',
    description: event.description ?? '',
    defaultDomain: event.defaultDomain ?? '',
    notes: event.notes ?? '',
    streams: streamsByEvent.get(String(event.id)) ?? [],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="mt-2 text-zinc-400">Group streams by event.</p>
      </div>
      <EventsManager events={eventViews} canManage={canManage} canDelete={canDelete} />
    </div>
  )
}
