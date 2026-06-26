import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { requireApiPermission } from '@/lib/api-auth'
import { getPlaybackTokenSecret, issuePlaybackToken } from '@/lib/playback-token'
import { canIssuePlaybackToken } from '@/lib/permissions'
import {
  PLAYBACK_TOKEN_RATE_LIMIT,
  getClientIp,
  rateLimitResponse,
} from '@/lib/rate-limit'
import { checkRateLimitAsync } from '@/lib/rate-limit-redis'

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

async function enforcePlaybackTokenRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIp(req)
  const allowed = await checkRateLimitAsync(
    `playback-token:${ip}`,
    PLAYBACK_TOKEN_RATE_LIMIT.limit,
    PLAYBACK_TOKEN_RATE_LIMIT.windowMs,
  )
  if (!allowed) return rateLimitResponse()
  return null
}

export async function GET(req: NextRequest) {
  const limited = await enforcePlaybackTokenRateLimit(req)
  if (limited) return limited

  const auth = await requireApiPermission(canIssuePlaybackToken)
  if (auth instanceof NextResponse) return auth

  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  return issueTokenForSlug(slug)
}

export async function POST(req: NextRequest) {
  const limited = await enforcePlaybackTokenRateLimit(req)
  if (limited) return limited

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
