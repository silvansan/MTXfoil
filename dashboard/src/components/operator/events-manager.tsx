'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClickableRow } from '@/components/operator/clickable-row'
import { inputClass, labelClass } from '@/lib/operator-ui'

export type RelatedStream = { slug: string; name: string }

export type EventView = {
  id: string
  title: string
  slug: string
  date: string | null
  status: string
  description: string
  defaultDomain: string
  notes: string
  streams: RelatedStream[]
}

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
] as const

type FormState = {
  title: string
  slug: string
  date: string
  status: string
  description: string
  defaultDomain: string
  notes: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const emptyForm: FormState = {
  title: '',
  slug: '',
  date: '',
  status: 'draft',
  description: '',
  defaultDomain: '',
  notes: '',
}

function EventForm({
  initial,
  eventId,
  onDone,
  onCancel,
}: {
  initial: FormState
  eventId?: string
  onDone: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [slugTouched, setSlugTouched] = useState(Boolean(eventId))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(eventId)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(isEdit ? `/api/events/${eventId}` : '/api/events', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error || `Failed (${res.status})`)
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => {
              set('title', e.target.value)
              if (!slugTouched) set('slug', slugify(e.target.value))
            }}
            placeholder="Sunday Service"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Slug</label>
          <input
            className={inputClass}
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true)
              set('slug', e.target.value)
            }}
            placeholder="sunday-service"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelClass}>Date</label>
          <input type="date" className={inputClass} value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Status</label>
          <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Default domain (optional)</label>
        <input className={inputClass} value={form.defaultDomain} onChange={(e) => set('defaultDomain', e.target.value)} placeholder="stream.example.org" />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Description (optional)</label>
        <textarea className={inputClass} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Notes (optional)</label>
        <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Event'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function EventsManager({
  events,
  canManage,
  canDelete,
}: {
  events: EventView[]
  canManage: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function remove(ev: EventView) {
    if (!window.confirm(`Delete event "${ev.title}"? Linked streams are not deleted.`)) return
    setBusyId(ev.id)
    setError(null)
    try {
      const res = await fetch(`/api/events/${ev.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error || `Failed (${res.status})`)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setBusyId(null)
    }
  }

  function done() {
    setCreating(false)
    setEditingId(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {canManage && !creating && (
        <Button onClick={() => { setEditingId(null); setCreating(true) }}>New event</Button>
      )}

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>New event</CardTitle>
          </CardHeader>
          <CardContent>
            <EventForm initial={emptyForm} onDone={done} onCancel={() => setCreating(false)} />
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {events.map((ev) =>
          editingId === ev.id ? (
            <Card key={ev.id} className="md:col-span-2">
              <CardHeader>
                <CardTitle>Edit: {ev.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <EventForm
                  eventId={ev.id}
                  initial={{
                    title: ev.title,
                    slug: ev.slug,
                    date: ev.date ? ev.date.slice(0, 10) : '',
                    status: ev.status,
                    description: ev.description,
                    defaultDomain: ev.defaultDomain,
                    notes: ev.notes,
                  }}
                  onDone={done}
                  onCancel={() => setEditingId(null)}
                />
              </CardContent>
            </Card>
          ) : (
            <ClickableRow
              key={ev.id}
              disabled={!canManage}
              onActivate={() => {
                if (canManage) {
                  setCreating(false)
                  setEditingId(ev.id)
                }
              }}
              ariaLabel={canManage ? `Edit event ${ev.title}` : ev.title}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{ev.title}</CardTitle>
                  <Badge variant={ev.status === 'active' ? 'success' : 'muted'}>{ev.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted">
                  <p>Slug: {ev.slug}</p>
                  {ev.date && <p>Date: {new Date(ev.date).toLocaleDateString()}</p>}
                  {ev.description && <p>{ev.description}</p>}
                  <div className="pt-2">
                    <p className="text-xs uppercase tracking-wide text-subtle">Streams ({ev.streams.length})</p>
                    {ev.streams.length === 0 ? (
                      <p className="text-subtle">No streams linked to this event.</p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {ev.streams.map((s) => (
                          <li key={s.slug}>
                            <Link href={`/streams/${s.slug}`} className="text-emerald-600 hover:underline dark:text-emerald-400" data-no-row-nav>
                              {s.name}
                            </Link>
                            {' · '}
                            <Link href={`/player/${s.slug}`} className="text-muted hover:underline" data-no-row-nav>
                              Player
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap items-center gap-2 pt-2" data-no-row-nav>
                      <Button variant="outline" size="sm" onClick={() => { setCreating(false); setEditingId(ev.id) }} disabled={busyId === ev.id}>
                        Edit
                      </Button>
                      {canDelete && (
                        <Button variant="destructive" size="sm" onClick={() => remove(ev)} disabled={busyId === ev.id}>
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </ClickableRow>
          ),
        )}
        {events.length === 0 && !creating && (
          <Card className="md:col-span-2">
            <CardContent className="py-8 text-center text-subtle">
              No events yet.{canManage ? ' Create one to group streams.' : ''}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
