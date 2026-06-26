import type { CollectionConfig } from 'payload'

import { isAdmin, isOperator } from '@/lib/permissions'

export const CorsPresets: CollectionConfig = {
  slug: 'cors-presets',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
  },
  access: {
    read: ({ req }) => isOperator(req.user),
    create: ({ req }) => isOperator(req.user),
    update: ({ req }) => isOperator(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'origins',
      type: 'array',
      fields: [{ name: 'origin', type: 'text', required: true }],
    },
    {
      name: 'services',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'API', value: 'api' },
        { label: 'HLS', value: 'hls' },
        { label: 'WebRTC', value: 'webrtc' },
        { label: 'Playback', value: 'playback' },
        { label: 'Metrics', value: 'metrics' },
      ],
    },
  ],
}
