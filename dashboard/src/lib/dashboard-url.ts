/**
 * Public dashboard URL for embeds, share links, and shortcodes.
 * Separate from PUBLIC_STREAM_DOMAIN (media ingest/playback hostname).
 */
export function getDashboardPublicUrl(): string {
  const explicit = process.env.DASHBOARD_PUBLIC_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  if (process.env.NODE_ENV === 'production') {
    const domain = process.env.PUBLIC_STREAM_DOMAIN?.trim()
    if (domain && !domain.includes('localhost')) {
      return `https://${domain}`
    }
  }

  return 'http://localhost:3000'
}

export function buildPlayerPublicUrl(slug: string, token?: string): string {
  const base = getDashboardPublicUrl()
  const path = `/player/${slug}`
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${base}${path}${query}`
}
