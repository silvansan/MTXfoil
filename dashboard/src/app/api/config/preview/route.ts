import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { requireApiPermission } from '@/lib/api-auth'
import { previewConfigDiff } from '@/lib/config-sync'
import { canApplyConfig } from '@/lib/permissions'

export async function GET() {
  const auth = await requireApiPermission(canApplyConfig)
  if (auth instanceof NextResponse) return auth

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
