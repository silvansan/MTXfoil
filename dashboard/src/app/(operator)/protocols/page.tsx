import Link from 'next/link'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

import {
  ProtocolsManager,
  type ProtocolAuthView,
  type ProtocolSettingsView,
} from '@/components/operator/protocols-manager'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isAdmin } from '@/lib/permissions'

const protocolLinks = [
  { href: '/protocols#srt', label: 'SRT' },
  { href: '/protocols#rtmp', label: 'RTMP / RTMPS' },
  { href: '/protocols#hls', label: 'HLS' },
  { href: '/protocols#webrtc', label: 'WebRTC' },
  { href: '/protocols#rtsp', label: 'RTSP' },
  { href: '/protocols#api', label: 'API / Metrics' },
  { href: '/protocols#auth', label: 'Authentication' },
]

function mapAuth(raw: unknown): ProtocolAuthView {
  const auth = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const method = auth.method === 'http' || auth.method === 'jwt' ? auth.method : 'internal'
  return {
    method,
    httpAddress: typeof auth.httpAddress === 'string' ? auth.httpAddress : '',
    jwtJwks: typeof auth.jwtJwks === 'string' ? auth.jwtJwks : '',
    jwtClaimKey: typeof auth.jwtClaimKey === 'string' ? auth.jwtClaimKey : 'mediamtx_permissions',
    jwtIssuer: typeof auth.jwtIssuer === 'string' ? auth.jwtIssuer : '',
    jwtAudience: typeof auth.jwtAudience === 'string' ? auth.jwtAudience : '',
  }
}

function mapSettings(raw: Record<string, unknown>): ProtocolSettingsView {
  const hlsVariant = raw.hlsVariant === 'fmp4' || raw.hlsVariant === 'lowLatency' ? raw.hlsVariant : 'mpegts'
  return {
    srtEnabled: Boolean(raw.srtEnabled ?? true),
    srtAddress: String(raw.srtAddress ?? ':8890'),
    srtPublishPassphrase: String(raw.srtPublishPassphrase ?? ''),
    rtmpEnabled: Boolean(raw.rtmpEnabled ?? true),
    rtmpAddress: String(raw.rtmpAddress ?? ':1935'),
    rtmpsEnabled: Boolean(raw.rtmpsEnabled ?? false),
    rtmpsAddress: String(raw.rtmpsAddress ?? ':1936'),
    rtmpsServerKey: String(raw.rtmpsServerKey ?? ''),
    rtmpsServerCert: String(raw.rtmpsServerCert ?? ''),
    hlsEnabled: Boolean(raw.hlsEnabled ?? true),
    hlsAddress: String(raw.hlsAddress ?? ':8888'),
    hlsVariant,
    hlsLowLatency: Boolean(raw.hlsLowLatency ?? false),
    hlsPartDuration: String(raw.hlsPartDuration ?? '200ms'),
    hlsSegmentDuration: String(raw.hlsSegmentDuration ?? '1s'),
    webrtcEnabled: Boolean(raw.webrtcEnabled ?? true),
    webrtcAddress: String(raw.webrtcAddress ?? ':8889'),
    rtspEnabled: Boolean(raw.rtspEnabled ?? true),
    rtspAddress: String(raw.rtspAddress ?? ':8554'),
    apiEnabled: Boolean(raw.apiEnabled ?? true),
    metricsEnabled: Boolean(raw.metricsEnabled ?? true),
    playbackEnabled: Boolean(raw.playbackEnabled ?? true),
    auth: mapAuth(raw.auth),
  }
}

export const dynamic = 'force-dynamic'

export default async function ProtocolsPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const canManage = isAdmin(user)
  const settings = await payload.findGlobal({ slug: 'protocol-settings' })
  const view = mapSettings(settings as unknown as Record<string, unknown>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Protocol Settings</h1>
        <p className="mt-2 text-zinc-400">
          Global MediaMTX protocol and authentication settings. Changes are saved to the database and
          applied to MediaMTX automatically.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {protocolLinks.map((p) => (
          <Link key={p.href} href={p.href}>
            <Card className="transition-colors hover:border-zinc-600">
              <CardHeader>
                <CardTitle className="text-base">{p.label}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant={view.srtEnabled ? 'success' : 'muted'}>SRT</Badge>
          <Badge variant={view.rtmpEnabled ? 'success' : 'muted'}>RTMP</Badge>
          <Badge variant={view.hlsEnabled ? 'success' : 'muted'}>HLS</Badge>
          <Badge variant={view.webrtcEnabled ? 'success' : 'muted'}>WebRTC</Badge>
          <Badge variant={view.rtspEnabled ? 'success' : 'muted'}>RTSP</Badge>
        </CardContent>
      </Card>

      <ProtocolsManager initial={view} canManage={canManage} />
    </div>
  )
}
