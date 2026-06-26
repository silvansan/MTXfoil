'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { rtmpsIngestAvailable } from '@/lib/mediamtx/protocol'
import {
  inputClass,
  inputMonoClass,
  labelClass,
  sectionDividerClass,
} from '@/lib/operator-ui'

export type ProtocolAuthView = {
  method: 'internal' | 'http' | 'jwt'
  httpAddress: string
  jwtJwks: string
  jwtClaimKey: string
  jwtIssuer: string
  jwtAudience: string
}

export type ProtocolSettingsView = {
  srtEnabled: boolean
  srtAddress: string
  srtPublishPassphrase: string
  rtmpEnabled: boolean
  rtmpAddress: string
  rtmpsEnabled: boolean
  rtmpsAddress: string
  rtmpsServerKey: string
  rtmpsServerCert: string
  hlsEnabled: boolean
  hlsAddress: string
  hlsVariant: 'mpegts' | 'fmp4' | 'lowLatency'
  hlsLowLatency: boolean
  hlsPartDuration: string
  hlsSegmentDuration: string
  webrtcEnabled: boolean
  webrtcAddress: string
  rtspEnabled: boolean
  rtspAddress: string
  apiEnabled: boolean
  metricsEnabled: boolean
  playbackEnabled: boolean
  auth: ProtocolAuthView
}

function CheckboxRow({
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-1"
      />
      <span>
        <span className="text-value">{label}</span>
        {hint ? <p className="mt-0.5 text-xs text-subtle">{hint}</p> : null}
      </span>
    </label>
  )
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = 'text',
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  type?: 'text' | 'password'
  hint?: string
}) {
  return (
    <div className="space-y-1">
      <label className={labelClass}>{label}</label>
      <input
        className={inputMonoClass}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {hint ? <p className="text-xs text-subtle">{hint}</p> : null}
    </div>
  )
}

