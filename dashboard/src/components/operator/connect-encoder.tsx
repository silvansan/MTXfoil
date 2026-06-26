'use client'

import Link from 'next/link'

import { CopyButton } from '@/components/operator/copy-button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getAvailableIngestProtocols,
  getIngestConnection,
  type IngestConnection,
  type IngestProtocol,
  type IngestProtocolAvailability,
} from '@/lib/mediamtx/urls'

function ConnectionFields({
  connection,
  slug,
}: {
  connection: IngestConnection
  slug: string
}) {
  return (
    <>
      <p className="text-xs text-muted">{connection.note}</p>
      {connection.protocol === 'webrtc' && (
        <p className="mt-2 text-xs text-muted">
          Or{' '}
          <Link href={`/streams/${slug}/whip`} className="text-emerald-600 hover:underline dark:text-emerald-400">
            publish from this browser (WHIP)
          </Link>
          .
        </p>
      )}
      <div className="mt-3 space-y-2">
        {connection.fields.map((field) => (
          <div
            key={field.label}
            className="flex flex-col gap-2 rounded-md bg-code p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted">{field.label}</p>
              {field.label === 'Browser publish' ? (
                <Link
                  href={field.value}
                  className="font-mono text-sm text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  {field.value}
                </Link>
              ) : (
                <p className="font-mono text-sm break-all">{field.value}</p>
              )}
              <p className="mt-0.5 text-xs text-muted">{field.hint}</p>
            </div>
            <CopyButton value={field.value} label={`Copy ${field.label.toLowerCase()}`} />
          </div>
        ))}
      </div>
    </>
  )
}

/**
 * "Connect your encoder" panel: breaks the publish connection into the discrete
 * fields encoders ask for, each independently copyable. Only globally-enabled
 * ingest protocols are shown; the stream primary is expanded by default.
 */
export function ConnectEncoder({
  slug,
  ingestProtocol,
  availability,
}: {
  slug: string
  ingestProtocol: IngestProtocol
  availability: IngestProtocolAvailability
}) {
  const protocols = getAvailableIngestProtocols(ingestProtocol, availability)
  const defaultOpen =
    protocols.includes(ingestProtocol) ? ingestProtocol : (protocols[0] ?? undefined)

  if (protocols.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect your encoder</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            No publish protocols are enabled. Enable SRT, RTMP, or another ingest protocol in{' '}
            <Link href="/protocols" className="text-emerald-600 hover:underline dark:text-emerald-400">
              Protocol settings
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect your encoder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted">
          Point your encoder at MediaMTX using the fields below. Each value has its own copy button —
          paste them into the matching boxes in OBS, your hardware encoder, or ffmpeg.
        </p>
        <Accordion type="single" collapsible defaultValue={defaultOpen} className="w-full">
          {protocols.map((protocol) => {
            const connection = getIngestConnection(slug, protocol)
            const primary = protocol === ingestProtocol

            return (
              <AccordionItem
                key={protocol}
                value={protocol}
                className={
                  primary
                    ? 'rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-4 dark:bg-emerald-500/10'
                    : 'rounded-lg border border-transparent px-4'
                }
              >
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{connection.label}</span>
                    {primary && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Primary
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ConnectionFields connection={connection} slug={slug} />
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </CardContent>
    </Card>
  )
}
