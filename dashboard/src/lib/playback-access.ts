import type { Stream } from '@/payload-types'

import { getPlaybackTokenSecret, verifyPlaybackToken } from './playback-token'

export type PlaybackAccessResult =
  | { allowed: true }
  | { allowed: false; reason: 'token' | 'password' }

export function checkStreamPlaybackAccess(
  stream: Stream,
  options: { token?: string; password?: string },
): PlaybackAccessResult {
  const authMode = stream.authMode || 'internal'

  if (authMode === 'token') {
    const secret = getPlaybackTokenSecret()
    const payload = options.token ? verifyPlaybackToken(options.token, secret) : null
    if (!payload || payload.slug !== stream.slug) {
      return { allowed: false, reason: 'token' }
    }
    return { allowed: true }
  }

  if (authMode === 'password') {
    const expected = stream.readPassword?.trim()
    if (!expected || options.password !== expected) {
      return { allowed: false, reason: 'password' }
    }
    return { allowed: true }
  }

  return { allowed: true }
}
