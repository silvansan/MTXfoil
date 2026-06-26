import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { forbiddenResponse, getApiUser, unauthorizedResponse } from '@/lib/api-auth'
import { isOperator } from '@/lib/permissions'

const STATUSES = ['draft', 'active', 'archived'] as const

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
  if (!isOperator(user)) return forbiddenResponse()

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const title = asString(body.title)
  const slug = asString(body.slug)
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!slug) return NextResponse.json({ error: 'Slug is required' }, { status: 400 })

  const data: Record<string, unknown> = {
    title,
    slug,
    status: oneOf(body.status, STATUSES, 'draft'),
  }
  const date = asString(body.date)
  if (date) data.date = new Date(date).toISOString()
  const description = asString(body.description)
  if (description) data.description = description
  const defaultDomain = asString(body.defaultDomain)
  if (defaultDomain) data.defaultDomain = defaultDomain
  const notes = asString(body.notes)
  if (notes) data.notes = notes

  try {
    const payload = await getPayload({ config })
    const created = await payload.create({
      collection: 'events',
      data: data as Parameters<typeof payload.create>[0]['data'],
      user: user as Parameters<typeof payload.create>[0]['user'],
      overrideAccess: false,
    })
    return NextResponse.json({ id: created.id, slug: created.slug }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create event'
    const isDuplicate = /unique|duplicate|already exists/i.test(message)
    return NextResponse.json(
      { error: isDuplicate ? 'An event with this slug already exists' : message },
      { status: isDuplicate ? 409 : 400 },
    )
  }
}
