import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { requireApiPermission } from '@/lib/api-auth'
import { mtxHealthCheck } from '@/lib/mediamtx/client'
import { getDashboardMetrics, type DashboardMetrics } from '@/lib/mediamtx/metrics'
import { listStreamStatuses } from '@/lib/mediamtx/paths'
import { buildStreamUrls } from '@/lib/mediamtx/urls'
import { loadUrlTemplates } from '@/lib/url-templates'
import { canViewMetrics } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireApiPermission(canViewMetrics)
  if (auth instanceof NextResponse) return auth

  const health = await mtxHealthCheck()

  let metrics: DashboardMetrics | null = null
  try {
    metrics = await getDashboardMetrics()
  } catch {
    metrics = null
  }

  let streams: Array<{
    id: string
    name: string
    slug: string
    recordingEnabled?: boolean | null
    urls: ReturnType<typeof buildStreamUrls>
    status?: Awaited<ReturnType<typeof listStreamStatuses>>[number] | null
  }> = []

  try {
    const payload = await getPayload({ config })
    const urlTemplates = await loadUrlTemplates(payload)
    const result = await payload.find({ collection: 'streams', limit: 200, sort: 'name' })
    const recording = new Set(result.docs.filter((s) => s.recordingEnabled).map((s) => s.slug))
    const statuses = await listStreamStatuses(recording)
    const statusBySlug = new Map(statuses.map((s) => [s.name, s]))

    streams = result.docs.map((stream) => ({
      id: String(stream.id),
      name: stream.name,
      slug: stream.slug,
      recordingEnabled: stream.recordingEnabled,
      urls: buildStreamUrls(stream.slug, urlTemplates),
      status: statusBySlug.get(stream.slug) ?? null,
    }))
  } catch {
    streams = []
  }

  return NextResponse.json({ health, streams, metrics })
}
