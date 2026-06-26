import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { requireApiPermission } from '@/lib/api-auth'
import { recordAudit } from '@/lib/audit-log'
import { applyFullConfig } from '@/lib/config-sync'
import { canApplyConfig } from '@/lib/permissions'

export async function POST() {
  const auth = await requireApiPermission(canApplyConfig)
  if (auth instanceof NextResponse) return auth

  try {
    const payload = await getPayload({ config })
    const result = await applyFullConfig(payload)
    if (result.ok) {
      const actorId =
        auth && typeof auth === 'object' && 'id' in auth ? (auth as { id: number }).id : null
      await recordAudit(payload, null, {
        action: 'config.apply',
        resource: 'mediamtx-config',
        summary: 'Full MediaMTX config applied',
        metadata: { backupPath: result.backupPath, diffCount: result.diffs.length },
        actorId,
      })
    }
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (err) {
    return NextResponse.json(
      { ok: false, diffs: [], errors: [err instanceof Error ? err.message : 'Apply failed'] },
      { status: 500 },
    )
  }
}
