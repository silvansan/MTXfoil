import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  LOGIN_RATE_LIMIT,
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/rate-limit'

const LOGIN_PATH = '/api/users/login'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Payload /admin root has no default view — send everyone to the operator UI.
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Default post-login destination is the operator UI, not Payload admin.
  if (pathname === '/admin/login' && !request.nextUrl.searchParams.has('redirect')) {
    const url = request.nextUrl.clone()
    url.searchParams.set('redirect', '/')
    return NextResponse.redirect(url)
  }

  if (request.method === 'POST' && pathname === LOGIN_PATH) {
    const ip = getClientIp(request)
    if (!checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT.limit, LOGIN_RATE_LIMIT.windowMs)) {
      return rateLimitResponse()
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
