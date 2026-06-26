import type { Payload } from 'payload'

import { getDefaultUrlTemplates, type UrlTemplates } from '@/lib/mediamtx/urls'

type SystemSettingsGlobal = {
  publicStreamDomain?: string | null
  hlsBaseUrl?: string | null
  webrtcBaseUrl?: string | null
  ports?: {
    srt?: number | null
    rtmp?: number | null
    rtmps?: number | null
    rtsp?: number | null
    hls?: number | null
    webrtcHttp?: number | null
    webrtcIce?: number | null
  } | null
  urlTemplates?: {
    srtPublish?: string | null
    srtRead?: string | null
    rtmpPublish?: string | null
    rtmpsPublish?: string | null
    hlsPlayback?: string | null
    webrtcPlayback?: string | null
  } | null
}

/** Merge SystemSettings global over env defaults for URL building. */
export function mergeSystemSettings(
  defaults: UrlTemplates,
  settings?: SystemSettingsGlobal | null,
): UrlTemplates {
  if (!settings) return defaults

  const ports = settings.ports
  const templates = settings.urlTemplates

  return {
    ...defaults,
    publicStreamDomain: settings.publicStreamDomain?.trim() || defaults.publicStreamDomain,
    srtPort: ports?.srt ?? defaults.srtPort,
    rtmpPort: ports?.rtmp ?? defaults.rtmpPort,
    rtmpsPort: ports?.rtmps ?? defaults.rtmpsPort,
    rtspPort: ports?.rtsp ?? defaults.rtspPort,
    hlsBaseUrl: settings.hlsBaseUrl?.trim() || defaults.hlsBaseUrl,
    webrtcBaseUrl: settings.webrtcBaseUrl?.trim() || defaults.webrtcBaseUrl,
    srtPublishTemplate: templates?.srtPublish?.trim() || defaults.srtPublishTemplate,
    srtReadTemplate: templates?.srtRead?.trim() || defaults.srtReadTemplate,
    rtmpPublishTemplate: templates?.rtmpPublish?.trim() || defaults.rtmpPublishTemplate,
    rtmpsPublishTemplate: templates?.rtmpsPublish?.trim() || defaults.rtmpsPublishTemplate,
    hlsPlaybackTemplate: templates?.hlsPlayback?.trim() || defaults.hlsPlaybackTemplate,
    webrtcPlaybackTemplate: templates?.webrtcPlayback?.trim() || defaults.webrtcPlaybackTemplate,
  }
}

export async function loadUrlTemplates(payload: Payload): Promise<UrlTemplates> {
  const defaults = getDefaultUrlTemplates()
  try {
    const settings = await payload.findGlobal({ slug: 'system-settings' })
    return mergeSystemSettings(defaults, settings as SystemSettingsGlobal)
  } catch {
    return defaults
  }
}
