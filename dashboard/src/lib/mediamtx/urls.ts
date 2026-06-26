export type UrlTemplates = {
  publicStreamDomain: string
  srtPort: number
  rtmpPort: number
  rtmpsPort: number
  rtspPort: number
  hlsBaseUrl: string
  webrtcBaseUrl: string
  srtPublishTemplate: string
  srtReadTemplate: string
  rtmpPublishTemplate: string
  rtmpsPublishTemplate: string
  rtspPlaybackTemplate: string
  hlsPlaybackTemplate: string
  webrtcPlaybackTemplate: string
}

export function getDefaultUrlTemplates(): UrlTemplates {
  const domain = process.env.PUBLIC_STREAM_DOMAIN || 'localhost'
  return {
    publicStreamDomain: domain,
    srtPort: Number(process.env.SRT_PORT || 8890),
    rtmpPort: Number(process.env.RTMP_PORT || 1935),
    rtmpsPort: Number(process.env.RTMPS_PORT || 1936),
    rtspPort: Number(process.env.RTSP_PORT || 8554),
    hlsBaseUrl: process.env.HLS_BASE_URL || `http://${domain}:8888`,
    webrtcBaseUrl: process.env.WEBRTC_BASE_URL || `http://${domain}:8889`,
    srtPublishTemplate: 'srt://{domain}:{srtPort}?streamid=publish:{path}',
    srtReadTemplate: 'srt://{domain}:{srtPort}?streamid=read:{path}',
    rtmpPublishTemplate: 'rtmp://{domain}:{rtmpPort}/{path}',
    rtmpsPublishTemplate: 'rtmps://{domain}:{rtmpsPort}/{path}',
    rtspPlaybackTemplate: 'rtsp://{domain}:{rtspPort}/{path}',
    hlsPlaybackTemplate: '{hlsBaseUrl}/{path}/index.m3u8',
    webrtcPlaybackTemplate: '{webrtcBaseUrl}/{path}',
  }
}

/** Protocols that can publish (ingest) INTO MediaMTX on a publisher path. */
export const INGEST_PROTOCOLS = ['srt', 'rtmp', 'rtmps', 'rtsp', 'webrtc'] as const
export type IngestProtocol = (typeof INGEST_PROTOCOLS)[number]

/** Protocols that viewers can use to read (playback) FROM MediaMTX. */
export const PLAYBACK_PROTOCOLS = ['hls', 'webrtc', 'rtsp', 'rtmp', 'srt'] as const
export type PlaybackProtocol = (typeof PLAYBACK_PROTOCOLS)[number]

export const INGEST_PROTOCOL_LABELS: Record<IngestProtocol, string> = {
  srt: 'SRT',
  rtmp: 'RTMP',
  rtmps: 'RTMPS',
  rtsp: 'RTSP',
  webrtc: 'WebRTC (WHIP)',
}

export const PLAYBACK_PROTOCOL_LABELS: Record<PlaybackProtocol, string> = {
  hls: 'HLS',
  webrtc: 'WebRTC (WHEP)',
  rtsp: 'RTSP',
  rtmp: 'RTMP',
  srt: 'SRT',
}

/** Short, human help describing how an encoder connects for each ingest protocol. */
export const INGEST_PROTOCOL_HINTS: Record<IngestProtocol, string> = {
  srt: 'Configure your encoder as an SRT caller. MediaMTX is the listener; the streamid selects the path.',
  rtmp: 'Push RTMP — in OBS set "Server" to the URL up to the path and "Stream key" to the path segment.',
  rtmps: 'Push RTMPS (TLS). Requires RTMPS certs configured on MediaMTX.',
  rtsp: 'Publish via RTSP ANNOUNCE, e.g. ffmpeg -rtsp_transport tcp -f rtsp <url>.',
  webrtc: 'Publish from a browser or WHIP-capable encoder to the WHIP endpoint.',
}

