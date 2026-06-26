import type { Stream } from '@/payload-types'

import { getMediaMtxInternalCredentials } from '@/lib/mediamtx/config'

/** Basic auth header for WHIP publish against MediaMTX. */
export function getWhipAuthHeader(stream: Stream): string {
  const authMode = stream.authMode || 'internal'

  if (authMode === 'password') {
    const user = stream.slug
    const pass = stream.publishPassword || ''
    return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
  }

  const { user, pass } = getMediaMtxInternalCredentials()
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
}
