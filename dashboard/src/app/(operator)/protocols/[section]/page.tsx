import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = { params: Promise<{ section: string }> }

const titles: Record<string, string> = {
  srt: 'SRT',
  rtmp: 'RTMP / RTMPS',
  hls: 'HLS / LL-HLS',
  webrtc: 'WebRTC',
  rtsp: 'RTSP',
  api: 'API / Metrics / Playback',
}

export default async function ProtocolSectionPage({ params }: Props) {
  const { section } = await params
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'protocol-settings' })

  const fields: Array<[string, unknown]> = []
  if (section === 'srt') {
    fields.push(['Enabled', settings.srtEnabled], ['Address', settings.srtAddress])
  } else if (section === 'rtmp') {
    fields.push(['RTMP', settings.rtmpEnabled], ['RTMP Address', settings.rtmpAddress], ['RTMPS', settings.rtmpsEnabled])
  } else if (section === 'hls') {
    fields.push(['Enabled', settings.hlsEnabled], ['Address', settings.hlsAddress], ['Variant', settings.hlsVariant])
  } else if (section === 'webrtc') {
    fields.push(['Enabled', settings.webrtcEnabled], ['Address', settings.webrtcAddress])
  } else if (section === 'rtsp') {
    fields.push(['Enabled', settings.rtspEnabled], ['Address', settings.rtspAddress])
  } else {
    fields.push(['API', settings.apiEnabled], ['Metrics', settings.metricsEnabled], ['Playback', settings.playbackEnabled])
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">
          <Link href="/protocols" className="hover:underline">Protocols</Link> / {section}
        </p>
        <h1 className="text-3xl font-bold">{titles[section] || section}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current values</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {fields.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">{label}</span>
              {typeof value === 'boolean' ? (
                <Badge variant={value ? 'success' : 'muted'}>{value ? 'On' : 'Off'}</Badge>
              ) : (
                <span className="font-mono">{String(value ?? '—')}</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
