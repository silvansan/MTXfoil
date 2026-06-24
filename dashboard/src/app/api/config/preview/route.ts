import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { previewConfigDiff } from '@/lib/config-sync'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const result = await previewConfigDiff(payload)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { ok: false, diffs: [], errors: [err instanceof Error ? err.message : 'Preview failed'] },
      { status: 500 },
    )
  }
}
