import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { requireApiPermission } from '@/lib/api-auth'
import { isOperator } from '@/lib/permissions'

type CorsBody = {
  apiAllowOrigins?: unknown
  hlsAllowOrigins?: unknown
  webrtcAllowOrigins?: unknown
  playbackAllowOrigins?: unknown
  metricsAllowOrigins?: unknown
  trustedProxies?: unknown
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function toOriginRows(origins: string[]) {
  return origins.map((origin) => ({ origin }))
}

function toProxyRows(proxies: string[]) {
  return proxies.map((proxy) => ({ proxy }))
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiPermission(isOperator)
  if (auth instanceof NextResponse) return auth

  let body: CorsBody
  try {
    body = (await req.json()) as CorsBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data = {
    apiAllowOrigins: toOriginRows(asStringArray(body.apiAllowOrigins)),
    hlsAllowOrigins: toOriginRows(asStringArray(body.hlsAllowOrigins)),
    webrtcAllowOrigins: toOriginRows(asStringArray(body.webrtcAllowOrigins)),
    playbackAllowOrigins: toOriginRows(asStringArray(body.playbackAllowOrigins)),
    metricsAllowOrigins: toOriginRows(asStringArray(body.metricsAllowOrigins)),
    trustedProxies: toProxyRows(asStringArray(body.trustedProxies)),
  }

  try {
    const payload = await getPayload({ config })
    await payload.updateGlobal({
      slug: 'cors-origins',
      data,
      user: auth as Parameters<typeof payload.updateGlobal>[0]['user'],
      overrideAccess: false,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update CORS'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
