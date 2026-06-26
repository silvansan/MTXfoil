const DEV_PAYLOAD_SECRET = 'dev-only-secret-minimum-32-characters-long'
const DEV_PLAYBACK_SECRET = 'dev-playback-secret'

/** Known weak defaults from compose examples and common dev stacks. */
const WEAK_CREDENTIALS = new Set([
  'mtxfoil',
  'postgres',
  'password',
  'admin',
  'changeme',
  'change-me',
  'change_me',
  'secret',
  'root',
  'test',
  '123456',
  'default',
  'mediamtx',
])

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function isBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build'
  )
}

function rejectDevPlaceholder(value: string, name: string): void {
  const lowered = value.toLowerCase()
  if (
    lowered.includes('change-me') ||
    lowered.includes('change_me') ||
    lowered.includes('dev-only') ||
    lowered === 'dev-secret' ||
    lowered === 'dev-playback-secret'
  ) {
    throw new Error(`${name} must not use a development placeholder in production`)
  }
}

function rejectWeakCredential(value: string | undefined, name: string): void {
  if (!value?.trim()) return
  const trimmed = value.trim()
  const lowered = trimmed.toLowerCase()
  if (WEAK_CREDENTIALS.has(lowered) || lowered.includes('change-me') || lowered.includes('change_me')) {
    throw new Error(
      `${name} must not use the default or a common weak value in production — set a strong unique credential in your Portainer/stack environment`,
    )
  }
}

function passwordFromDatabaseUrl(databaseUrl: string): string | undefined {
  try {
    return new URL(databaseUrl).password || undefined
  } catch {
    return undefined
  }
}

export function validateProductionEnv(): void {
  if (!isProduction() || isBuildPhase()) return

  const payloadSecret = process.env.PAYLOAD_SECRET?.trim()
  if (!payloadSecret || payloadSecret.length < 32) {
    throw new Error('PAYLOAD_SECRET must be set to at least 32 characters in production')
  }
  if (payloadSecret === DEV_PAYLOAD_SECRET) {
    throw new Error('PAYLOAD_SECRET must not use the development fallback in production')
  }
  rejectDevPlaceholder(payloadSecret, 'PAYLOAD_SECRET')

  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required in production')
  }

  const postgresPassword =
    process.env.POSTGRES_PASSWORD?.trim() || passwordFromDatabaseUrl(databaseUrl)
  rejectWeakCredential(postgresPassword, 'POSTGRES_PASSWORD')

  const mtxUser = process.env.MEDIAMTX_INTERNAL_USER?.trim()
  const mtxPass = process.env.MEDIAMTX_INTERNAL_PASS?.trim()
  rejectWeakCredential(mtxUser, 'MEDIAMTX_INTERNAL_USER')
  rejectWeakCredential(mtxPass, 'MEDIAMTX_INTERNAL_PASS')
  if (mtxUser && mtxPass && mtxUser === mtxPass) {
    throw new Error(
      'MEDIAMTX_INTERNAL_USER and MEDIAMTX_INTERNAL_PASS must not be identical in production',
    )
  }

  const playbackSecret = process.env.PLAYBACK_TOKEN_SECRET?.trim()
  if (!playbackSecret || playbackSecret.length < 32) {
    throw new Error('PLAYBACK_TOKEN_SECRET must be set to at least 32 characters in production')
  }
  if (playbackSecret === DEV_PLAYBACK_SECRET) {
    throw new Error('PLAYBACK_TOKEN_SECRET must not use the development fallback in production')
  }
  rejectDevPlaceholder(playbackSecret, 'PLAYBACK_TOKEN_SECRET')

  const hlsBase = process.env.HLS_BASE_URL?.trim()
  const webrtcBase = process.env.WEBRTC_BASE_URL?.trim()
  if (hlsBase?.startsWith('http://') && !hlsBase.includes('localhost')) {
    throw new Error('HLS_BASE_URL must use https:// in production (set after TLS deploy)')
  }
  if (webrtcBase?.startsWith('http://') && !webrtcBase.includes('localhost')) {
    throw new Error('WEBRTC_BASE_URL must use https:// in production (set after TLS deploy)')
  }

  const dashboardUrl = process.env.DASHBOARD_PUBLIC_URL?.trim()
  if (dashboardUrl && !dashboardUrl.startsWith('https://') && !dashboardUrl.includes('localhost')) {
    throw new Error('DASHBOARD_PUBLIC_URL must use https:// in production')
  }
}

export function requirePayloadSecret(): string {
  if (!isBuildPhase()) {
    validateProductionEnv()
  }

  const secret = process.env.PAYLOAD_SECRET?.trim()
  if (secret) return secret

  if (isProduction() && !isBuildPhase()) {
    throw new Error('PAYLOAD_SECRET is required in production')
  }

  return DEV_PAYLOAD_SECRET
}

export function requirePlaybackTokenSecret(): string {
  if (!isBuildPhase()) {
    validateProductionEnv()
  }

  const secret = process.env.PLAYBACK_TOKEN_SECRET?.trim()
  if (secret) return secret

  const payloadSecret = process.env.PAYLOAD_SECRET?.trim()
  if (payloadSecret && payloadSecret.length >= 32 && !isProduction()) {
    return payloadSecret
  }

  if (isProduction() && !isBuildPhase()) {
    throw new Error('PLAYBACK_TOKEN_SECRET is required in production')
  }

  return DEV_PLAYBACK_SECRET
}
