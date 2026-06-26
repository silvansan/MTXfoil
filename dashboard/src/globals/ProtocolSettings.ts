import type { GlobalConfig } from 'payload'

import { applyFullConfig } from '@/lib/config-sync'
import { recordAudit } from '@/lib/audit-log'
import { isAdmin } from '@/lib/permissions'

export const ProtocolSettings: GlobalConfig = {
  slug: 'protocol-settings',
  label: 'Protocol Settings',
  access: {
    read: () => true,
    update: ({ req }) => isAdmin(req.user),
  },
  hooks: {
    afterChange: [
      async ({ req }) => {
        if (req.payload) {
          await recordAudit(req.payload, req, {
            action: 'protocol.update',
            resource: 'protocol-settings',
            summary: 'Protocol settings updated',
          })
          await applyFullConfig(req.payload)
        }
      },
    ],
  },
  fields: [
    { name: 'srtEnabled', type: 'checkbox', defaultValue: true, label: 'SRT Enabled' },
    { name: 'srtAddress', type: 'text', defaultValue: ':8890' },
    { name: 'srtPublishPassphrase', type: 'text' },
    { name: 'rtmpEnabled', type: 'checkbox', defaultValue: true, label: 'RTMP Enabled' },
    { name: 'rtmpAddress', type: 'text', defaultValue: ':1935' },
    { name: 'rtmpsEnabled', type: 'checkbox', defaultValue: false, label: 'RTMPS Enabled' },
    { name: 'rtmpsAddress', type: 'text', defaultValue: ':1936' },
    {
      name: 'rtmpsServerKey',
      type: 'text',
      label: 'RTMPS TLS key path',
      admin: {
        description: 'Path inside the MediaMTX container (e.g. /certs/server.key). RTMPS stays off until key and cert are set.',
      },
    },
    {
      name: 'rtmpsServerCert',
      type: 'text',
      label: 'RTMPS TLS cert path',
      admin: {
        description: 'Path inside the MediaMTX container (e.g. /certs/server.crt).',
      },
    },
    { name: 'hlsEnabled', type: 'checkbox', defaultValue: true, label: 'HLS Enabled' },
    { name: 'hlsAddress', type: 'text', defaultValue: ':8888' },
    {
      name: 'hlsVariant',
      type: 'select',
      defaultValue: 'mpegts',
      options: [
        { label: 'MPEG-TS', value: 'mpegts' },
        { label: 'FMP4', value: 'fmp4' },
        { label: 'Low-latency (LL-HLS)', value: 'lowLatency' },
      ],
    },
    {
      name: 'hlsLowLatency',
      type: 'checkbox',
      defaultValue: false,
      label: 'Force LL-HLS variant',
      admin: {
        description: 'When enabled, overrides HLS variant to lowLatency (LL-HLS).',
      },
    },
    {
      name: 'hlsPartDuration',
      type: 'text',
      defaultValue: '200ms',
      label: 'HLS part duration',
      admin: { description: 'LL-HLS part duration (e.g. 200ms).' },
    },
    {
      name: 'hlsSegmentDuration',
      type: 'text',
      defaultValue: '1s',
      label: 'HLS segment duration',
    },
    { name: 'webrtcEnabled', type: 'checkbox', defaultValue: true, label: 'WebRTC Enabled' },
    { name: 'webrtcAddress', type: 'text', defaultValue: ':8889' },
    { name: 'rtspEnabled', type: 'checkbox', defaultValue: true, label: 'RTSP Enabled' },
    { name: 'rtspAddress', type: 'text', defaultValue: ':8554' },
    { name: 'apiEnabled', type: 'checkbox', defaultValue: true, label: 'API Enabled' },
    { name: 'metricsEnabled', type: 'checkbox', defaultValue: true, label: 'Metrics Enabled' },
    { name: 'playbackEnabled', type: 'checkbox', defaultValue: true, label: 'Playback Enabled' },
    {
      name: 'auth',
      type: 'group',
      label: 'Authentication',
      admin: {
        description:
          'MediaMTX auth method is server-wide (not per-stream). Internal keeps per-stream authMode enforced by the built-in user list. External HTTP delegates every publish/read to an HTTP endpoint (defaults to this dashboard, which enforces each stream\'s authMode). JWT validates bearer tokens against a JWKS endpoint.',
      },
      fields: [
        {
          name: 'method',
          type: 'select',
          defaultValue: 'internal',
          label: 'Auth method',
          options: [
            { label: 'Internal (per-stream authMode)', value: 'internal' },
            { label: 'External HTTP', value: 'http' },
            { label: 'JWT', value: 'jwt' },
          ],
        },
        {
          name: 'httpAddress',
          type: 'text',
          label: 'HTTP auth endpoint',
          admin: {
            condition: (_, s) => s?.method === 'http',
            description:
              'URL MediaMTX POSTs each auth request to. Leave blank to use the dashboard\'s built-in endpoint (http://dashboard:3000/api/mediamtx/auth) which authorizes by per-stream authMode. Set a custom URL to delegate to your own auth service.',
          },
        },
        {
          name: 'jwtJwks',
          type: 'text',
          label: 'JWKS URL',
          admin: {
            condition: (_, s) => s?.method === 'jwt',
            description: 'HTTPS URL of your identity provider\'s JWKS (public keys) endpoint. Required for JWT mode.',
          },
        },
        {
          name: 'jwtClaimKey',
          type: 'text',
          defaultValue: 'mediamtx_permissions',
          label: 'JWT claim key',
          admin: {
            condition: (_, s) => s?.method === 'jwt',
            description: 'JWT claim containing the MediaMTX permissions array. Defaults to mediamtx_permissions.',
          },
        },
        {
          name: 'jwtIssuer',
          type: 'text',
          label: 'JWT issuer',
          admin: { condition: (_, s) => s?.method === 'jwt' },
        },
        {
          name: 'jwtAudience',
          type: 'text',
          label: 'JWT audience',
          admin: { condition: (_, s) => s?.method === 'jwt' },
        },
      ],
    },
  ],
}
