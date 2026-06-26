'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type StreamOption = { id: string; name: string }

export type ForwardingJobView = {
  id: string
  name: string
  streamId: string
  streamName: string
  type: string
  destinationUrl: string
  enabled: boolean
  autoStart: boolean
  restartOnFailure: boolean
  notes: string
  workerStatus: string
}

const JOB_TYPES = [
  { value: 'srt-push', label: 'SRT Push' },
  { value: 'rtmp-push', label: 'RTMP Push' },
  { value: 'hls-pull', label: 'HLS Pull' },
] as const

const inputClass =
  'w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none'
const labelClass = 'text-sm font-medium text-zinc-300'

type FormState = {
  name: string
  stream: string
  type: string
  destinationUrl: string
  enabled: boolean
  autoStart: boolean
  restartOnFailure: boolean
  notes: string
}

function emptyForm(streamOptions: StreamOption[]): FormState {
  return {
    name: '',
    stream: streamOptions[0]?.id ?? '',
    type: 'srt-push',
    destinationUrl: '',
    enabled: false,
    autoStart: true,
    restartOnFailure: true,
    notes: '',
  }
}

function ForwardingForm({
  streamOptions,
  initial,
  jobId,
  onDone,
  onCancel,
}: {
  streamOptions: StreamOption[]
  initial: FormState
  jobId?: string
  onDone: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(jobId)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(isEdit ? `/api/forwarding/${jobId}` : '/api/forwarding', {
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
          <label className={labelClass}>Name</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="YouTube restream"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Stream</label>
          <select className={inputClass} value={form.stream} onChange={(e) => set('stream', e.target.value)} required>
            <option value="">— Select —</option>
            {streamOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelClass}>Type</label>
          <select className={inputClass} value={form.type} onChange={(e) => set('type', e.target.value)}>
            {JOB_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Destination URL</label>
          <input
            className={inputClass}
            value={form.destinationUrl}
            onChange={(e) => set('destinationUrl', e.target.value)}
            placeholder="rtmp://a.rtmp.youtube.com/live2/KEY"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Notes (optional)</label>
        <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" className="h-4 w-4 accent-emerald-500" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
          Enabled
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" className="h-4 w-4 accent-emerald-500" checked={form.autoStart} onChange={(e) => set('autoStart', e.target.checked)} />
          Auto-start
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" className="h-4 w-4 accent-emerald-500" checked={form.restartOnFailure} onChange={(e) => set('restartOnFailure', e.target.checked)} />
          Restart on failure
        </label>
      </div>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Job'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function ForwardingManager({
  jobs,
  streamOptions,
  canManage,
  canDelete,
}: {
  jobs: ForwardingJobView[]
  streamOptions: StreamOption[]
  canManage: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggleEnabled(job: ForwardingJobView) {
    setBusyId(job.id)
    setError(null)
    try {
      const res = await fetch(`/api/forwarding/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !job.enabled }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error || `Failed (${res.status})`)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(job: ForwardingJobView) {
    if (!window.confirm(`Delete forwarding job "${job.name}"?`)) return
    setBusyId(job.id)
    setError(null)
    try {
      const res = await fetch(`/api/forwarding/${job.id}`, { method: 'DELETE' })
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
        <Button onClick={() => { setEditingId(null); setCreating(true) }}>New forwarding job</Button>
      )}

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>New forwarding job</CardTitle>
          </CardHeader>
          <CardContent>
            <ForwardingForm
              streamOptions={streamOptions}
              initial={emptyForm(streamOptions)}
              onDone={done}
              onCancel={() => setCreating(false)}
            />
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <div className="grid gap-4">
        {jobs.map((job) =>
          editingId === job.id ? (
            <Card key={job.id}>
              <CardHeader>
                <CardTitle>Edit: {job.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <ForwardingForm
                  streamOptions={streamOptions}
                  jobId={job.id}
                  initial={{
                    name: job.name,
                    stream: job.streamId,
                    type: job.type,
                    destinationUrl: job.destinationUrl,
                    enabled: job.enabled,
                    autoStart: job.autoStart,
                    restartOnFailure: job.restartOnFailure,
                    notes: job.notes,
                  }}
                  onDone={done}
                  onCancel={() => setEditingId(null)}
                />
              </CardContent>
            </Card>
          ) : (
            <Card key={job.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>{job.name}</CardTitle>
                <Badge variant={job.workerStatus === 'running' ? 'success' : job.enabled ? 'warning' : 'muted'}>
                  {job.workerStatus || (job.enabled ? 'queued' : 'disabled')}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-zinc-400 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <p>Stream: {job.streamName}</p>
                  <p>Type: {job.type}</p>
                  <p className="break-all">Destination: {job.destinationUrl}</p>
                  <p>Auto-start: {job.autoStart ? 'Yes' : 'No'}</p>
                </div>
                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleEnabled(job)} disabled={busyId === job.id}>
                      {job.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setCreating(false); setEditingId(job.id) }} disabled={busyId === job.id}>
                      Edit
                    </Button>
                    {canDelete && (
                      <Button variant="destructive" size="sm" onClick={() => remove(job)} disabled={busyId === job.id}>
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ),
        )}
        {jobs.length === 0 && !creating && (
          <Card>
            <CardContent className="py-8 text-center text-zinc-500">
              No forwarding jobs yet.
              {canManage ? ' Create one to restream a path to an external destination.' : ''}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