function SectionCard({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

export function ProtocolsManager({
  initial,
  canManage,
}: {
  initial: ProtocolSettingsView
  canManage: boolean
}) {
  const router = useRouter()
  const [settings, setSettings] = useState<ProtocolSettingsView>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setSettings(initial)
    setDirty(false)
  }, [initial])

  function patch<K extends keyof ProtocolSettingsView>(key: K, value: ProtocolSettingsView[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    setError(null)
  }

  function patchAuth<K extends keyof ProtocolAuthView>(key: K, value: ProtocolAuthView[K]) {
    setSettings((prev) => ({ ...prev, auth: { ...prev.auth, [key]: value } }))
    setDirty(true)
    setError(null)
  }

  const rtmpsCertsReady = rtmpsIngestAvailable(settings)
  const rtmpsWarning =
    settings.rtmpsEnabled && !rtmpsCertsReady
      ? 'RTMPS is enabled but TLS key and cert paths are not both set. MediaMTX will keep RTMPS off until certificates are configured inside the container.'
      : null

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/protocols', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
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

  const disabled = !canManage || submitting

  return (
    <form onSubmit={onSave} className="space-y-6">
      {rtmpsWarning && (
        <Card className="border-amber-500/40">
          <CardContent className="pt-6 text-sm text-amber-200">{rtmpsWarning}</CardContent>
        </Card>
      )}

      <SectionCard id="srt" title="SRT">
        <CheckboxRow
          label="SRT enabled"
          checked={settings.srtEnabled}
          onChange={(v) => patch('srtEnabled', v)}
          disabled={disabled}
        />
        <TextField
          label="Listen address"
          value={settings.srtAddress}
          onChange={(v) => patch('srtAddress', v)}
          disabled={disabled}
          placeholder=":8890"
        />
        <TextField
          label="Publish passphrase"
          value={settings.srtPublishPassphrase}
          onChange={(v) => patch('srtPublishPassphrase', v)}
          disabled={disabled}
          type="password"
          hint="Optional passphrase required for SRT publishers."
        />
      </SectionCard>

      <SectionCard id="rtmp" title="RTMP / RTMPS">
        <CheckboxRow
          label="RTMP enabled"
          checked={settings.rtmpEnabled}
          onChange={(v) => patch('rtmpEnabled', v)}
          disabled={disabled}
        />
        <TextField
          label="RTMP address"
          value={settings.rtmpAddress}
          onChange={(v) => patch('rtmpAddress', v)}
          disabled={disabled}
          placeholder=":1935"
        />
        <div className={sectionDividerClass}>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-medium text-label">RTMPS</span>
            {settings.rtmpsEnabled && (
              <Badge variant={rtmpsCertsReady ? 'success' : 'warning'}>
                {rtmpsCertsReady ? 'Certs configured' : 'Certs missing'}
              </Badge>
            )}
          </div>
          <div className="space-y-4">
            <CheckboxRow
              label="RTMPS enabled"
              checked={settings.rtmpsEnabled}
              onChange={(v) => patch('rtmpsEnabled', v)}
              disabled={disabled}
              hint="Requires TLS key and cert paths inside the MediaMTX container."
            />
            <TextField
              label="RTMPS address"
              value={settings.rtmpsAddress}
              onChange={(v) => patch('rtmpsAddress', v)}
              disabled={disabled}
              placeholder=":1936"
            />
            <TextField
              label="TLS key path (container)"
              value={settings.rtmpsServerKey}
              onChange={(v) => patch('rtmpsServerKey', v)}
              disabled={disabled}
              placeholder="/certs/server.key"
            />
            <TextField
              label="TLS cert path (container)"
              value={settings.rtmpsServerCert}
              onChange={(v) => patch('rtmpsServerCert', v)}
              disabled={disabled}
              placeholder="/certs/server.crt"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard id="hls" title="HLS / LL-HLS">
        <CheckboxRow
          label="HLS enabled"
          checked={settings.hlsEnabled}
          onChange={(v) => patch('hlsEnabled', v)}
          disabled={disabled}
        />
        <TextField
          label="HLS address"
          value={settings.hlsAddress}
          onChange={(v) => patch('hlsAddress', v)}
          disabled={disabled}
          placeholder=":8888"
        />
        <div className="space-y-1">
          <label className={labelClass}>HLS variant</label>
          <select
            className={inputClass}
            value={settings.hlsVariant}
            onChange={(e) => patch('hlsVariant', e.target.value as ProtocolSettingsView['hlsVariant'])}
            disabled={disabled || settings.hlsLowLatency}
          >
            <option value="mpegts">MPEG-TS</option>
            <option value="fmp4">FMP4</option>
            <option value="lowLatency">Low-latency (LL-HLS)</option>
          </select>
        </div>
        <CheckboxRow
          label="Force LL-HLS variant"
          checked={settings.hlsLowLatency}
          onChange={(v) => patch('hlsLowLatency', v)}
          disabled={disabled}
          hint="When enabled, overrides HLS variant to lowLatency."
        />
        <TextField
          label="Part duration"
          value={settings.hlsPartDuration}
          onChange={(v) => patch('hlsPartDuration', v)}
          disabled={disabled}
          placeholder="200ms"
          hint="LL-HLS part duration."
        />
        <TextField
          label="Segment duration"
          value={settings.hlsSegmentDuration}
          onChange={(v) => patch('hlsSegmentDuration', v)}
          disabled={disabled}
          placeholder="1s"
        />
      </SectionCard>

      <SectionCard id="webrtc" title="WebRTC">
        <CheckboxRow
          label="WebRTC enabled"
          checked={settings.webrtcEnabled}
          onChange={(v) => patch('webrtcEnabled', v)}
          disabled={disabled}
        />
        <TextField
          label="WebRTC address"
          value={settings.webrtcAddress}
          onChange={(v) => patch('webrtcAddress', v)}
          disabled={disabled}
          placeholder=":8889"
        />
      </SectionCard>

      <SectionCard id="rtsp" title="RTSP">
        <CheckboxRow
          label="RTSP enabled"
          checked={settings.rtspEnabled}
          onChange={(v) => patch('rtspEnabled', v)}
          disabled={disabled}
        />
        <TextField
          label="RTSP address"
          value={settings.rtspAddress}
          onChange={(v) => patch('rtspAddress', v)}
          disabled={disabled}
          placeholder=":8554"
        />
      </SectionCard>

      <SectionCard id="api" title="API / Metrics / Playback">
        <CheckboxRow
          label="Control API enabled"
          checked={settings.apiEnabled}
          onChange={(v) => patch('apiEnabled', v)}
          disabled={disabled}
          hint="Keep enabled for dashboard control. API is internal-only in the default compose stack."
        />
        <CheckboxRow
          label="Metrics enabled"
          checked={settings.metricsEnabled}
          onChange={(v) => patch('metricsEnabled', v)}
          disabled={disabled}
        />
        <CheckboxRow
          label="Playback server enabled"
          checked={settings.playbackEnabled}
          onChange={(v) => patch('playbackEnabled', v)}
          disabled={disabled}
        />
      </SectionCard>

      <SectionCard id="auth" title="Authentication">
        <p className="text-sm text-subtle">
          MediaMTX auth method is server-wide. Internal mode keeps per-stream authMode; HTTP and JWT
          delegate authorization globally.
        </p>
        <div className="space-y-1">
          <label className={labelClass}>Auth method</label>
          <select
            className={inputClass}
            value={settings.auth.method}
            onChange={(e) => patchAuth('method', e.target.value as ProtocolAuthView['method'])}
            disabled={disabled}
          >
            <option value="internal">Internal (per-stream authMode)</option>
            <option value="http">External HTTP</option>
            <option value="jwt">JWT</option>
          </select>
        </div>
        {settings.auth.method === 'http' && (
          <TextField
            label="HTTP auth endpoint"
            value={settings.auth.httpAddress}
            onChange={(v) => patchAuth('httpAddress', v)}
            disabled={disabled}
            placeholder="Leave blank for built-in dashboard endpoint"
            hint="URL MediaMTX POSTs each auth request to. Blank uses the dashboard built-in /api/mediamtx/auth."
          />
        )}
        {settings.auth.method === 'jwt' && (
          <>
            <TextField
              label="JWKS URL"
              value={settings.auth.jwtJwks}
              onChange={(v) => patchAuth('jwtJwks', v)}
              disabled={disabled}
              placeholder="https://idp.example.com/.well-known/jwks.json"
              hint="Required for JWT mode."
            />
            <TextField
              label="JWT claim key"
              value={settings.auth.jwtClaimKey}
              onChange={(v) => patchAuth('jwtClaimKey', v)}
              disabled={disabled}
              placeholder="mediamtx_permissions"
            />
            <TextField
              label="JWT issuer"
              value={settings.auth.jwtIssuer}
              onChange={(v) => patchAuth('jwtIssuer', v)}
              disabled={disabled}
            />
            <TextField
              label="JWT audience"
              value={settings.auth.jwtAudience}
              onChange={(v) => patchAuth('jwtAudience', v)}
              disabled={disabled}
            />
          </>
        )}
      </SectionCard>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {canManage ? (
        <Button type="submit" disabled={submitting || !dirty}>
          {submitting ? 'Saving…' : 'Save protocol settings'}
        </Button>
      ) : (
        <p className="text-sm text-subtle">Admin role required to edit protocol settings.</p>
      )}
    </form>
  )
}
