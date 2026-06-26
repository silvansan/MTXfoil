import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'

import { CodeSnippet } from '@/components/operator/code-snippet'
import { PlaybackPasswordGate } from '@/components/operator/playback-password-gate'
import { PlayerPreview } from '@/components/operator/player-preview'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buildPlayerPublicUrl } from '@/lib/dashboard-url'
import { loadUrlTemplates } from '@/lib/url-templates'
import { getMediaMtxInternalCredentials } from '@/lib/mediamtx/config'
import { checkStreamPlaybackAccess } from '@/lib/playback-access'
import { isOperator } from '@/lib/permissions'
import type { Stream } from '@/payload-types'
import {
  buildEmbedSnippet,
  buildStreamUrls,
  buildWhepUrl,
  buildWordPressShortcode,
} from '@/lib/mediamtx/urls'

/** Auth modes MediaMTX serves to anonymous viewers (no credentials required). */
const ANONYMOUS_READ_MODES = new Set(['public', 'unlisted'])

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string; password?: string }>
}

export default async function PlayerPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { token, password } = await searchParams
  const payload = await getPayload({ config })
  const { user: viewer } = await payload.auth({ headers: await headers() })
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

  const authMode = stream.authMode || 'internal'
  if (authMode === 'internal' && !isOperator(viewer)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Operator access required</h1>
        <p className="text-zinc-400">
          This stream uses internal authentication. Sign in with an operator account to preview playback.
        </p>
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

  const urlTemplates = await loadUrlTemplates(payload)
  const urls = buildStreamUrls(stream.slug, urlTemplates)

  // For non-public streams, the browser would otherwise be challenged by MediaMTX
  // with a native Basic Auth dialog. Since this page is already behind the
  // dashboard session, hand operators the internal read credentials so the player
  // can authenticate via an Authorization header (no popup). Viewers and public
  // streams never receive credentials.
  const anonymousReadable = ANONYMOUS_READ_MODES.has(stream.authMode || 'internal')
  let playerAuthHeader: string | undefined
  if (!anonymousReadable && isOperator(viewer)) {
    const { user: mtxUser, pass: mtxPass } = getMediaMtxInternalCredentials()
    playerAuthHeader = `Basic ${Buffer.from(`${mtxUser}:${mtxPass}`).toString('base64')}`
  }

  const absolutePlayerUrl = buildPlayerPublicUrl(stream.slug, token)
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

      <PlayerPreview hlsSrc={urls.hlsPlayback} whepUrl={whepUrl} authHeader={playerAuthHeader} />

      <Card>
        <CardHeader>
          <CardTitle>Embed snippet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CodeSnippet value={embed} copyLabel="Copy embed" />
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
            Paste into a post or page after installing the{' '}
            <a
              href="https://github.com/silvansan/MTXfoil/tree/main/deploy/wordpress/mtxfoil-player"
              className="text-emerald-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              MTXfoil Player plugin
            </a>{' '}
            (<code>deploy/wordpress/mtxfoil-player/</code> — upload to <code>wp-content/plugins</code> or install
            the zip). For token-gated streams, add <code>token=&quot;...&quot;</code> to the shortcode.
          </p>
          <CodeSnippet value={wpShortcode} copyLabel="Copy shortcode" />
        </CardContent>
      </Card>
    </div>
  )
}
