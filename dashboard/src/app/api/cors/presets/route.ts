import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { requireApiPermission } from '@/lib/api-auth'
import { recordAudit } from '@/lib/audit-log'
import { isOperator } from '@/lib/permissions'

const SERVICE_KEYS = ['api', 'hls', 'webrtc', 'playback', 'metrics'] as const
type ServiceKey = (typeof SERVICE_KEYS)[number]

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
}

function asServices(value: unknown): ServiceKey[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is ServiceKey =>
    typeof item === 'string' && (SERVICE_KEYS as readonly string[]).includes(item),
  )
}

function toOriginRows(origins: string[]) {
  return origins.map((origin) => ({ origin }))
}

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission(isOperator)
  if (auth instanceof NextResponse) return auth

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = asString(body.name)
  const origins = asStringArray(body.origins)
  const services = asServices(body.services)
  const description = asString(body.description)

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (origins.length === 0) return NextResponse.json({ error: 'At least one origin is required' }, { status: 400 })
  if (services.length === 0) return NextResponse.json({ error: 'At least one service is required' }, { status: 400 })

  try {
    const payload = await getPayload({ config })
    const created = await payload.create({
      collection: 'cors-presets',
      data: {
        name,
        description: description || undefined,
        origins: toOriginRows(origins),
        services,
      },
      user: auth as Parameters<typeof payload.create>[0]['user'],
      overrideAccess: false,
    })

    await recordAudit(payload, null, {
      action: 'cors.preset_create',
      resource: 'cors-presets',
      resourceId: created.id,
      summary: `CORS preset created: ${created.name}`,
      metadata: { services, origins },
      actorId:
        auth && typeof auth === 'object' && 'id' in auth ? (auth as { id: number }).id : null,
    })

    return NextResponse.json({ id: created.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create preset'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
