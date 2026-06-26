import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { getApiUser, forbiddenResponse, unauthorizedResponse } from '@/lib/api-auth'
import { canManageStreams } from '@/lib/permissions'

const SOURCE_TYPES = ['publisher', 'proxy', 'redirect', 'test'] as const
const PROTOCOLS = ['srt', 'rtmp', 'rtsp', 'hls', 'webrtc'] as const
const INGEST_PROTOCOLS = ['srt', 'rtmp', 'rtmps', 'rtsp', 'webrtc'] as const
const AUTH_MODES = ['public', 'unlisted', 'password', 'token', 'internal', 'external', 'jwt'] as const

type Body = {
  name?: unknown
  slug?: unknown
  event?: unknown
  sourceType?: unknown
  sourceUrl?: unknown
  ingestProtocol?: unknown
  enabledProtocols?: unknown
  recordingEnabled?: unknown
  playbackEnabled?: unknown
  authMode?: unknown
  publishPassword?: unknown
  readPassword?: unknown
  notes?: unknown
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  const str = asString(value)
  return (allowed as readonly string[]).includes(str) ? (str as T[number]) : fallback
}

export async function POST(req: NextRequest) {
  // Enforce RBAC up front for a clean 401/403 (mirrors Streams.access.create).
  const user = await getApiUser()
  if (!user) return unauthorizedResponse()
  if (!canManageStreams(user)) return forbiddenResponse()

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = asString(body.name)
  const slug = asString(body.slug)
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!slug) return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  if (!/^[a-z0-9][a-z0-9-_/]*$/.test(slug)) {
    return NextResponse.json(
      { error: 'Slug may only contain lowercase letters, numbers, dashes, underscores and slashes' },
      { status: 400 },
    )
  }

  const protocolsRaw = Array.isArray(body.enabledProtocols) ? body.enabledProtocols : []
  const enabledProtocols = PROTOCOLS.filter((p) => protocolsRaw.map(asString).includes(p))

  const data: Record<string, unknown> = {
    name,
    slug,
    sourceType: oneOf(body.sourceType, SOURCE_TYPES, 'publisher'),
    ingestProtocol: oneOf(body.ingestProtocol, INGEST_PROTOCOLS, 'srt'),
    enabledProtocols: enabledProtocols.length ? enabledProtocols : ['srt', 'rtmp', 'hls', 'webrtc', 'rtsp'],
    recordingEnabled: body.recordingEnabled === true,
    playbackEnabled: body.playbackEnabled !== false,
    authMode: oneOf(body.authMode, AUTH_MODES, 'internal'),
    enabled: true,
  }

  const sourceUrl = asString(body.sourceUrl)
  if (sourceUrl) data.sourceUrl = sourceUrl

  const eventId = asString(body.event)
  if (eventId) data.event = eventId

  if (data.authMode === 'password') {
    const publishPassword = asString(body.publishPassword)
    const readPassword = asString(body.readPassword)
    if (publishPassword) data.publishPassword = publishPassword
    if (readPassword) data.readPassword = readPassword
  }

  const notes = asString(body.notes)
  if (notes) data.notes = notes

  try {
    const payload = await getPayload({ config })
    // overrideAccess: false + user re-runs collection access.create RBAC; the
    // Streams afterChange hook (syncStreamToMediaMtx) fires on success, keeping
    // mediamtx.yml + the MediaMTX API in sync (AGENTS.md: dual config always).
    const created = await payload.create({
      collection: 'streams',
      data: data as Parameters<typeof payload.create>[0]['data'],
      user: user as Parameters<typeof payload.create>[0]['user'],
      overrideAccess: false,
    })

    return NextResponse.json({ id: created.id, slug: created.slug }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create stream'
    const isDuplicate = /unique|duplicate|already exists/i.test(message)
    return NextResponse.json(
      { error: isDuplicate ? 'A stream with this slug already exists' : message },
      { status: isDuplicate ? 409 : 400 },
    )
  }
}
