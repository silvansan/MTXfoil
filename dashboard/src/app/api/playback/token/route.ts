import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { requireApiPermission } from '@/lib/api-auth'
import { getPlaybackTokenSecret, issuePlaybackToken } from '@/lib/playback-token'
import { canIssuePlaybackToken } from '@/lib/permissions'

async function issueTokenForSlug(slug: string) {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'streams',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const stream = result.docs[0]
  if (!stream) {
    return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
  }
  if (!stream.playbackEnabled) {
    return NextResponse.json({ error: 'Playback disabled for this stream' }, { status: 403 })
  }
  if (stream.authMode !== 'token') {
    return NextResponse.json({ error: 'Stream does not use token playback auth' }, { status: 400 })
  }

  const exp = Math.floor(Date.now() / 1000) + 3600
  const token = issuePlaybackToken({ slug, exp }, getPlaybackTokenSecret())

  return NextResponse.json({
    slug,
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
    playerUrl: `/player/${slug}?token=${encodeURIComponent(token)}`,
  })
}

export async function GET(req: NextRequest) {
  const auth = await requireApiPermission(canIssuePlaybackToken)
  if (auth instanceof NextResponse) return auth

  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  return issueTokenForSlug(slug)
}

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission(canIssuePlaybackToken)
  if (auth instanceof NextResponse) return auth

  let slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    try {
      const body = (await req.json()) as { slug?: string }
      slug = body.slug ?? null
    } catch {
      slug = null
    }
  }

  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  return issueTokenForSlug(slug)
}
