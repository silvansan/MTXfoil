import type { GlobalConfig } from 'payload'

import { applyFullConfig } from '@/lib/config-sync'
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
    { name: 'rtmpsEnabled', type: 'checkbox', defaultValue: true, label: 'RTMPS Enabled' },
    { name: 'rtmpsAddress', type: 'text', defaultValue: ':1936' },
    { name: 'hlsEnabled', type: 'checkbox', defaultValue: true, label: 'HLS Enabled' },
    { name: 'hlsAddress', type: 'text', defaultValue: ':8888' },
    {
      name: 'hlsVariant',
      type: 'select',
      defaultValue: 'mpegts',
      options: [
        { label: 'MPEG-TS', value: 'mpegts' },
        { label: 'FMP4', value: 'fmp4' },
      ],
    },
    { name: 'webrtcEnabled', type: 'checkbox', defaultValue: true, label: 'WebRTC Enabled' },
    { name: 'webrtcAddress', type: 'text', defaultValue: ':8889' },
    { name: 'rtspEnabled', type: 'checkbox', defaultValue: true, label: 'RTSP Enabled' },
    { name: 'rtspAddress', type: 'text', defaultValue: ':8554' },
    { name: 'apiEnabled', type: 'checkbox', defaultValue: true, label: 'API Enabled' },
    { name: 'metricsEnabled', type: 'checkbox', defaultValue: true, label: 'Metrics Enabled' },
    { name: 'playbackEnabled', type: 'checkbox', defaultValue: true, label: 'Playback Enabled' },
  ],
}
