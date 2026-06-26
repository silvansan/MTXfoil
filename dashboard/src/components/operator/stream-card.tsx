'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { ClickableRow } from '@/components/operator/clickable-row'
import { CopyButton } from '@/components/operator/copy-button'
import { StatusBadge } from '@/components/operator/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import type { StreamStatus } from '@/lib/mediamtx/paths'
import { cn } from '@/lib/utils'

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
  const [urlsOpen, setUrlsOpen] = useState(false)

  return (
    <Card className="overflow-hidden">
      <ClickableRow href={`/streams/${stream.slug}`} ariaLabel={`Open stream ${stream.name}`}>
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/streams/${stream.slug}`}
                className="truncate font-medium hover:underline"
                data-no-row-nav
              >
                {stream.name}
              </Link>
              <StatusBadge
                ready={Boolean(status?.ready)}
                recording={stream.recordingEnabled || status?.recording}
              />
            </div>
            <p className="truncate text-xs text-muted">{stream.slug}</p>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted">
            <span>
              <span className="text-subtle">Readers</span>{' '}
              <span className="font-mono text-value">{status?.readerCount ?? 0}</span>
            </span>
            {urls && (
              <button
                type="button"
                data-no-row-nav
                className="interactive-chip"
                onClick={() => setUrlsOpen((v) => !v)}
                aria-expanded={urlsOpen}
              >
                {urlsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                URLs
              </button>
            )}
          </div>
        </CardContent>
      </ClickableRow>

      {urls && urlsOpen && (
        <CardContent className="space-y-1.5 border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
          <UrlRow label="SRT" value={urls.srtPublish} copyLabel="Copy SRT publish URL" />
          <UrlRow label="HLS" value={urls.hlsPlayback} copyLabel="Copy HLS playback URL" />
        </CardContent>
      )}
    </Card>
  )
}

function UrlRow({
  label,
  value,
  copyLabel,
}: {
  label: string
  value: string
  copyLabel: string
}) {
  return (
    <div className={cn('bg-code flex items-center gap-2 rounded-md px-2 py-1 font-mono text-xs')}>
      <span className="shrink-0 text-subtle">{label}</span>
      <span className="min-w-0 flex-1 truncate">{value}</span>
      <CopyButton value={value} label={copyLabel} />
    </div>
  )
}
