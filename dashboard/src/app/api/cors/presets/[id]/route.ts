import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { requireApiPermission } from '@/lib/api-auth'
import { recordAudit } from '@/lib/audit-log'
import { isAdmin, isOperator } from '@/lib/permissions'

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

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireApiPermission(isOperator)
  if (auth instanceof NextResponse) return auth

  const { id } = await context.params

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = asString(body.name)
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    data.name = name
  }
  if (body.description !== undefined) {
    data.description = asString(body.description) || null
  }
  if (body.origins !== undefined) {
    const origins = asStringArray(body.origins)
    if (origins.length === 0) {
      return NextResponse.json({ error: 'At least one origin is required' }, { status: 400 })
    }
    data.origins = toOriginRows(origins)
  }
  if (body.services !== undefined) {
    const services = asServices(body.services)
    if (services.length === 0) {
      return NextResponse.json({ error: 'At least one service is required' }, { status: 400 })
    }
    data.services = services
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })
    const updated = await payload.update({
      collection: 'cors-presets',
      id,
      data,
      user: auth as Parameters<typeof payload.update>[0]['user'],
      overrideAccess: false,
    })

    await recordAudit(payload, null, {
      action: 'cors.preset_update',
      resource: 'cors-presets',
      resourceId: updated.id,
      summary: `CORS preset updated: ${updated.name}`,
      metadata: data,
      actorId:
        auth && typeof auth === 'object' && 'id' in auth ? (auth as { id: number }).id : null,
    })

    return NextResponse.json({ ok: true, id: updated.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update preset'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const auth = await requireApiPermission(isAdmin)
  if (auth instanceof NextResponse) return auth

  const { id } = await context.params

  try {
    const payload = await getPayload({ config })
    const preset = await payload.findByID({ collection: 'cors-presets', id })
    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 })
    }

    await payload.delete({
      collection: 'cors-presets',
      id,
      user: auth as Parameters<typeof payload.delete>[0]['user'],
      overrideAccess: false,
    })

    await recordAudit(payload, null, {
      action: 'cors.preset_delete',
      resource: 'cors-presets',
      resourceId: preset.id,
      summary: `CORS preset deleted: ${preset.name}`,
      actorId:
        auth && typeof auth === 'object' && 'id' in auth ? (auth as { id: number }).id : null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete preset'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
