import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { forbiddenResponse, getApiUser, unauthorizedResponse } from '@/lib/api-auth'
import { isAdmin, isOperator } from '@/lib/permissions'
import type { Event } from '@/payload-types'

const STATUSES = ['draft', 'active', 'archived'] as const

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
  if (!isOperator(user)) return forbiddenResponse()

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data: Partial<Event> = {}
  if ('title' in body) {
    const title = asString(body.title)
    if (!title) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    data.title = title
  }
  if ('slug' in body) {
    const slug = asString(body.slug)
    if (!slug) return NextResponse.json({ error: 'Slug cannot be empty' }, { status: 400 })
    data.slug = slug
  }
  if ('status' in body) {
    const v = oneOf(body.status, STATUSES)
    if (v) data.status = v
  }
  if ('date' in body) {
    const date = asString(body.date)
    data.date = date ? new Date(date).toISOString() : null
  }
  if ('description' in body) data.description = asString(body.description) || null
  if ('defaultDomain' in body) data.defaultDomain = asString(body.defaultDomain) || null
  if ('notes' in body) data.notes = asString(body.notes) || null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })
    const updated = await payload.update({
      collection: 'events',
      id,
      data,
      user: user as Parameters<typeof payload.update>[0]['user'],
      overrideAccess: false,
    })
    return NextResponse.json({ id: updated.id, slug: updated.slug })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update event'
    const isDuplicate = /unique|duplicate|already exists/i.test(message)
    return NextResponse.json(
      { error: isDuplicate ? 'An event with this slug already exists' : message },
      { status: isDuplicate ? 409 : 400 },
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getApiUser()
  if (!user) return unauthorizedResponse()
  if (!isAdmin(user)) return forbiddenResponse()

  const { id } = await params

  try {
    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'events',
      id,
      user: user as Parameters<typeof payload.delete>[0]['user'],
      overrideAccess: false,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete event'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
