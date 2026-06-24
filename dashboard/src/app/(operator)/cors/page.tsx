import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCorsWarnings, hasWildcardOrigin } from '@/lib/mediamtx/cors'

function mapOrigins(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item : (item as { origin?: string })?.origin || ''))
    .filter(Boolean)
}

export default async function CorsPage() {
  const payload = await getPayload({ config })
  const cors = await payload.findGlobal({ slug: 'cors-origins' })
  const presets = await payload.find({ collection: 'cors-presets', limit: 50 })

  const settings = {
    apiAllowOrigins: mapOrigins(cors.apiAllowOrigins),
    hlsAllowOrigins: mapOrigins(cors.hlsAllowOrigins),
    webrtcAllowOrigins: mapOrigins(cors.webrtcAllowOrigins),
    playbackAllowOrigins: mapOrigins(cors.playbackAllowOrigins),
    metricsAllowOrigins: mapOrigins(cors.metricsAllowOrigins),
  }

  const warnings = getCorsWarnings(settings)

  const sections = [
    ['API', settings.apiAllowOrigins],
    ['HLS', settings.hlsAllowOrigins],
    ['WebRTC', settings.webrtcAllowOrigins],
    ['Playback', settings.playbackAllowOrigins],
    ['Metrics', settings.metricsAllowOrigins],
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CORS Origins</h1>
        <p className="mt-2 text-zinc-400">Review allowed origins per service. Edit in Admin globals.</p>
      </div>

      {warnings.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="text-amber-300">Production warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-amber-200">
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(([label, origins]) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{label}</CardTitle>
              {hasWildcardOrigin(origins) && <Badge variant="warning">Wildcard</Badge>}
            </CardHeader>
            <CardContent>
              {origins.length === 0 ? (
                <p className="text-sm text-zinc-500">No origins configured</p>
              ) : (
                <ul className="space-y-1 font-mono text-sm">
                  {origins.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CORS Presets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {presets.docs.map((preset) => (
            <div key={preset.id} className="rounded-md border border-zinc-800 p-3">
              <p className="font-medium">{preset.name}</p>
              <p className="text-sm text-zinc-500">{preset.description}</p>
            </div>
          ))}
          <Link href="/admin/globals/cors-origins" className="text-emerald-400 underline text-sm">
            Edit CORS in Admin →
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
