import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { WhipPublisher } from '@/components/operator/whip-publisher'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardPublicUrl } from '@/lib/dashboard-url'
import { buildStreamUrls, buildWhipUrl } from '@/lib/mediamtx/urls'
import { getWhipAuthHeader } from '@/lib/publish-auth'
import { canManageStreams, isOperator } from '@/lib/permissions'
import { loadUrlTemplates } from '@/lib/url-templates'
import { inlineCodeClass } from '@/lib/operator-ui'
import type { Stream } from '@/payload-types'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function WhipPublishPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!isOperator(user)) {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/streams/${slug}/whip`)}`)
  }

  const result = await payload.find({
    collection: 'streams',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const stream = result.docs[0] as Stream | undefined
  if (!stream) notFound()

  const sourceType = stream.sourceType || 'publisher'
  if (sourceType !== 'publisher') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">WHIP publish unavailable</h1>
        <p className="text-muted">
          This stream pulls from an external source ({sourceType}). WHIP browser publish only applies to
          publisher paths.
        </p>
        <Link href={`/streams/${stream.slug}`} className="text-emerald-400 hover:underline">
          Back to stream
        </Link>
      </div>
    )
  }

  const urlTemplates = await loadUrlTemplates(payload)
  const urls = buildStreamUrls(stream.slug, urlTemplates)
  const whipUrl = buildWhipUrl(urls.webrtcPlayback)
  const authHeader = canManageStreams(user) ? getWhipAuthHeader(stream) : undefined
  const dashboardOrigin = getDashboardPublicUrl()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-subtle">
          <Link href="/streams" className="hover:underline">
            Streams
          </Link>{' '}
          /{' '}
          <Link href={`/streams/${stream.slug}`} className="hover:underline">
            {stream.slug}
          </Link>{' '}
          / WHIP
        </p>
        <h1 className="text-3xl font-bold">Browser publish (WHIP)</h1>
        <p className="mt-2 text-muted">
          Publish camera and microphone to <span className="font-mono text-value">{stream.slug}</span>{' '}
          via WebRTC WHIP. For external encoders, copy the WHIP URL below.
        </p>
      </div>

      <WhipPublisher whipUrl={whipUrl} authHeader={authHeader} />

      <Card>
        <CardHeader>
          <CardTitle>CORS &amp; reachability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted">
          <p>
            Browser publish calls MediaMTX directly at the WHIP URL. Ensure{' '}
            <code className={inlineCodeClass}>webrtcAllowOrigins</code> includes this dashboard origin (
            <code className={inlineCodeClass}>{dashboardOrigin}</code>) and that clients can reach WebRTC TCP{' '}
            8889 and UDP ICE 8189 on your media host.
          </p>
          <p>
            After going live, open{' '}
            <Link href={`/player/${stream.slug}`} className="text-emerald-400 hover:underline">
              player preview
            </Link>{' '}
            to verify WHEP playback.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
