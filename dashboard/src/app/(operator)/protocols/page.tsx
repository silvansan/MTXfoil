import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const protocolLinks = [
  { href: '/protocols/srt', label: 'SRT' },
  { href: '/protocols/rtmp', label: 'RTMP / RTMPS' },
  { href: '/protocols/hls', label: 'HLS' },
  { href: '/protocols/webrtc', label: 'WebRTC' },
  { href: '/protocols/rtsp', label: 'RTSP' },
  { href: '/protocols/api', label: 'API / Metrics' },
]

export default async function ProtocolsPage() {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'protocol-settings' })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Protocol Settings</h1>
        <p className="mt-2 text-zinc-400">Read-only overview. Edit in Payload Admin globals.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {protocolLinks.map((p) => (
          <Link key={p.href} href={p.href}>
            <Card className="transition-colors hover:border-zinc-600">
              <CardHeader>
                <CardTitle>{p.label}</CardTitle>
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
          <Badge variant={settings.srtEnabled ? 'success' : 'muted'}>SRT</Badge>
          <Badge variant={settings.rtmpEnabled ? 'success' : 'muted'}>RTMP</Badge>
          <Badge variant={settings.hlsEnabled ? 'success' : 'muted'}>HLS</Badge>
          <Badge variant={settings.webrtcEnabled ? 'success' : 'muted'}>WebRTC</Badge>
          <Badge variant={settings.rtspEnabled ? 'success' : 'muted'}>RTSP</Badge>
        </CardContent>
      </Card>

      <Link href="/admin/globals/protocol-settings" className="text-emerald-400 underline text-sm">
        Edit protocol settings in Admin →
      </Link>
    </div>
  )
}
