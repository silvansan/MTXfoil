import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { Stream } from '@/payload-types'
import { getMediaMtxInternalCredentials } from '@/lib/mediamtx/config'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { checkStreamPlaybackAccess } from '@/lib/playback-access'

export const dynamic = 'force-dynamic'

/**
 * Built-in MediaMTX "External HTTP" auth backend.
 *
 * When the global auth method (ProtocolSettings → Authentication) is set to
 * "External HTTP" and left at the default endpoint, MediaMTX POSTs every
 * publish/read/playback authorization request here. We authorize based on each
 * stream's per-stream `authMode`, mirroring how internal mode behaves:
 *
 *  - the internal superuser (MEDIAMTX_INTERNAL_USER/PASS) is always allowed,
 *    so dashboard API patches, status polling and the operator preview keep
 *    working;
 *  - control-plane actions (api/metrics/pprof) are excluded at the MediaMTX
 *    level, but are also rejected here unless the internal user is used;
 *  - publish requires the internal user, or — for password streams — the
 *    stream slug + publish password;
 *  - read/playback honors public/unlisted (anonymous), password and token
 *    (HMAC playback token via query string) modes.
 *
 * MediaMTX treats any 2xx response as "allow" and any other status as "deny".
 */

type MtxAuthRequest = {
  user?: string
  password?: string
  token?: string
  ip?: string
  action?: 'publish' | 'read' | 'playback' | 'api' | 'metrics' | 'pprof'
  path?: string
  protocol?: string
  id?: string
  query?: string
}

const ALLOW = () => new NextResponse(null, { status: 200 })
const DENY = () => new NextResponse(null, { status: 401 })

function tokenFromQuery(query?: string, fallback?: string): string | undefined {
  if (query) {
    try {
      const token = new URLSearchParams(query).get('token')
      if (token) return token
    } catch {
      // ignore malformed query
    }
  }
  return fallback || undefined
}

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(`mediamtx-auth:${clientIp}`, 120, 60_000)) {
    return rateLimitResponse()
  }

  let body: MtxAuthRequest
  try {
    body = (await req.json()) as MtxAuthRequest
  } catch {
    return DENY()
  }

  const action = body.action
  const path = body.path || ''
  const user = body.user || ''
  const password = body.password || ''

  // Internal superuser: full access (dashboard control plane + operator preview).
  const internal = getMediaMtxInternalCredentials()
  if (user === internal.user && password === internal.pass) {
    return ALLOW()
  }

  // Control-plane actions are only ever for the internal user.
  if (action === 'api' || action === 'metrics' || action === 'pprof') {
    return DENY()
  }

  if (!path) return DENY()

  let stream: Stream | null = null
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'streams',
      where: { slug: { equals: path } },
      limit: 1,
      depth: 0,
    })
    stream = (result.docs[0] as Stream) || null
  } catch {
    // On lookup failure, fail closed.
    return DENY()
  }

  if (!stream || !stream.enabled) return DENY()

  const authMode = stream.authMode || 'internal'

  if (action === 'publish') {
    // Internal user already allowed above. Password streams may publish with
    // the stream slug + configured publish password.
    if (authMode === 'password' && user === stream.slug && password === (stream.publishPassword || '')) {
      return ALLOW()
    }
    return DENY()
  }

  // read / playback
  switch (authMode) {
    case 'public':
    case 'unlisted':
      return ALLOW()
    case 'password':
      if (user === stream.slug && password === (stream.readPassword || '')) return ALLOW()
      return DENY()
    case 'token': {
      const token = tokenFromQuery(body.query, body.token)
      const access = checkStreamPlaybackAccess(stream, { token })
      return access.allowed ? ALLOW() : DENY()
    }
    case 'internal':
    default:
      // Only the internal user (handled above) may read internal streams.
      return DENY()
  }
}
