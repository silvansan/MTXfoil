import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { forbiddenResponse, getApiUser, unauthorizedResponse } from '@/lib/api-auth'
import { canManageStreams, isAdmin } from '@/lib/permissions'

const SOURCE_TYPES = ['publisher', 'proxy', 'redirect', 'test'] as const
const PROTOCOLS = ['srt', 'rtmp', 'rtsp', 'hls', 'webrtc'] as const
const INGEST_PROTOCOLS = ['srt', 'rtmp', 'rtmps', 'rtsp', 'webrtc'] as const
const AUTH_MODES = ['public', 'unlisted', 'password', 'token', 'internal', 'external', 'jwt'] as const

type Params = { params: Promise<{ id: string }> }

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T): T[number] | undefined {
  const str = asString(value)
  return (allowed as readonly string[]).includes(str) ? (str as T[number]) : undefined
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getApiUser()
  if (!user) return unauthorizedResponse()
  if (!canManageStreams(user)) return forbiddenResponse()

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Build a partial update from only the provided, validated fields. Slug is
  // intentionally not updatable here: it is the MediaMTX path identity.
  const data: Record<string, unknown> = {}

  if ('name' in body) {
    const name = asString(body.name)
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    data.name = name
  }
  if ('event' in body) data.event = asString(body.event) || null
  if ('sourceType' in body) {
    const v = oneOf(body.sourceType, SOURCE_TYPES)
    if (v) data.sourceType = v
  }
  if ('sourceUrl' in body) data.sourceUrl = asString(body.sourceUrl) || null
  if ('ingestProtocol' in body) {
    const v = oneOf(body.ingestProtocol, INGEST_PROTOCOLS)
    if (v) data.ingestProtocol = v
  }
  if ('enabledProtocols' in body && Array.isArray(body.enabledProtocols)) {
    data.enabledProtocols = PROTOCOLS.filter((p) =>
      (body.enabledProtocols as unknown[]).map(asString).includes(p),
    )
  }
  if ('authMode' in body) {
    const v = oneOf(body.authMode, AUTH_MODES)
    if (v) data.authMode = v
  }
  if ('publishPassword' in body) data.publishPassword = asString(body.publishPassword) || null
  if ('readPassword' in body) data.readPassword = asString(body.readPassword) || null
  if ('notes' in body) data.notes = asString(body.notes) || null
  if ('recordingEnabled' in body) data.recordingEnabled = body.recordingEnabled === true
  if ('playbackEnabled' in body) data.playbackEnabled = body.playbackEnabled !== false
  if ('enabled' in body) data.enabled = body.enabled !== false

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })
    const updated = await payload.update({
      collection: 'streams',
      id,
      data: data as Parameters<typeof payload.update>[0]['data'],
      user: user as Parameters<typeof payload.update>[0]['user'],
      overrideAccess: false,
    })
    return NextResponse.json({ id: updated.id, slug: updated.slug })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update stream'
    const isDuplicate = /unique|duplicate|already exists/i.test(message)
    return NextResponse.json(
      { error: isDuplicate ? 'A stream with this slug already exists' : message },
      { status: isDuplicate ? 409 : 400 },
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getApiUser()
  if (!user) return unauthorizedResponse()
  // Collection access: delete is admin+.
  if (!isAdmin(user)) return forbiddenResponse()

  const { id } = await params

  try {
    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'streams',
      id,
      user: user as Parameters<typeof payload.delete>[0]['user'],
      overrideAccess: false,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete stream'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
