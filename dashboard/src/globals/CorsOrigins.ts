import type { GlobalConfig } from 'payload'

import { applyFullConfig } from '@/lib/config-sync'
import { isAdmin, isOperator } from '@/lib/permissions'

export const CorsOrigins: GlobalConfig = {
  slug: 'cors-origins',
  label: 'CORS Origins',
  access: {
    read: () => true,
    update: ({ req }) => isOperator(req.user),
  },
  hooks: {
    afterChange: [
      async ({ req }) => {
        if (req.payload) {
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
