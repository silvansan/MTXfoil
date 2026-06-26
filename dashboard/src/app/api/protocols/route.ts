import { NextRequest, NextResponse } from 'next/server'

import { getPayload } from 'payload'
import config from '@payload-config'

import { requireApiPermission } from '@/lib/api-auth'
import { isAdmin } from '@/lib/permissions'

type AuthMethod = 'internal' | 'http' | 'jwt'
type HlsVariant = 'mpegts' | 'fmp4' | 'lowLatency'

type ProtocolBody = {
  srtEnabled?: unknown
  srtAddress?: unknown
  srtPublishPassphrase?: unknown
  rtmpEnabled?: unknown
  rtmpAddress?: unknown
  rtmpsEnabled?: unknown
  rtmpsAddress?: unknown
  rtmpsServerKey?: unknown
  rtmpsServerCert?: unknown
  hlsEnabled?: unknown
  hlsAddress?: unknown
  hlsVariant?: unknown
  hlsLowLatency?: unknown
  hlsPartDuration?: unknown
  hlsSegmentDuration?: unknown
  webrtcEnabled?: unknown
  webrtcAddress?: unknown
  rtspEnabled?: unknown
  rtspAddress?: unknown
  apiEnabled?: unknown
  metricsEnabled?: unknown
  playbackEnabled?: unknown
  auth?: {
    method?: unknown
    httpAddress?: unknown
    jwtJwks?: unknown
    jwtClaimKey?: unknown
    jwtIssuer?: unknown
    jwtAudience?: unknown
  }
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function asAuthMethod(value: unknown): AuthMethod {
  if (value === 'http' || value === 'jwt') return value
  return 'internal'
}

function asHlsVariant(value: unknown): HlsVariant {
  if (value === 'fmp4' || value === 'lowLatency') return value
  return 'mpegts'
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiPermission(isAdmin)
  if (auth instanceof NextResponse) return auth

  let body: ProtocolBody
  try {
    body = (await req.json()) as ProtocolBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const authBody = body.auth && typeof body.auth === 'object' ? body.auth : {}

  const data = {
    srtEnabled: asBool(body.srtEnabled, true),
    srtAddress: asString(body.srtAddress, ':8890'),
    srtPublishPassphrase: asString(body.srtPublishPassphrase),
    rtmpEnabled: asBool(body.rtmpEnabled, true),
    rtmpAddress: asString(body.rtmpAddress, ':1935'),
    rtmpsEnabled: asBool(body.rtmpsEnabled, false),
    rtmpsAddress: asString(body.rtmpsAddress, ':1936'),
    rtmpsServerKey: asString(body.rtmpsServerKey),
    rtmpsServerCert: asString(body.rtmpsServerCert),
    hlsEnabled: asBool(body.hlsEnabled, true),
    hlsAddress: asString(body.hlsAddress, ':8888'),
    hlsVariant: asHlsVariant(body.hlsVariant),
    hlsLowLatency: asBool(body.hlsLowLatency, false),
    hlsPartDuration: asString(body.hlsPartDuration, '200ms'),
    hlsSegmentDuration: asString(body.hlsSegmentDuration, '1s'),
    webrtcEnabled: asBool(body.webrtcEnabled, true),
    webrtcAddress: asString(body.webrtcAddress, ':8889'),
    rtspEnabled: asBool(body.rtspEnabled, true),
    rtspAddress: asString(body.rtspAddress, ':8554'),
    apiEnabled: asBool(body.apiEnabled, true),
    metricsEnabled: asBool(body.metricsEnabled, true),
    playbackEnabled: asBool(body.playbackEnabled, true),
    auth: {
      method: asAuthMethod(authBody.method),
      httpAddress: asString(authBody.httpAddress),
      jwtJwks: asString(authBody.jwtJwks),
      jwtClaimKey: asString(authBody.jwtClaimKey, 'mediamtx_permissions'),
      jwtIssuer: asString(authBody.jwtIssuer),
      jwtAudience: asString(authBody.jwtAudience),
    },
  }

  try {
    const payload = await getPayload({ config })
    await payload.updateGlobal({
      slug: 'protocol-settings',
      data,
      user: auth as Parameters<typeof payload.updateGlobal>[0]['user'],
      overrideAccess: false,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update protocol settings'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
