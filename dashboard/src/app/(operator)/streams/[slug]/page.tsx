import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { ConnectEncoder } from '@/components/operator/connect-encoder'
import { CopyButton } from '@/components/operator/copy-button'
import { DeleteStreamButton } from '@/components/operator/delete-stream-button'
import { ShareButton } from '@/components/operator/share-button'
import { StatusBadge } from '@/components/operator/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStreamStatus } from '@/lib/mediamtx/paths'
import { canManageStreams, isAdmin } from '@/lib/permissions'
import { loadUrlTemplates } from '@/lib/url-templates'
import { urlRowClass, urlRowPrimaryClass, urlRowValueClass } from '@/lib/operator-ui'
import {
  buildStreamUrls,
  getAvailablePlaybackProtocols,
  getIngestAvailabilityFromSettings,
  getPlaybackUrl,
  PLAYBACK_PROTOCOL_LABELS,
  type IngestProtocol,
  type PlaybackProtocol,
} from '@/lib/mediamtx/urls'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ created?: string }>
}

type UrlRow = { label: string; value: string; primary?: boolean }

function UrlList({ rows }: { rows: UrlRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-subtle">None enabled.</p>
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className={row.primary ? urlRowPrimaryClass : urlRowClass}
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-subtle">
              {row.label}
              {row.primary ? ' · primary' : ''}
            </p>
            <p className={urlRowValueClass}>{row.value}</p>
          </div>
          <CopyButton value={row.value} label={`Copy ${row.label.toLowerCase()}`} />
        </div>
      ))}
    </div>
  )
}

export default async function StreamDetailPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { created } = await searchParams
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const canManage = canManageStreams(user)
  const canDelete = isAdmin(user)
  const result = await payload.find({
    collection: 'streams',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const stream = result.docs[0]
  if (!stream) notFound()

  const urlTemplates = await loadUrlTemplates(payload)
  const urls = buildStreamUrls(stream.slug, urlTemplates)
  const protocolSettings = await payload.findGlobal({ slug: 'protocol-settings' })
  const ingestAvailability = getIngestAvailabilityFromSettings(protocolSettings)
  let status = null
  try {
    status = await getStreamStatus(stream.slug, Boolean(stream.recordingEnabled))
  } catch {
    status = null
  }

  const sourceType = stream.sourceType || 'publisher'
  const isPublisher = sourceType === 'publisher'
  const ingestProtocol = (stream.ingestProtocol || 'srt') as IngestProtocol

  // Playback section: stream-enabled protocols that are also globally enabled.
  const enabled = (stream.enabledProtocols || []) as string[]
  const playbackRows: UrlRow[] = (stream.playbackEnabled ?? true)
    ? getAvailablePlaybackProtocols(enabled, protocolSettings).map((p: PlaybackProtocol) => ({
        label: `${PLAYBACK_PROTOCOL_LABELS[p]} playback`,
        value: getPlaybackUrl(urls, p),
      }))
    : []

  return (
    <div className="space-y-6">
      {created && isPublisher && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Stream created. Connect your encoder using the fields below to go live.
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-subtle">
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
          <CardContent className="space-y-2 text-sm text-muted">
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
          <CardContent className="space-y-3 text-sm">
            <Link href={`/player/${stream.slug}`} className="block text-emerald-400 underline">
              Open player preview
            </Link>
            {isPublisher && (
              <Link href={`/streams/${stream.slug}/whip`} className="block text-emerald-400 underline">
                Browser publish (WHIP)
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {canManage && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/streams/${stream.slug}/edit`}>Edit</Link>
                </Button>
              )}
              <ShareButton slug={stream.slug} authMode={stream.authMode} />
              {canDelete && (
                <DeleteStreamButton id={String(stream.id)} name={stream.name} redirectTo="/streams" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {isPublisher ? (
        <ConnectEncoder
          slug={stream.slug}
          ingestProtocol={ingestProtocol}
          availability={ingestAvailability}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ingest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1 text-sm text-muted">
              <p>
                Source type: <span className="text-value">{sourceType}</span>
              </p>
              <p className="break-all">
                Pull source:{' '}
                <span className="font-mono text-value">{stream.sourceUrl || '—'}</span>
              </p>
              <p className="text-subtle">
                MediaMTX pulls this source on demand; there is no push ingest URL.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Playback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stream.playbackEnabled ?? true ? (
            <UrlList rows={playbackRows} />
          ) : (
            <p className="text-sm text-subtle">Playback is disabled for this stream.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
