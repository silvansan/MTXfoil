import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'

import { CopyButton } from '@/components/operator/copy-button'
import { PlaybackPasswordGate } from '@/components/operator/playback-password-gate'
import { PlayerPreview } from '@/components/operator/player-preview'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { checkStreamPlaybackAccess } from '@/lib/playback-access'
import type { Stream } from '@/payload-types'
import {
  buildEmbedSnippet,
  buildStreamUrls,
  buildWhepUrl,
  buildWordPressShortcode,
} from '@/lib/mediamtx/urls'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string; password?: string }>
}

export default async function PlayerPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { token, password } = await searchParams
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'streams',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const stream = result.docs[0] as Stream
  if (!stream) notFound()

  if (!stream.playbackEnabled) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Playback disabled</h1>
        <p className="text-zinc-400">Playback is disabled for this stream.</p>
      </div>
    )
  }

  const access = checkStreamPlaybackAccess(stream, { token, password })
  if (!access.allowed) {
    if (access.reason === 'password') {
      return (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Password required</h1>
          <p className="text-zinc-400">Enter the playback password to watch this stream.</p>
          <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
            <PlaybackPasswordGate slug={stream.slug} />
          </Suspense>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Playback token required</h1>
        <p className="text-zinc-400">
          This stream requires a valid playback token. Operators can issue one from{' '}
          <code>/api/playback/token?slug={stream.slug}</code>.
        </p>
      </div>
    )
  }

  const urls = buildStreamUrls(stream.slug)
  const playerUrl = `/player/${stream.slug}${token ? `?token=${encodeURIComponent(token)}` : ''}`
  const absolutePlayerUrl = `${
    process.env.PUBLIC_STREAM_DOMAIN ? `https://${process.env.PUBLIC_STREAM_DOMAIN}` : 'http://localhost:3000'
  }${playerUrl}`
  const embed = buildEmbedSnippet(absolutePlayerUrl)
  const wpShortcode = buildWordPressShortcode(absolutePlayerUrl)
  const whepUrl = buildWhepUrl(urls.webrtcPlayback)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">
          <Link href={`/streams/${stream.slug}`} className="hover:underline">{stream.name}</Link>
        </p>
        <h1 className="text-3xl font-bold">Player</h1>
      </div>

      <PlayerPreview hlsSrc={urls.hlsPlayback} whepUrl={whepUrl} />

      <Card>
        <CardHeader>
          <CardTitle>Embed snippet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 text-xs">{embed}</pre>
          <CopyButton value={embed} label="Copy embed" />
          {stream.authMode === 'token' && (
            <p className="text-sm text-zinc-500">
              For token-gated playback, append <code>?token=...</code> from an operator-issued token.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WordPress shortcode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-500">
            Paste into a post or page. Requires an <code>mtxfoil_player</code> shortcode handler (plugin stub).
          </p>
          <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 text-xs">{wpShortcode}</pre>
          <CopyButton value={wpShortcode} label="Copy shortcode" />
        </CardContent>
      </Card>
    </div>
  )
}
