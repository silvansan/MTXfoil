import type { Stream } from '@/payload-types'

export type AuthPathConfig = {
  publishUser?: string
  publishPass?: string
  publishIPs?: string[]
  readUser?: string
  readPass?: string
  readIPs?: string[]
}

export function mapStreamAuthToPath(stream: Stream): AuthPathConfig {
  const authMode = stream.authMode || 'internal'

  switch (authMode) {
    case 'public':
      return {}
    case 'unlisted':
      return { readIPs: [] }
    case 'password':
      return {
        publishUser: stream.slug,
        publishPass: stream.publishPassword || undefined,
        readUser: stream.slug,
        readPass: stream.readPassword || undefined,
      }
    case 'token':
    case 'jwt':
    case 'external':
      return { readIPs: [] }
    case 'internal':
    default:
      return {}
  }
}

export function isAnonymousPublishAllowed(): boolean {
  return false
}

export function getAuthModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    public: 'Public',
    unlisted: 'Unlisted',
    password: 'Password',
    token: 'Token',
    internal: 'Internal',
    external: 'External HTTP',
    jwt: 'JWT',
  }
  return labels[mode] || mode
}
