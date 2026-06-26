import { headers } from 'next/headers'

import { getPayload } from 'payload'

import config from '@payload-config'



import { CorsManager, type CorsPresetView, type CorsSettingsView } from '@/components/operator/cors-manager'

import {

  enrichCorsFromEnv,

  getCorsWarnings,

  getTrustedProxyWarnings,

} from '@/lib/mediamtx/cors'

import { isAdmin, isOperator } from '@/lib/permissions'



function mapOrigins(value: unknown): string[] {

  if (!Array.isArray(value)) return []

  return value

    .map((item) => (typeof item === 'string' ? item : (item as { origin?: string })?.origin || ''))

    .filter(Boolean)

}



function mapProxies(value: unknown): string[] {

  if (!Array.isArray(value)) return []

  return value

    .map((item) => (typeof item === 'string' ? item : (item as { proxy?: string })?.proxy || ''))

    .filter(Boolean)

}



export const dynamic = 'force-dynamic'



export default async function CorsPage() {

  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: await headers() })

  const canManage = isOperator(user)
  const canDelete = isAdmin(user)



  const [cors, presets] = await Promise.all([

    payload.findGlobal({ slug: 'cors-origins' }),

    payload.find({ collection: 'cors-presets', limit: 50 }),

  ])



  const trustedProxies = mapProxies(cors.trustedProxies)

  const settings: CorsSettingsView = {

    apiAllowOrigins: mapOrigins(cors.apiAllowOrigins),

    hlsAllowOrigins: mapOrigins(cors.hlsAllowOrigins),

    webrtcAllowOrigins: mapOrigins(cors.webrtcAllowOrigins),

    playbackAllowOrigins: mapOrigins(cors.playbackAllowOrigins),

    metricsAllowOrigins: mapOrigins(cors.metricsAllowOrigins),

    trustedProxies,

  }



  const enriched = enrichCorsFromEnv(settings)

  const warnings = [...getCorsWarnings(enriched), ...getTrustedProxyWarnings(trustedProxies)]

  const isProduction = process.env.NODE_ENV === 'production'

  const dashboardUrl = process.env.DASHBOARD_PUBLIC_URL?.trim()



  const presetViews: CorsPresetView[] = presets.docs.map((preset) => ({
    id: preset.id,
    name: preset.name,
    description: preset.description ?? '',
    origins: mapOrigins(preset.origins),
    services: (preset.services as string[] | undefined) ?? [],
  }))



  return (

    <div className="space-y-6">

      <div>

        <h1 className="text-3xl font-bold">CORS Origins</h1>

        <p className="mt-2 text-zinc-400">

          Allowed origins per MediaMTX service. Changes are saved to the database and applied to MediaMTX

          automatically.

        </p>

      </div>



      <CorsManager

        initial={settings}

        warnings={warnings}

        presets={presetViews}

        dashboardUrl={dashboardUrl}

        isProduction={isProduction}

        canManage={canManage}
        canDelete={canDelete}
      />

    </div>

  )

}

