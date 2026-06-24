import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { CopyButton } from '@/components/operator/copy-button'
import { StatusBadge } from '@/components/operator/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStreamStatus } from '@/lib/mediamtx/paths'
import { buildStreamUrls } from '@/lib/mediamtx/urls'

type Props = { params: Promise<{ slug: string }> }

export default async function StreamDetailPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'streams',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const stream = result.docs[0]
  if (!stream) notFound()

  const urls = buildStreamUrls(stream.slug)
  let status = null
  try {
    status = await getStreamStatus(stream.slug, Boolean(stream.recordingEnabled))
  } catch {
    status = null
  }

  const urlRows = [
    ['SRT Publish', urls.srtPublish],
    ['SRT Read', urls.srtRead],
    ['RTMP Publish', urls.rtmpPublish],
    ['RTMPS Publish', urls.rtmpsPublish],
    ['RTSP Playback', urls.rtspPlayback],
    ['HLS Playback', urls.hlsPlayback],
    ['WebRTC', urls.webrtcPlayback],
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            <Link href="/streams" className="hover:underline">Streams</Link> / {stream.slug}
          </p>
          <h1 className="text-3xl font-bold">{stream.name}</h1>
        </div>
        <StatusBadge ready={Boolean(status?.ready)} recording={stream.recordingEnabled || false} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-400">
            <p>Ready: {status?.ready ? 'Yes' : 'No'}</p>
            <p>Source: {status?.sourceType ?? '—'}</p>
            <p>Readers: {status?.readerCount ?? 0}</p>
            <p>Recording: {stream.recordingEnabled ? 'Enabled' : 'Disabled'}</p>
            <p>Auth: {stream.authMode}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link href={`/player/${stream.slug}`} className="text-emerald-400 underline">
              Open player preview
            </Link>
            <p className="text-zinc-500">Edit stream in <Link href="/admin/collections/streams" className="underline">Admin</Link></p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingest & Playback URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {urlRows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-2 rounded-md bg-zinc-950 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
                <p className="font-mono text-sm break-all">{value}</p>
              </div>
              <CopyButton value={value} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
