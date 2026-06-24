const DEV_PAYLOAD_SECRET = 'dev-only-secret-minimum-32-characters-long'
const DEV_PLAYBACK_SECRET = 'dev-playback-secret'

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
    lowered.includes('dev-only') ||
    lowered === 'dev-secret' ||
    lowered === 'dev-playback-secret'
  ) {
    throw new Error(`${name} must not use a development placeholder in production`)
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

  const playbackSecret = process.env.PLAYBACK_TOKEN_SECRET?.trim()
  if (!playbackSecret || playbackSecret.length < 32) {
    throw new Error('PLAYBACK_TOKEN_SECRET must be set to at least 32 characters in production')
  }
  if (playbackSecret === DEV_PLAYBACK_SECRET) {
    throw new Error('PLAYBACK_TOKEN_SECRET must not use the development fallback in production')
  }
  rejectDevPlaceholder(playbackSecret, 'PLAYBACK_TOKEN_SECRET')
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
