/** Map ProtocolSettings global fields → MediaMTX global YAML/API patch. */
export function buildProtocolPatch(protocol: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  const yesNo = (value: unknown) => (value ? 'yes' : 'no')

  if (protocol.srtEnabled !== undefined) patch.srt = yesNo(protocol.srtEnabled)
  if (protocol.srtAddress) patch.srtAddress = protocol.srtAddress
  if (protocol.srtPublishPassphrase) patch.srtPublishPassphrase = protocol.srtPublishPassphrase

  if (protocol.rtmpEnabled !== undefined) patch.rtmp = yesNo(protocol.rtmpEnabled)
  if (protocol.rtmpAddress) patch.rtmpAddress = protocol.rtmpAddress

  const rtmpsKey = String(protocol.rtmpsServerKey || '').trim()
  const rtmpsCert = String(protocol.rtmpsServerCert || '').trim()
  const rtmpsCertsReady = Boolean(rtmpsKey && rtmpsCert)
  if (protocol.rtmpsEnabled && rtmpsCertsReady) {
    patch.rtmps = 'yes'
    if (protocol.rtmpsAddress) patch.rtmpsAddress = protocol.rtmpsAddress
    patch.rtmpServerKey = rtmpsKey
    patch.rtmpServerCert = rtmpsCert
  } else if (protocol.rtmpsEnabled !== undefined || protocol.rtmpEnabled !== undefined) {
    patch.rtmps = 'no'
  }

  if (protocol.hlsEnabled !== undefined) patch.hls = yesNo(protocol.hlsEnabled)
  if (protocol.hlsAddress) patch.hlsAddress = protocol.hlsAddress

  const hlsVariant = protocol.hlsLowLatency ? 'lowLatency' : protocol.hlsVariant
  if (hlsVariant) patch.hlsVariant = hlsVariant
  if (protocol.hlsPartDuration) patch.hlsPartDuration = protocol.hlsPartDuration
  if (protocol.hlsSegmentDuration) patch.hlsSegmentDuration = protocol.hlsSegmentDuration

  if (protocol.webrtcEnabled !== undefined) patch.webrtc = yesNo(protocol.webrtcEnabled)
  if (protocol.webrtcAddress) patch.webrtcAddress = protocol.webrtcAddress

  if (protocol.rtspEnabled !== undefined) patch.rtsp = yesNo(protocol.rtspEnabled)
  if (protocol.rtspAddress) patch.rtspAddress = protocol.rtspAddress

  if (protocol.apiEnabled !== undefined) patch.api = yesNo(protocol.apiEnabled)
  if (protocol.metricsEnabled !== undefined) patch.metrics = yesNo(protocol.metricsEnabled)
  if (protocol.playbackEnabled !== undefined) patch.playback = yesNo(protocol.playbackEnabled)

  return patch
}

export function rtmpsIngestAvailable(protocol: Record<string, unknown>): boolean {
  return Boolean(
    protocol.rtmpsEnabled &&
      String(protocol.rtmpsServerKey || '').trim() &&
      String(protocol.rtmpsServerCert || '').trim(),
  )
}
