import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { requireApiPermission } from '@/lib/api-auth'
import { deleteRecordingSegment } from '@/lib/mediamtx/recordings'
import { isAdmin } from '@/lib/permissions'

async function isKnownStreamPath(path: string): Promise<boolean> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'streams',
    where: { slug: { equals: path } },
    limit: 1,
    depth: 0,
  })
  return result.docs.length > 0
}

export async function POST(request: Request) {
  const auth = await requireApiPermission(isAdmin)
  if (auth instanceof NextResponse) return auth

  const body = (await request.json().catch(() => null)) as { path?: string; start?: string } | null
  if (!body?.path || !body?.start) {
    return NextResponse.json({ error: 'path and start are required' }, { status: 400 })
  }

  if (!(await isKnownStreamPath(body.path))) {
    return NextResponse.json({ error: 'Unknown stream path' }, { status: 400 })
  }

  try {
    await deleteRecordingSegment(body.path, body.start)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 },
    )
  }
}
