import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function EventsPage() {
  const payload = await getPayload({ config })
  const [events, streams] = await Promise.all([
    payload.find({ collection: 'events', limit: 100, sort: '-date' }),
    payload.find({ collection: 'streams', limit: 500, depth: 0 }),
  ])

  const streamsByEvent = new Map<string | number, typeof streams.docs>()
  for (const stream of streams.docs) {
    const eventId = typeof stream.event === 'object' && stream.event !== null
      ? (stream.event as { id: string | number }).id
      : stream.event
    if (!eventId) continue
    const list = streamsByEvent.get(eventId) ?? []
    list.push(stream)
    streamsByEvent.set(eventId, list)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="mt-2 text-zinc-400">Group streams by event.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {events.docs.map((event) => {
          const related = streamsByEvent.get(event.id) ?? []
          return (
            <Card key={event.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{event.title}</CardTitle>
                <Badge variant={event.status === 'active' ? 'success' : 'muted'}>{event.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-400">
                <p>Slug: {event.slug}</p>
                {event.date && <p>Date: {new Date(event.date).toLocaleDateString()}</p>}
                {event.description && <p>{event.description}</p>}
                <div className="pt-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Streams ({related.length})</p>
                  {related.length === 0 ? (
                    <p className="text-zinc-500">No streams linked to this event.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {related.map((stream) => (
                        <li key={stream.id}>
                          <Link href={`/streams/${stream.slug}`} className="text-emerald-400 hover:underline">
                            {stream.name}
                          </Link>
                          {' · '}
                          <Link href={`/player/${stream.slug}`} className="text-zinc-400 hover:underline">
                            Player
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Link href={`/admin/collections/events/${event.id}`} className="text-emerald-400 underline">
                  Edit in Admin
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
