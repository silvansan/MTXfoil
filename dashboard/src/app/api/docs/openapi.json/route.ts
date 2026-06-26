import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/lib/api-auth'
import { buildOpenApiDocument } from '@/lib/api-docs/openapi'
import { isOperator } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireApiPermission(isOperator)
  if (auth instanceof NextResponse) return auth

  const spec = buildOpenApiDocument()
  return NextResponse.json(spec)
}
