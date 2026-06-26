'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Playback (read) endpoints viewers can use. HLS is read-only; WebRTC is WHEP.
const PROTOCOLS = [
  { value: 'hls', label: 'HLS' },
  { value: 'webrtc', label: 'WebRTC (WHEP)' },
  { value: 'rtsp', label: 'RTSP' },
  { value: 'rtmp', label: 'RTMP' },
  { value: 'srt', label: 'SRT' },
] as const

// Primary ingest protocol for publisher sources.
const INGEST_PROTOCOLS = [
  { value: 'srt', label: 'SRT (caller)' },
  { value: 'rtmp', label: 'RTMP' },
  { value: 'rtmps', label: 'RTMPS' },
  { value: 'rtsp', label: 'RTSP' },
  { value: 'webrtc', label: 'WebRTC (WHIP)' },
] as const

const SOURCE_TYPES = [
  { value: 'publisher', label: 'Publisher (push in)' },
  { value: 'proxy', label: 'Proxy (pull from URL)' },
  { value: 'redirect', label: 'Redirect' },
  { value: 'test', label: 'Test' },
] as const

const AUTH_MODES = [
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'password', label: 'Password' },
  { value: 'token', label: 'Token' },
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External HTTP' },
  { value: 'jwt', label: 'JWT' },
] as const

export type EventOption = { id: string; title: string }

export type StreamInitial = {
  id?: string
  name?: string
  slug?: string
  event?: string
  sourceType?: string
  sourceUrl?: string
  ingestProtocol?: string
  enabledProtocols?: string[]
  recordingEnabled?: boolean
  playbackEnabled?: boolean
  authMode?: string
  publishPassword?: string
  readPassword?: string
  notes?: string
}

const inputClass =
  'w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none'
