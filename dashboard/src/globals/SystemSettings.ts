import type { GlobalConfig } from 'payload'

import { isAdmin, isOperator } from '@/lib/permissions'

export const SystemSettings: GlobalConfig = {
  slug: 'system-settings',
  label: 'System Settings',
  access: {
    read: ({ req }) => isOperator(req.user),
    update: ({ req }) => isAdmin(req.user),
  },
  fields: [
    { name: 'publicStreamDomain', type: 'text', defaultValue: 'localhost' },
    { name: 'connectionTestInterval', type: 'number', defaultValue: 5, min: 3, max: 60 },
    {
      name: 'ports',
      type: 'group',
      fields: [
        { name: 'srt', type: 'number', defaultValue: 8890 },
        { name: 'rtmp', type: 'number', defaultValue: 1935 },
        { name: 'rtmps', type: 'number', defaultValue: 1936 },
        { name: 'rtsp', type: 'number', defaultValue: 8554 },
        { name: 'hls', type: 'number', defaultValue: 8888 },
        { name: 'webrtcHttp', type: 'number', defaultValue: 8889 },
        { name: 'webrtcIce', type: 'number', defaultValue: 8189 },
      ],
    },
    {
      name: 'urlTemplates',
      type: 'group',
      fields: [
        { name: 'srtPublish', type: 'text', defaultValue: 'srt://{domain}:{srtPort}?streamid=publish:{path}' },
        { name: 'srtRead', type: 'text', defaultValue: 'srt://{domain}:{srtPort}?streamid=read:{path}' },
        { name: 'rtmpPublish', type: 'text', defaultValue: 'rtmp://{domain}:{rtmpPort}/{path}' },
        { name: 'rtmpsPublish', type: 'text', defaultValue: 'rtmps://{domain}:{rtmpsPort}/{path}' },
        { name: 'hlsPlayback', type: 'text', defaultValue: '{hlsBaseUrl}/{path}/index.m3u8' },
        { name: 'webrtcPlayback', type: 'text', defaultValue: '{webrtcBaseUrl}/{path}' },
      ],
    },
    { name: 'hlsBaseUrl', type: 'text' },
    { name: 'webrtcBaseUrl', type: 'text' },
  ],
}
