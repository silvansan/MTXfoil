import { NextResponse } from 'next/server'

import { mtxHealthCheck } from '@/lib/mediamtx/client'

export async function GET() {
  const health = await mtxHealthCheck()
  return NextResponse.json(health, { status: health.ok ? 200 : 503 })
}
