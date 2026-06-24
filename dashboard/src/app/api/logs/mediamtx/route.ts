import { NextResponse } from 'next/server'

import { tailMediaMtxLogs } from '@/lib/mediamtx/logs'

export async function GET() {
  const result = await tailMediaMtxLogs()
  return NextResponse.json(result)
}
