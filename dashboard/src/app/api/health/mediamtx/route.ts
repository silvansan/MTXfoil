import { NextResponse } from 'next/server'

import { mtxHealthCheck } from '@/lib/mediamtx/client'
import { scheduleMediaMtxStartupSync } from '@/lib/mediamtx-startup-scheduler'
import config from '@payload-config'
import { getPayload } from 'payload'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    await scheduleMediaMtxStartupSync(payload, { awaitResult: true })
  } catch {
    // Postgres may not be ready yet; health response still reports MediaMTX status.
  }

  const health = await mtxHealthCheck()
  return NextResponse.json(health, { status: health.ok ? 200 : 503 })
}
