'use client'

import Link from 'next/link'

import { CopyButton } from '@/components/operator/copy-button'
import { StatusBadge } from '@/components/operator/status-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { StreamStatus } from '@/lib/mediamtx/paths'

type StreamCardProps = {
  stream: {
    id: string
    name: string
    slug: string
    recordingEnabled?: boolean | null
  }
  status?: StreamStatus | null
  urls?: {
    srtPublish: string
    hlsPlayback: string
  }
}

export function StreamCard({ stream, status, urls }: StreamCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>
            <Link href={`/streams/${stream.slug}`} className="hover:underline">
              {stream.name}
            </Link>
          </CardTitle>
          <CardDescription>{stream.slug}</CardDescription>
        </div>
        <StatusBadge ready={Boolean(status?.ready)} recording={stream.recordingEnabled || status?.recording} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2 text-zinc-400">
          <div>Readers: {status?.readerCount ?? 0}</div>
          <div>Source: {status?.sourceType ?? '—'}</div>
          <div>Received: {formatBytes(status?.bytesReceived)}</div>
          <div>Sent: {formatBytes(status?.bytesSent)}</div>
        </div>
        {urls && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-md bg-zinc-950 p-2 font-mono text-xs">
              <span className="truncate">{urls.srtPublish}</span>
              <CopyButton value={urls.srtPublish} label="Copy SRT publish URL" />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-md bg-zinc-950 p-2 font-mono text-xs">
              <span className="truncate">{urls.hlsPlayback}</span>
              <CopyButton value={urls.hlsPlayback} label="Copy HLS playback URL" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
