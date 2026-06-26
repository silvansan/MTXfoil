'use client'



import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'



import { ApplyCorsPresetButton } from '@/components/operator/apply-cors-preset-button'
import { ClickableRow } from '@/components/operator/clickable-row'

import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { hasWildcardOrigin } from '@/lib/mediamtx/cors'



export type CorsSettingsView = {

  apiAllowOrigins: string[]

  hlsAllowOrigins: string[]

  webrtcAllowOrigins: string[]

  playbackAllowOrigins: string[]

  metricsAllowOrigins: string[]

  trustedProxies: string[]

}



export type CorsPresetView = {
  id: string | number
  name: string
  description: string
  origins: string[]
  services: string[]
}

const PRESET_SERVICES = [
  { value: 'api', label: 'API' },
  { value: 'hls', label: 'HLS' },
  { value: 'webrtc', label: 'WebRTC' },
  { value: 'playback', label: 'Playback' },
  { value: 'metrics', label: 'Metrics' },
] as const

type PresetFormState = {
  name: string
  description: string
  origins: string[]
  services: string[]
}



function emptyPresetForm(): PresetFormState {
  return { name: '', description: '', origins: [''], services: ['api'] }
}

function CorsPresetForm({
  initial,
  presetId,
  onCancel,
  onSaved,
  disabled,
}: {
  initial: PresetFormState
  presetId?: string | number
  onCancel: () => void
  onSaved: () => void
  disabled?: boolean
}) {
  const [form, setForm] = useState<PresetFormState>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(initial)
    setError(null)
  }, [initial, presetId])

  function toggleService(value: string) {
    setForm((prev) => {
      const has = prev.services.includes(value)
      const services = has ? prev.services.filter((s) => s !== value) : [...prev.services, value]
      return { ...prev, services }
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        origins: form.origins.map((o) => o.trim()).filter(Boolean),
        services: form.services,
      }
      const res = await fetch(
        presetId ? `/api/cors/presets/${presetId}` : '/api/cors/presets',
        {
          method: presetId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error || `Failed (${res.status})`)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preset')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-md border border-zinc-700 p-4">
      <div className="space-y-1">
        <label className="text-sm text-zinc-400">Name</label>
        <input
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
          disabled={disabled || submitting}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm text-zinc-400">Description</label>
        <textarea
          className={`${inputClass} min-h-[72px]`}
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          disabled={disabled || submitting}
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-zinc-400">Origins</p>
        {form.origins.map((origin, index) => (
          <div key={`preset-origin-${index}`} className="flex gap-2">
            <input
              className={inputClass}
              value={origin}
              onChange={(e) => {
                const next = [...form.origins]
                next[index] = e.target.value
                setForm((p) => ({ ...p, origins: next }))
              }}
              placeholder="https://example.org"
              disabled={disabled || submitting}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setForm((p) => ({ ...p, origins: p.origins.filter((_, i) => i !== index) }))
              }
              disabled={disabled || submitting}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setForm((p) => ({ ...p, origins: [...p.origins, ''] }))}
          disabled={disabled || submitting}
        >
          Add origin
        </Button>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-zinc-400">Services</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_SERVICES.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.services.includes(value)}
                onChange={() => toggleService(value)}
                disabled={disabled || submitting}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={disabled || submitting}>
          {submitting ? 'Saving…' : presetId ? 'Update preset' : 'Create preset'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}


const SERVICE_SECTIONS = [
  { key: 'apiAllowOrigins' as const, label: 'API' },
  { key: 'hlsAllowOrigins' as const, label: 'HLS' },
  { key: 'webrtcAllowOrigins' as const, label: 'WebRTC' },
  { key: 'playbackAllowOrigins' as const, label: 'Playback' },
  { key: 'metricsAllowOrigins' as const, label: 'Metrics' },
]



const inputClass =

  'w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none'



function OriginListEditor({

  label,

  origins,

  onChange,

  disabled,

}: {

  label: string

  origins: string[]

  onChange: (origins: string[]) => void

  disabled?: boolean

}) {

  function updateAt(index: number, value: string) {

    const next = [...origins]

    next[index] = value

    onChange(next)

  }



  function removeAt(index: number) {

    onChange(origins.filter((_, i) => i !== index))

  }



  function addRow() {

    onChange([...origins, ''])

  }



  return (

    <Card>

      <CardHeader className="flex flex-row items-center justify-between">

        <CardTitle>{label}</CardTitle>

        {hasWildcardOrigin(origins) && <Badge variant="warning">Wildcard</Badge>}

      </CardHeader>

      <CardContent className="space-y-2">

        {origins.length === 0 ? (

          <p className="text-sm text-zinc-500">No origins configured</p>

        ) : (

          origins.map((origin, index) => (

            <div key={`${label}-${index}`} className="flex gap-2">

              <input

                className={inputClass}

                value={origin}

                onChange={(e) => updateAt(index, e.target.value)}

                placeholder="https://example.org"

                disabled={disabled}

              />

              <Button

                type="button"

                variant="outline"

                size="sm"

                onClick={() => removeAt(index)}

                disabled={disabled}

              >

                Remove

              </Button>

            </div>

          ))

        )}

        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled}>

          Add origin

        </Button>

      </CardContent>

    </Card>

  )

}



export function CorsManager({
  initial,
  warnings,
  presets,
  dashboardUrl,
  isProduction,
  canManage,
  canDelete,
}: {
  initial: CorsSettingsView
  warnings: string[]
  presets: CorsPresetView[]
  dashboardUrl?: string
  isProduction: boolean
  canManage: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [settings, setSettings] = useState<CorsSettingsView>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [presetMode, setPresetMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editingPreset, setEditingPreset] = useState<CorsPresetView | null>(null)
  const [presetDeleting, setPresetDeleting] = useState<string | number | null>(null)

  useEffect(() => {
    setSettings(initial)
    setDirty(false)
  }, [initial])



  function updateSection<K extends keyof CorsSettingsView>(key: K, value: CorsSettingsView[K]) {

    setSettings((prev) => ({ ...prev, [key]: value }))

    setDirty(true)

    setError(null)

  }



  async function deletePreset(id: string | number, name: string) {
    if (!canDelete) return
    if (!window.confirm(`Delete preset "${name}"?`)) return

    setPresetDeleting(id)
    try {
      const res = await fetch(`/api/cors/presets/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error || `Failed (${res.status})`)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete preset')
    } finally {
      setPresetDeleting(null)
    }
  }

  function onPresetSaved() {
    setPresetMode('none')
    setEditingPreset(null)
    router.refresh()
  }
  async function onSave(e: React.FormEvent) {
    e.preventDefault()

    if (!canManage) return



    setSubmitting(true)

    setError(null)

    try {

      const payload = {

        apiAllowOrigins: settings.apiAllowOrigins.map((o) => o.trim()).filter(Boolean),

        hlsAllowOrigins: settings.hlsAllowOrigins.map((o) => o.trim()).filter(Boolean),

        webrtcAllowOrigins: settings.webrtcAllowOrigins.map((o) => o.trim()).filter(Boolean),

        playbackAllowOrigins: settings.playbackAllowOrigins.map((o) => o.trim()).filter(Boolean),

        metricsAllowOrigins: settings.metricsAllowOrigins.map((o) => o.trim()).filter(Boolean),

        trustedProxies: settings.trustedProxies.map((p) => p.trim()).filter(Boolean),

      }



      const res = await fetch('/api/cors', {

        method: 'PATCH',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(payload),

      })

      if (!res.ok) {

        const json = (await res.json().catch(() => ({}))) as { error?: string }

        throw new Error(json.error || `Failed (${res.status})`)

      }

      setDirty(false)

      router.refresh()

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to save')

    } finally {

      setSubmitting(false)

    }

  }



  return (

    <div className="space-y-6">

      {dashboardUrl && (

        <p className="text-sm text-zinc-500">

          Dashboard URL: <code className="text-zinc-300">{dashboardUrl}</code> — merged into CORS on apply when set

          via <code>DASHBOARD_PUBLIC_URL</code>.

        </p>

      )}



      {isProduction && warnings.length > 0 && (

        <p className="text-sm text-amber-300">

          Production mode is active. Wildcard CORS origins and missing trusted proxies block config apply.

        </p>

      )}



      {warnings.length > 0 && (

        <Card className="border-amber-500/40">

          <CardHeader>

            <CardTitle className="text-amber-300">Production warnings</CardTitle>

          </CardHeader>

          <CardContent className="space-y-1 text-sm text-amber-200">

            {warnings.map((w) => (

              <p key={w}>{w}</p>

            ))}

          </CardContent>

        </Card>

      )}



      <form onSubmit={onSave} className="space-y-6">

        <div className="grid gap-4 md:grid-cols-2">

          {SERVICE_SECTIONS.map(({ key, label }) => (

            <OriginListEditor

              key={key}

              label={label}

              origins={settings[key]}

              onChange={(origins) => updateSection(key, origins)}

              disabled={!canManage || submitting}

            />

          ))}

        </div>



        <Card>

          <CardHeader>

            <CardTitle>Trusted proxies</CardTitle>

          </CardHeader>

          <CardContent className="space-y-2">

            {settings.trustedProxies.length === 0 ? (

              <p className="text-sm text-zinc-500">

                No trusted proxies configured. After TLS deploy, add NPM or Docker network IPs (e.g.{' '}

                <code>172.16.0.0/12</code>).

              </p>

            ) : null}

            {settings.trustedProxies.map((proxy, index) => (

              <div key={`proxy-${index}`} className="flex gap-2">

                <input

                  className={inputClass}

                  value={proxy}

                  onChange={(e) => {

                    const next = [...settings.trustedProxies]

                    next[index] = e.target.value

                    updateSection('trustedProxies', next)

                  }}

                  placeholder="172.16.0.0/12"

                  disabled={!canManage || submitting}

                />

                <Button

                  type="button"

                  variant="outline"

                  size="sm"

                  onClick={() =>

                    updateSection(

                      'trustedProxies',

                      settings.trustedProxies.filter((_, i) => i !== index),

                    )

                  }

                  disabled={!canManage || submitting}

                >

                  Remove

                </Button>

              </div>

            ))}

            <Button

              type="button"

              variant="outline"

              size="sm"

              onClick={() => updateSection('trustedProxies', [...settings.trustedProxies, ''])}

              disabled={!canManage || submitting}

            >

              Add proxy

            </Button>

          </CardContent>

        </Card>



        {error && (

          <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>

        )}



        {canManage && (

          <Button type="submit" disabled={submitting || !dirty}>

            {submitting ? 'Saving…' : 'Save CORS settings'}

          </Button>

        )}

      </form>



      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>CORS Presets</CardTitle>
          {canManage && presetMode === 'none' && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setPresetMode('create')
                setEditingPreset(null)
              }}
            >
              New preset
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && presetMode === 'create' && (
            <CorsPresetForm
              initial={emptyPresetForm()}
              onCancel={() => setPresetMode('none')}
              onSaved={onPresetSaved}
            />
          )}

          {canManage && presetMode === 'edit' && editingPreset && (
            <CorsPresetForm
              presetId={editingPreset.id}
              initial={{
                name: editingPreset.name,
                description: editingPreset.description,
                origins: editingPreset.origins.length > 0 ? editingPreset.origins : [''],
                services: editingPreset.services.length > 0 ? editingPreset.services : ['api'],
              }}
              onCancel={() => {
                setPresetMode('none')
                setEditingPreset(null)
              }}
              onSaved={onPresetSaved}
            />
          )}

          {presets.length === 0 && presetMode === 'none' ? (
            <p className="text-sm text-zinc-500">No presets yet — create one above.</p>
          ) : (
            presets.map((preset) => (
              <ClickableRow
                key={preset.id}
                disabled={!canManage}
                onActivate={() => {
                  if (canManage) {
                    setEditingPreset(preset)
                    setPresetMode('edit')
                  }
                }}
                ariaLabel={canManage ? `Edit preset ${preset.name}` : preset.name}
                className="flex flex-col gap-3 rounded-md border border-zinc-800 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{preset.name}</p>
                  {preset.description ? (
                    <p className="text-sm text-zinc-500">{preset.description}</p>
                  ) : null}
                  {preset.origins.length > 0 ? (
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      {preset.origins.join(', ')}
                    </p>
                  ) : null}
                  {preset.services.length > 0 ? (
                    <p className="mt-1 text-xs text-zinc-500">Services: {preset.services.join(', ')}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2" data-no-row-nav>
                  <ApplyCorsPresetButton presetId={preset.id} presetName={preset.name} />
                  {canManage && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPreset(preset)
                        setPresetMode('edit')
                      }}
                    >
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={presetDeleting === preset.id}
                      onClick={() => void deletePreset(preset.id, preset.name)}
                    >
                      {presetDeleting === preset.id ? 'Deleting…' : 'Delete'}
                    </Button>
                  )}
                </div>
              </ClickableRow>
            ))
          )}
        </CardContent>
      </Card>

    </div>

  )

}

