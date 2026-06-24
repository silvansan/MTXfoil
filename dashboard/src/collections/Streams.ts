import type { CollectionConfig } from 'payload'

import { syncStreamToMediaMtx } from '@/lib/config-sync'
import { isAdmin, isOperator } from '@/lib/permissions'

export const Streams: CollectionConfig = {
  slug: 'streams',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'enabled', 'status'],
  },
  access: {
    read: () => true,
    create: ({ req }) => isOperator(req.user),
    update: ({ req }) => isOperator(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        if (req.payload) {
          await syncStreamToMediaMtx(req.payload, doc)
        }
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'idle',
      options: [
        { label: 'Idle', value: 'idle' },
        { label: 'Live', value: 'live' },
        { label: 'Offline', value: 'offline' },
        { label: 'Error', value: 'error' },
      ],
      admin: { readOnly: true },
    },
    { name: 'enabled', type: 'checkbox', defaultValue: true },
    {
      name: 'sourceType',
      type: 'select',
      defaultValue: 'publisher',
      options: [
        { label: 'Publisher', value: 'publisher' },
        { label: 'Proxy', value: 'proxy' },
        { label: 'Redirect', value: 'redirect' },
        { label: 'Test', value: 'test' },
      ],
    },
    { name: 'sourceUrl', type: 'text' },
    {
      name: 'enabledProtocols',
      type: 'select',
      hasMany: true,
      defaultValue: ['srt', 'rtmp', 'hls', 'webrtc', 'rtsp'],
      options: [
        { label: 'SRT', value: 'srt' },
        { label: 'RTMP', value: 'rtmp' },
        { label: 'RTSP', value: 'rtsp' },
        { label: 'HLS', value: 'hls' },
        { label: 'WebRTC', value: 'webrtc' },
      ],
    },
    { name: 'recordingEnabled', type: 'checkbox', defaultValue: false },
    { name: 'playbackEnabled', type: 'checkbox', defaultValue: true },
    {
      name: 'authMode',
      type: 'select',
      defaultValue: 'internal',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Unlisted', value: 'unlisted' },
        { label: 'Password', value: 'password' },
        { label: 'Token', value: 'token' },
        { label: 'Internal', value: 'internal' },
        { label: 'External HTTP', value: 'external' },
        { label: 'JWT', value: 'jwt' },
      ],
    },
    { name: 'publishPassword', type: 'text', admin: { condition: (_, s) => s.authMode === 'password' } },
    { name: 'readPassword', type: 'text', admin: { condition: (_, s) => s.authMode === 'password' } },
    { name: 'notes', type: 'textarea' },
  ],
}
