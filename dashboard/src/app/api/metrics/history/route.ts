import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/lib/api-auth'
import { getMetricsHistory, type MetricsHistoryRange } from '@/lib/metrics-history'
import { canViewMetrics } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const RANGES = new Set<MetricsHistoryRange>(['hour', 'day', 'week', 'month'])

export async function GET(req: Request) {
  const auth = await requireApiPermission(canViewMetrics)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const rangeParam = searchParams.get('range') ?? 'hour'
  const range = RANGES.has(rangeParam as MetricsHistoryRange)
    ? (rangeParam as MetricsHistoryRange)
    : 'hour'

  const history = await getMetricsHistory(range)
  return NextResponse.json(history)
}
