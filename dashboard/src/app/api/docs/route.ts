import { NextResponse } from 'next/server'

import { requireApiPermission } from '@/lib/api-auth'
import { isOperator } from '@/lib/permissions'

const scalarHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MTXfoil API Docs</title>
    <style>
      body { margin: 0; }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/docs/openapi.json"
      data-theme="purple"
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`

export async function GET() {
  const auth = await requireApiPermission(isOperator)
  if (auth instanceof NextResponse) return auth

  return new NextResponse(scalarHtml, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
