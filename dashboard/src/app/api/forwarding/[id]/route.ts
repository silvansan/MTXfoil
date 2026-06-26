import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { forbiddenResponse, getApiUser, unauthorizedResponse } from '@/lib/api-auth'
import { enqueueForwardingJob } from '@/lib/queue'
import { canManageForwarding, isAdmin } from '@/lib/permissions'
import type { ForwardingJob } from '@/payload-types'

const JOB_TYPES = ['srt-push', 'rtmp-push', 'hls-pull'] as const

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
  if (!canManageForwarding(user)) return forbiddenResponse()

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data: Partial<ForwardingJob> = {}
  if ('name' in body) {
    const name = asString(body.name)
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    data.name = name
  }
  if ('stream' in body) {
    const stream = asString(body.stream)
    if (stream) data.stream = Number(stream)
  }
  if ('type' in body) {
    const v = oneOf(body.type, JOB_TYPES)
    if (v) data.type = v
  }
  if ('destinationUrl' in body) {
    const url = asString(body.destinationUrl)
    if (!url) return NextResponse.json({ error: 'Destination URL cannot be empty' }, { status: 400 })
    data.destinationUrl = url
  }
  if ('enabled' in body) data.enabled = body.enabled === true
  if ('autoStart' in body) data.autoStart = body.autoStart !== false
  if ('restartOnFailure' in body) data.restartOnFailure = body.restartOnFailure !== false
  if ('notes' in body) data.notes = asString(body.notes) || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })
    const updated = await payload.update({
      collection: 'forwarding-jobs',
      id,
      data,
      user: user as Parameters<typeof payload.update>[0]['user'],
      overrideAccess: false,
    })
    return NextResponse.json({ id: updated.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update forwarding job'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getApiUser()
  if (!user) return unauthorizedResponse()
  if (!isAdmin(user)) return forbiddenResponse()

  const { id } = await params

  try {
    // Stop any running worker job before removing the record.
    await enqueueForwardingJob('stop', id)
    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'forwarding-jobs',
      id,
      user: user as Parameters<typeof payload.delete>[0]['user'],
      overrideAccess: false,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete forwarding job'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
