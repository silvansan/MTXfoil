import type { CollectionConfig } from 'payload'

import { removeStreamFromMediaMtx, syncStreamToMediaMtx } from '@/lib/config-sync'
import { recordAudit } from '@/lib/audit-log'
import { canReadStreamCatalog, isAdmin, isOperator } from '@/lib/permissions'

export const Streams: CollectionConfig = {
  slug: 'streams',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'enabled', 'status'],
  },
  access: {
    read: ({ req }) => canReadStreamCatalog(req.user),
    create: ({ req }) => isOperator(req.user),
    update: ({ req }) => isOperator(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        if (req.payload) {
          await recordAudit(req.payload, req, {
            action:
              operation === 'create'
                ? 'stream.create'
                : 'stream.update',
            resource: 'streams',
            resourceId: doc.id,
            summary: `Stream ${operation === 'create' ? 'created' : 'updated'}: ${doc.name} (${doc.slug})`,
            metadata: { slug: doc.slug, enabled: doc.enabled },
          })
          await syncStreamToMediaMtx(req.payload, doc)
        }
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        if (req.payload && doc?.slug) {
          await recordAudit(req.payload, req, {
            action: 'stream.delete',
            resource: 'streams',
            resourceId: doc.id,
            summary: `Stream deleted: ${doc.name ?? doc.slug}`,
            metadata: { slug: doc.slug },
          })
          await removeStreamFromMediaMtx(req.payload, doc.slug)
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
    {
      name: 'sourceUrl',
      type: 'text',
      admin: {
        description:
          'Pull source URL for Proxy/Redirect sources (e.g. rtsp://, rtmp://, srt://, or an HLS index.m3u8).',
        condition: (_, s) => s.sourceType === 'proxy' || s.sourceType === 'redirect',
      },
    },
    {
      name: 'ingestProtocol',
      type: 'select',
      defaultValue: 'srt',
      admin: {
        description:
          'Primary protocol your source uses to publish into MediaMTX. Drives the highlighted ingest URL and connection-mode hints. MediaMTX still accepts any enabled publish protocol on this path.',
        condition: (_, s) => !s.sourceType || s.sourceType === 'publisher',
      },
      options: [
        { label: 'SRT (caller → MediaMTX listener)', value: 'srt' },
        { label: 'RTMP', value: 'rtmp' },
        { label: 'RTMPS', value: 'rtmps' },
        { label: 'RTSP (announce)', value: 'rtsp' },
        { label: 'WebRTC (WHIP)', value: 'webrtc' },
      ],
    },
    {
      name: 'enabledProtocols',
      label: 'Playback protocols',
      type: 'select',
      hasMany: true,
      defaultValue: ['srt', 'rtmp', 'hls', 'webrtc', 'rtsp'],
      admin: {
        description:
          'Read endpoints advertised to viewers. HLS and WebRTC (WHEP) are browser-friendly; RTSP/RTMP/SRT are for external players.',
      },
      options: [
        { label: 'HLS', value: 'hls' },
        { label: 'WebRTC (WHEP)', value: 'webrtc' },
        { label: 'RTSP', value: 'rtsp' },
        { label: 'RTMP', value: 'rtmp' },
        { label: 'SRT (read)', value: 'srt' },
      ],
    },
    { name: 'recordingEnabled', type: 'checkbox', defaultValue: false },
    { name: 'playbackEnabled', type: 'checkbox', defaultValue: true },
    {
      name: 'authMode',
      type: 'select',
      defaultValue: 'internal',
      admin: {
        description:
          'Per-stream access policy. The server-wide auth method (Internal / External HTTP / JWT) is set in Protocol Settings → Authentication; under External HTTP the dashboard\'s built-in endpoint enforces this policy.',
      },
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Unlisted', value: 'unlisted' },
        { label: 'Password', value: 'password' },
        { label: 'Token', value: 'token' },
        { label: 'Internal', value: 'internal' },
      ],
    },
    {
      name: 'publishPassword',
      type: 'text',
      access: { read: ({ req }) => isOperator(req.user) },
      admin: { condition: (_, s) => s.authMode === 'password' },
    },
    {
      name: 'readPassword',
      type: 'text',
      access: { read: ({ req }) => isOperator(req.user) },
      admin: { condition: (_, s) => s.authMode === 'password' },
    },
    { name: 'notes', type: 'textarea' },
  ],
}
