import type { GlobalConfig } from 'payload'

import { applyFullConfig } from '@/lib/config-sync'
import { recordAudit } from '@/lib/audit-log'
import { isOperator } from '@/lib/permissions'
import { validateCorsForProduction, enrichCorsFromEnv } from '@/lib/mediamtx/cors'

export const CorsOrigins: GlobalConfig = {
  slug: 'cors-origins',
  label: 'CORS Origins',
  access: {
    read: ({ req }) => isOperator(req.user),
    update: ({ req }) => isOperator(req.user),
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        if (process.env.NODE_ENV !== 'production' || !req?.payload) return data

        const mapOriginArray = (value: unknown) => {
          if (!Array.isArray(value)) return undefined
          return value
            .map((item) =>
              typeof item === 'string' ? item : (item as { origin?: string })?.origin || '',
            )
            .filter(Boolean)
        }
        const mapProxyArray = (value: unknown) => {
          if (!Array.isArray(value)) return undefined
          return value
            .map((item) =>
              typeof item === 'string' ? item : (item as { proxy?: string })?.proxy || '',
            )
            .filter(Boolean)
        }

        const settings = enrichCorsFromEnv({
          apiAllowOrigins: mapOriginArray(data?.apiAllowOrigins),
          hlsAllowOrigins: mapOriginArray(data?.hlsAllowOrigins),
          webrtcAllowOrigins: mapOriginArray(data?.webrtcAllowOrigins),
          playbackAllowOrigins: mapOriginArray(data?.playbackAllowOrigins),
          metricsAllowOrigins: mapOriginArray(data?.metricsAllowOrigins),
          trustedProxies: mapProxyArray(data?.trustedProxies),
        })
        const errors = validateCorsForProduction(settings)
        if (errors.length > 0) {
          throw new Error(errors.join('; '))
        }
        return data
      },
    ],
    afterChange: [
      async ({ req }) => {
        if (req.payload) {
          await recordAudit(req.payload, req, {
            action: 'cors.update',
            resource: 'cors-origins',
            summary: 'CORS origins updated',
          })
          await applyFullConfig(req.payload)
        }
      },
    ],
  },
  fields: [
    {
      name: 'apiAllowOrigins',
      type: 'array',
      fields: [{ name: 'origin', type: 'text' }],
    },
    {
      name: 'hlsAllowOrigins',
      type: 'array',
      fields: [{ name: 'origin', type: 'text' }],
    },
    {
      name: 'webrtcAllowOrigins',
      type: 'array',
      fields: [{ name: 'origin', type: 'text' }],
    },
    {
      name: 'playbackAllowOrigins',
      type: 'array',
      fields: [{ name: 'origin', type: 'text' }],
    },
    {
      name: 'metricsAllowOrigins',
      type: 'array',
      fields: [{ name: 'origin', type: 'text' }],
    },
    {
      name: 'trustedProxies',
      type: 'array',
      fields: [{ name: 'proxy', type: 'text' }],
    },
  ],
}
