import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { forbiddenResponse, getApiUser, unauthorizedResponse } from '@/lib/api-auth'
import { canManageForwarding } from '@/lib/permissions'

const JOB_TYPES = ['srt-push', 'rtmp-push', 'hls-pull'] as const

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  const str = asString(value)
  return (allowed as readonly string[]).includes(str) ? (str as T[number]) : fallback
}

export async function POST(req: NextRequest) {
  const user = await getApiUser()
  if (!user) return unauthorizedResponse()
  if (!canManageForwarding(user)) return forbiddenResponse()

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = asString(body.name)
  const stream = asString(body.stream)
  const destinationUrl = asString(body.destinationUrl)
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!stream) return NextResponse.json({ error: 'Stream is required' }, { status: 400 })
  if (!destinationUrl) return NextResponse.json({ error: 'Destination URL is required' }, { status: 400 })

  const data: Record<string, unknown> = {
    name,
    stream,
    type: oneOf(body.type, JOB_TYPES, 'srt-push'),
    destinationUrl,
    enabled: body.enabled === true,
    autoStart: body.autoStart !== false,
    restartOnFailure: body.restartOnFailure !== false,
  }
  const notes = asString(body.notes)
  if (notes) data.notes = notes

  try {
    const payload = await getPayload({ config })
    const created = await payload.create({
      collection: 'forwarding-jobs',
      data: data as Parameters<typeof payload.create>[0]['data'],
      user: user as Parameters<typeof payload.create>[0]['user'],
      overrideAccess: false,
    })
    return NextResponse.json({ id: created.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create forwarding job'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