export function applyTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`))
}

export type StreamUrls = {
  // Ingest (publish into MediaMTX)
  srtPublish: string
  rtmpPublish: string
  rtmpsPublish: string
  rtspPublish: string
  webrtcWhip: string
  // Playback (read from MediaMTX)
  hlsPlayback: string
  webrtcPlayback: string
  webrtcWhep: string
  rtspPlayback: string
  rtmpPlayback: string
  srtRead: string
}

export function buildStreamUrls(path: string, templates?: Partial<UrlTemplates>): StreamUrls {
  const t = { ...getDefaultUrlTemplates(), ...templates }
  const vars = {
    domain: t.publicStreamDomain,
    path,
    srtPort: t.srtPort,
    rtmpPort: t.rtmpPort,
    rtmpsPort: t.rtmpsPort,
    rtspPort: t.rtspPort,
    hlsBaseUrl: t.hlsBaseUrl.replace(/\/$/, ''),
    webrtcBaseUrl: t.webrtcBaseUrl.replace(/\/$/, ''),
  }

  const webrtcBase = applyTemplate(t.webrtcPlaybackTemplate, vars)

  return {
    srtPublish: applyTemplate(t.srtPublishTemplate, vars),
    rtmpPublish: applyTemplate(t.rtmpPublishTemplate, vars),
    rtmpsPublish: applyTemplate(t.rtmpsPublishTemplate, vars),
    rtspPublish: applyTemplate(t.rtspPlaybackTemplate, vars),
    webrtcWhip: `${webrtcBase.replace(/\/$/, '')}/whip`,
    hlsPlayback: applyTemplate(t.hlsPlaybackTemplate, vars),
    webrtcPlayback: webrtcBase,
    webrtcWhep: `${webrtcBase.replace(/\/$/, '')}/whep`,
    rtspPlayback: applyTemplate(t.rtspPlaybackTemplate, vars),
    rtmpPlayback: applyTemplate(t.rtmpPublishTemplate, vars),
    srtRead: applyTemplate(t.srtReadTemplate, vars),
  }
}

/** Resolve the ingest URL a publisher should use for a given protocol. */
export function getIngestUrl(urls: StreamUrls, protocol: IngestProtocol): string {
  switch (protocol) {
    case 'srt':
      return urls.srtPublish
    case 'rtmp':
      return urls.rtmpPublish
    case 'rtmps':
      return urls.rtmpsPublish
    case 'rtsp':
      return urls.rtspPublish
    case 'webrtc':
      return urls.webrtcWhip
  }
}

/**
 * A single, independently-copyable value an encoder asks for (e.g. RTMP "Server",
 * SRT "Stream ID"). Decomposes an ingest connection into the discrete fields
 * encoder UIs expose, each with one-line guidance.
 */
export type IngestField = { label: string; value: string; hint: string }

/** Discrete connection details for publishing into MediaMTX with one protocol. */
export type IngestConnection = {
  protocol: IngestProtocol
  label: string
  /** One-line guidance for the whole connection. */
  note: string
  fields: IngestField[]
}

/**
 * Break an ingest connection into the exact fields an encoder asks for, so each
 * value gets its own copy button instead of forcing operators to string-parse a
 * combined URL (e.g. OBS "Custom" splits Server + Stream Key; SRT needs Host,
 * Port and a publish Stream ID separately).
 */
export function getIngestConnection(
  path: string,
  protocol: IngestProtocol,
  templates?: Partial<UrlTemplates>,
): IngestConnection {
  const t = { ...getDefaultUrlTemplates(), ...templates }
  const urls = buildStreamUrls(path, t)
  const label = INGEST_PROTOCOL_LABELS[protocol]

  switch (protocol) {
    case 'rtmp':
      return {
        protocol,
        label,
        note: 'In OBS pick Service "Custom", then paste Server and Stream Key into the two fields.',
        fields: [
          {
            label: 'Server',
            value: `rtmp://${t.publicStreamDomain}:${t.rtmpPort}`,
            hint: 'OBS → Settings → Stream → Server.',
          },
          {
            label: 'Stream Key',
            value: path,
            hint: 'OBS → Settings → Stream → Stream Key.',
          },
        ],
      }
    case 'rtmps':
      return {
        protocol,
        label,
        note: 'In OBS pick Service "Custom" with a secure server. Requires RTMPS certs configured on MediaMTX.',
        fields: [
          {
            label: 'Server',
            value: `rtmps://${t.publicStreamDomain}:${t.rtmpsPort}`,
            hint: 'OBS → Settings → Stream → Server.',
          },
          {
            label: 'Stream Key',
            value: path,
            hint: 'OBS → Settings → Stream → Stream Key.',
          },
        ],
      }
    case 'srt':
      return {
        protocol,
        label,
        note: 'MediaMTX is the SRT listener; configure your encoder as the caller.',
        fields: [
          { label: 'Mode', value: 'Caller', hint: 'Encoder dials out; MediaMTX listens.' },
          { label: 'Host', value: t.publicStreamDomain, hint: 'MediaMTX host or domain.' },
          { label: 'Port', value: String(t.srtPort), hint: 'MediaMTX SRT listener port.' },
          {
            label: 'Stream ID',
            value: `publish:${path}`,
            hint: 'Selects the path and the publish role.',
          },
        ],
      }
    case 'rtsp':
      return {
        protocol,
        label,
        note: 'Publish via RTSP ANNOUNCE, e.g. ffmpeg -rtsp_transport tcp -f rtsp <url>.',
        fields: [
          {
            label: 'Announce URL',
            value: urls.rtspPublish,
            hint: 'Target URL for the RTSP publisher.',
          },
        ],
      }
    case 'webrtc':
      return {
        protocol,
        label,
        note: 'Publish from a browser or WHIP-capable encoder to the WHIP endpoint.',
        fields: [
          {
            label: 'WHIP URL',
            value: urls.webrtcWhip,
            hint: 'WebRTC publish (WHIP) endpoint.',
          },
        ],
      }
  }
}

/** Resolve the playback URL viewers should use for a given protocol. */
export function getPlaybackUrl(urls: StreamUrls, protocol: PlaybackProtocol): string {
  switch (protocol) {
    case 'hls':
      return urls.hlsPlayback
    case 'webrtc':
      return urls.webrtcWhep
    case 'rtsp':
      return urls.rtspPlayback
    case 'rtmp':
      return urls.rtmpPlayback
    case 'srt':
      return urls.srtRead
  }
}

export function buildEmbedSnippet(playerUrl: string, width = 640, height = 360): string {
  return `<iframe src="${playerUrl}" width="${width}" height="${height}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`
}

/** MediaMTX WHIP endpoint for WebRTC publish (append to webrtcPlayback URL). */
export function buildWhipUrl(webrtcPlayback: string): string {
  return `${webrtcPlayback.replace(/\/$/, '')}/whip`
}

/** MediaMTX WHEP endpoint for WebRTC playback (append to webrtcPlayback URL). */
export function buildWhepUrl(webrtcPlayback: string): string {
  return `${webrtcPlayback.replace(/\/$/, '')}/whep`
}

export function buildWordPressShortcode(playerUrl: string, width = 640, height = 360): string {
  return `[mtxfoil_player url="${playerUrl}" width="${width}" height="${height}"]`
}
