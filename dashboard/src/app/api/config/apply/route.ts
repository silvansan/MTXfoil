import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { applyFullConfig } from '@/lib/config-sync'

export async function POST() {
  try {
    const payload = await getPayload({ config })
    const result = await applyFullConfig(payload)
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (err) {
    return NextResponse.json(
      { ok: false, diffs: [], errors: [err instanceof Error ? err.message : 'Apply failed'] },
      { status: 500 },
    )
  }
}
