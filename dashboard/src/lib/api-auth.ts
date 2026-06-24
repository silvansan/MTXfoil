import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function getApiUser(): Promise<unknown | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  return user ?? null
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function requireApiUser(): Promise<unknown | NextResponse> {
  const user = await getApiUser()
  if (!user) return unauthorizedResponse()
  return user
}

export async function requireApiPermission(
  check: (user: unknown) => boolean,
): Promise<unknown | NextResponse> {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!check(user)) return forbiddenResponse()
  return user
}
