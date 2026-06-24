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

export function applyTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`))
}

export type StreamUrls = {
  srtPublish: string
  srtRead: string
  rtmpPublish: string
  rtmpsPublish: string
  rtspPlayback: string
  hlsPlayback: string
  webrtcPlayback: string
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

  return {
    srtPublish: applyTemplate(t.srtPublishTemplate, vars),
    srtRead: applyTemplate(t.srtReadTemplate, vars),
    rtmpPublish: applyTemplate(t.rtmpPublishTemplate, vars),
    rtmpsPublish: applyTemplate(t.rtmpsPublishTemplate, vars),
    rtspPlayback: applyTemplate(t.rtspPlaybackTemplate, vars),
    hlsPlayback: applyTemplate(t.hlsPlaybackTemplate, vars),
    webrtcPlayback: applyTemplate(t.webrtcPlaybackTemplate, vars),
  }
}

export function buildEmbedSnippet(playerUrl: string, width = 640, height = 360): string {
  return `<iframe src="${playerUrl}" width="${width}" height="${height}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`
}

/** MediaMTX WHEP endpoint for WebRTC playback (append to webrtcPlayback URL). */
export function buildWhepUrl(webrtcPlayback: string): string {
  return `${webrtcPlayback.replace(/\/$/, '')}/whep`
}

export function buildWordPressShortcode(playerUrl: string, width = 640, height = 360): string {
  return `[mtxfoil_player url="${playerUrl}" width="${width}" height="${height}"]`
}