const labelClass = 'text-sm font-medium text-zinc-300'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_/\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function StreamForm({
  mode = 'create',
  events = [],
  initial = {},
}: {
  mode?: 'create' | 'edit'
  events?: EventOption[]
  initial?: StreamInitial
}) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  const [name, setName] = useState(initial.name ?? '')
  const [slug, setSlug] = useState(initial.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(false)
  const [event, setEvent] = useState(initial.event ?? '')
  const [sourceType, setSourceType] = useState<string>(initial.sourceType ?? 'publisher')
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? '')
  const [ingestProtocol, setIngestProtocol] = useState<string>(initial.ingestProtocol ?? 'srt')
  const [enabledProtocols, setEnabledProtocols] = useState<string[]>(
    initial.enabledProtocols ?? ['hls', 'webrtc', 'rtsp', 'rtmp', 'srt'],
  )
  const [recordingEnabled, setRecordingEnabled] = useState(initial.recordingEnabled ?? false)
  const [playbackEnabled, setPlaybackEnabled] = useState(initial.playbackEnabled ?? true)
  const [authMode, setAuthMode] = useState<string>(initial.authMode ?? 'internal')
  const [publishPassword, setPublishPassword] = useState(initial.publishPassword ?? '')
  const [readPassword, setReadPassword] = useState(initial.readPassword ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsSourceUrl = sourceType === 'proxy' || sourceType === 'redirect'

  function onNameChange(value: string) {
    setName(value)
    if (!isEdit && !slugTouched) setSlug(slugify(value))
  }

  function toggleProtocol(value: string) {
    setEnabledProtocols((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        name,
        event: event || undefined,
        sourceType,
        sourceUrl: needsSourceUrl ? sourceUrl : undefined,
        ingestProtocol,
        enabledProtocols,
        recordingEnabled,
        playbackEnabled,
        authMode,
        publishPassword: authMode === 'password' ? publishPassword : undefined,
        readPassword: authMode === 'password' ? readPassword : undefined,
        notes: notes || undefined,
      }

      const res = isEdit
        ? await fetch(`/api/streams/${initial.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/streams/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, slug }),
          })

      const json = (await res.json().catch(() => ({}))) as { slug?: string; error?: string }
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`)
      }
      const targetSlug = json.slug ?? slug
      router.push(isEdit ? `/streams/${targetSlug}` : `/streams/${targetSlug}?created=1`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save stream')
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Stream' : 'New Stream'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="name" className={labelClass}>
                Name
              </label>
              <input
                id="name"
                className={inputClass}
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Sunday Service"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="slug" className={labelClass}>
                Slug
              </label>
              <input
                id="slug"
                className={inputClass + (isEdit ? ' opacity-60' : '')}
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value)
                }}
                placeholder="sunday-service"
                required
                readOnly={isEdit}
              />
              <p className="text-xs text-zinc-500">
                {isEdit
                  ? 'Slug is the MediaMTX path and cannot be changed after creation.'
                  : 'MediaMTX path name. Lowercase, no spaces.'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="event" className={labelClass}>
                Event (optional)
              </label>
              <select
                id="event"
                className={inputClass}
                value={event}
                onChange={(e) => setEvent(e.target.value)}
              >
                <option value="">— None —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sourceType" className={labelClass}>
                Source Type
              </label>
              <select
                id="sourceType"
                className={inputClass}
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
              >
                {SOURCE_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {needsSourceUrl && (
            <div className="space-y-1.5">
              <label htmlFor="sourceUrl" className={labelClass}>
                Source URL
              </label>
              <input
                id="sourceUrl"
                className={inputClass}
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="rtsp://camera.local:554/stream"
              />
              <p className="text-xs text-zinc-500">
                Scheme sets the pull protocol (rtsp / rtmp / srt / http HLS).
              </p>
            </div>
          )}

          {sourceType === 'publisher' && (
            <div className="space-y-1.5">
              <label htmlFor="ingestProtocol" className={labelClass}>
                Ingest protocol
              </label>
              <select
                id="ingestProtocol"
                className={inputClass}
                value={ingestProtocol}
                onChange={(e) => setIngestProtocol(e.target.value)}
              >
                {INGEST_PROTOCOLS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500">
                How your source publishes into MediaMTX. Determines the ingest URL shown on the
                stream page. MediaMTX still accepts any enabled publish protocol.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <span className={labelClass}>Playback protocols</span>
            <p className="text-xs text-zinc-500">Read endpoints advertised to viewers.</p>
            <div className="flex flex-wrap gap-2">
              {PROTOCOLS.map((p) => {
                const active = enabledProtocols.includes(p.value)
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => toggleProtocol(p.value)}
                    className={
                      'rounded-md border px-3 py-1.5 text-sm transition-colors ' +
                      (active
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                        : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800')
                    }
                    aria-pressed={active}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="authMode" className={labelClass}>
              Auth Mode
            </label>
            <select
              id="authMode"
              className={inputClass}
              value={authMode}
              onChange={(e) => setAuthMode(e.target.value)}
            >
              {AUTH_MODES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {authMode === 'password' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="publishPassword" className={labelClass}>
                  Publish password
                </label>
                <input
                  id="publishPassword"
                  className={inputClass}
                  value={publishPassword}
                  onChange={(e) => setPublishPassword(e.target.value)}
                  placeholder="publisher secret"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="readPassword" className={labelClass}>
                  Read password
                </label>
                <input
                  id="readPassword"
                  className={inputClass}
                  value={readPassword}
                  onChange={(e) => setReadPassword(e.target.value)}
                  placeholder="viewer secret"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="notes" className={labelClass}>
              Notes (optional)
            </label>
            <textarea
              id="notes"
              className={inputClass}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-500"
                checked={playbackEnabled}
                onChange={(e) => setPlaybackEnabled(e.target.checked)}
              />
              Playback enabled
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-500"
                checked={recordingEnabled}
                onChange={(e) => setRecordingEnabled(e.target.checked)}
              />
              Recording enabled
            </label>
          </div>

          {error && (
            <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Stream'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(isEdit && initial.slug ? `/streams/${initial.slug}` : '/streams')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
