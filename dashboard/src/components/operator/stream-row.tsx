'use client'

import { Pencil } from 'lucide-react'
import Link from 'next/link'

import { DeleteStreamButton } from '@/components/operator/delete-stream-button'
import { ShareButton } from '@/components/operator/share-button'
import { StatusBadge } from '@/components/operator/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type StreamRowData = {
  id: string
  name: string
  slug: string
  authMode?: string | null
  recordingEnabled?: boolean | null
  ready: boolean
  readerCount: number
}

export function StreamRow({
  stream,
  canManage,
  canDelete,
}: {
  stream: StreamRowData
  canManage: boolean
  canDelete: boolean
}) {
  return (
    <Card className="transition-colors hover:border-zinc-600">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>
          <Link
            href={`/streams/${stream.slug}`}
            className="hover:underline"
          >
            {stream.name}
          </Link>
        </CardTitle>
        <StatusBadge ready={stream.ready} recording={stream.recordingEnabled || false} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm text-zinc-400 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p>Slug: {stream.slug}</p>
          <p>Readers: {stream.readerCount}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/streams/${stream.slug}/edit`}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
          )}
          <ShareButton slug={stream.slug} authMode={stream.authMode} />
          {canDelete && <DeleteStreamButton id={stream.id} name={stream.name} />}
        </div>
      </CardContent>
    </Card>
  )
}
