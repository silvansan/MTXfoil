import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { requireApiPermission } from '@/lib/api-auth'
import { recordAudit } from '@/lib/audit-log'
import { isAdmin } from '@/lib/permissions'

const SERVICE_FIELDS = {
  api: 'apiAllowOrigins',
  hls: 'hlsAllowOrigins',
  webrtc: 'webrtcAllowOrigins',
  playback: 'playbackAllowOrigins',
  metrics: 'metricsAllowOrigins',
} as const

type ServiceKey = keyof typeof SERVICE_FIELDS

function mapOrigins(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item : (item as { origin?: string })?.origin || ''))
    .filter(Boolean)
}

function toOriginRows(origins: string[]) {
  return origins.map((origin) => ({ origin }))
}

export async function POST(request: Request) {
  const auth = await requireApiPermission(isAdmin)
  if (auth instanceof NextResponse) return auth

  const body = (await request.json().catch(() => null)) as { presetId?: string | number } | null
  const presetId = body?.presetId
  if (!presetId) {
    return NextResponse.json({ error: 'presetId is required' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })
    const preset = await payload.findByID({ collection: 'cors-presets', id: presetId })
    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 })
    }

    const origins = mapOrigins(preset.origins)
    const services = (preset.services || []) as ServiceKey[]
    if (services.length === 0 || origins.length === 0) {
      return NextResponse.json({ error: 'Preset has no services or origins' }, { status: 400 })
    }

    const current = await payload.findGlobal({ slug: 'cors-origins' })
    const patch: Record<string, unknown> = {}

    for (const service of services) {
      const field = SERVICE_FIELDS[service]
      if (!field) continue
      const existing = mapOrigins((current as Record<string, unknown>)[field])
      const merged = [...new Set([...existing, ...origins])]
      patch[field] = toOriginRows(merged)
    }

    await payload.updateGlobal({
      slug: 'cors-origins',
      data: patch,
      overrideAccess: true,
    })

    const actorId =
      auth && typeof auth === 'object' && 'id' in auth ? (auth as { id: number }).id : null
    await recordAudit(payload, null, {
      action: 'cors.preset_apply',
      resource: 'cors-presets',
      resourceId: preset.id,
      summary: `CORS preset applied: ${preset.name}`,
      metadata: { services, origins },
      actorId,
    })

    return NextResponse.json({ ok: true, applied: services })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Apply preset failed' },
      { status: 500 },
    )
  }
}
