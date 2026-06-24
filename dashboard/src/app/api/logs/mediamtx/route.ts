import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/lib/api-auth'
import { tailMediaMtxLogs } from '@/lib/mediamtx/logs'
import { canViewMetrics } from '@/lib/permissions'

export async function GET() {
  const auth = await requireApiPermission(canViewMetrics)
  if (auth instanceof NextResponse) return auth

  const result = await tailMediaMtxLogs()
  return NextResponse.json(result)
}
