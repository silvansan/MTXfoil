import { NextRequest, NextResponse } from 'next/server'

import { getPlaybackTokenSecret, issuePlaybackToken } from '@/lib/playback-token'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
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
