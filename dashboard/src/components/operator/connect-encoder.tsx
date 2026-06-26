import Link from 'next/link'

import { CopyButton } from '@/components/operator/copy-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getIngestConnection,
  INGEST_PROTOCOLS,
  type IngestConnection,
  type IngestProtocol,
} from '@/lib/mediamtx/urls'

function ConnectionBlock({
  connection,
  primary,
  slug,
}: {
  connection: IngestConnection
  primary: boolean
  slug: string
}) {
  return (
    <div
      className={
        'rounded-lg border p-4 ' +
        (primary
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-zinc-800 bg-zinc-950/40')
      }
    >
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-zinc-100">{connection.label}</h3>
        {primary && (
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
            Primary
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-500">{connection.note}</p>
      {connection.protocol === 'webrtc' && (
        <p className="mt-2 text-xs text-zinc-500">
          Or{' '}
          <Link href={`/streams/${slug}/whip`} className="text-emerald-400 hover:underline">
            publish from this browser (WHIP)
          </Link>
          .
        </p>
      )}
      <div className="mt-3 space-y-2">
        {connection.fields.map((field) => (
          <div
            key={field.label}
            className="flex flex-col gap-2 rounded-md bg-zinc-950 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-zinc-500">{field.label}</p>
              {field.label === 'Browser publish' ? (
                <Link href={field.value} className="font-mono text-sm text-emerald-400 hover:underline">
                  {field.value}
                </Link>
              ) : (
                <p className="font-mono text-sm break-all text-zinc-100">{field.value}</p>
              )}
              <p className="mt-0.5 text-xs text-zinc-600">{field.hint}</p>
            </div>
            <CopyButton value={field.value} label={`Copy ${field.label.toLowerCase()}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * "Connect your encoder" panel: breaks the publish connection into the discrete
 * fields encoders ask for, each independently copyable. The stream's primary
 * `ingestProtocol` is highlighted; the remaining push protocols are listed as
 * alternatives since MediaMTX accepts any enabled publish protocol on the path.
 */
export function ConnectEncoder({
  slug,
  ingestProtocol,
}: {
  slug: string
  ingestProtocol: IngestProtocol
}) {
  const order: IngestProtocol[] = [
    ingestProtocol,
    ...INGEST_PROTOCOLS.filter((p) => p !== ingestProtocol),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect your encoder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-400">
          Point your encoder at MediaMTX using the fields below. Each value has its own copy button —
          paste them into the matching boxes in OBS, your hardware encoder, or ffmpeg.
        </p>
        {order.map((protocol) => (
          <ConnectionBlock
            key={protocol}
            connection={getIngestConnection(slug, protocol)}
            primary={protocol === ingestProtocol}
            slug={slug}
          />
        ))}
      </CardContent>
    </Card>
  )
}
