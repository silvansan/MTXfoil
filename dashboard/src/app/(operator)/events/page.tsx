import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function EventsPage() {
  const payload = await getPayload({ config })
  const events = await payload.find({ collection: 'events', limit: 100, sort: '-date' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="mt-2 text-zinc-400">Group streams by event.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {events.docs.map((event) => (
          <Card key={event.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{event.title}</CardTitle>
              <Badge variant={event.status === 'active' ? 'success' : 'muted'}>{event.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-400">
              <p>Slug: {event.slug}</p>
              {event.date && <p>Date: {new Date(event.date).toLocaleDateString()}</p>}
              {event.description && <p>{event.description}</p>}
              <Link href={`/admin/collections/events/${event.id}`} className="text-emerald-400 underline">
                Edit in Admin
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
