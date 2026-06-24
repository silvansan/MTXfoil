/**
 * Hand-curated types for paths/recordings used by the dashboard.
 * For the full MediaMTX OpenAPI schema, run `npm run generate:openapi` (see openapi-types.ts).
 */

export type PathSource =
  | { type: 'publisher' }
  | { type: 'redirect'; redirect: string }
  | { type: 'rpiCamera' }
  | { type: 'rpiCameraSecondary' }
  | { type: 'srtSource'; id: string }
  | { type: 'rtspSource'; id: string }
  | { type: 'rtspsSource'; id: string }
  | { type: 'rtmpSource'; id: string }
  | { type: 'rtmpsSource'; id: string }
  | { type: 'hlsSource'; id: string }
  | { type: 'webrtcSource'; id: string }
  | { type: 'webRTCSession'; id: string }

export type PathConf = {
  name: string
  source?: string
  sourceFingerprint?: string
  sourceOnDemand?: boolean
  sourceOnDemandStartTimeout?: string
  sourceOnDemandCloseAfter?: string
  maxReaders?: number
  srtReadPassphrase?: string
  fallback?: string
  useAbsoluteTimestamp?: boolean
  record?: boolean
  recordPath?: string
  recordFormat?: string
  recordPartDuration?: string
  recordSegmentDuration?: string
  recordDeleteAfter?: string
  overridePublisher?: boolean
  srtPublishPassphrase?: string
  rtspTransport?: string
  rtspAnyPort?: boolean
  rtspRangeType?: string
  rtspRangeStart?: string
  sourceRedirect?: string
  rpiCameraCamID?: number
  rpiCameraSecondary?: boolean
  rpiCameraWidth?: number
  rpiCameraHeight?: number
  rpiCameraHFlip?: boolean
  rpiCameraVFlip?: boolean
  rpiCameraBrightness?: number
  rpiCameraContrast?: number
  rpiCameraSaturation?: number
  rpiCameraSharpness?: number
  rpiCameraExposure?: string
  rpiCameraAWB?: string
  rpiCameraAWBGains?: number[]
  rpiCameraDenoise?: string
  rpiCameraShutter?: number
  rpiCameraMetering?: string
  rpiCameraGain?: number
  rpiCameraEV?: number
  rpiCameraROI?: string
  rpiCameraHDR?: boolean
  rpiCameraTuningFile?: string
  rpiCameraMode?: string
  rpiCameraFPS?: number
  rpiCameraAfMode?: string
  rpiCameraAfRange?: string
  rpiCameraAfSpeed?: string
  rpiCameraLensPosition?: number
  rpiCameraAfWindow?: string
  rpiCameraFlickerPeriod?: number
  rpiCameraTextOverlayEnable?: boolean
  rpiCameraTextOverlay?: string
  rpiCameraCodec?: string
  rpiCameraIDRPeriod?: number
  rpiCameraBitrate?: number
  rpiCameraProfile?: string
  rpiCameraLevel?: string
  runOnInit?: string
  runOnInitRestart?: boolean
  runOnDemand?: string
  runOnDemandRestart?: boolean
  runOnDemandStartTimeout?: string
  runOnDemandCloseAfter?: string
  runOnUnDemand?: string
  runOnReady?: string
  runOnReadyRestart?: boolean
  runOnNotReady?: string
  runOnRead?: string
  runOnReadRestart?: boolean
  runOnUnread?: string
  runOnRecordSegmentCreate?: string
  runOnRecordSegmentComplete?: string
}

export type Path = {
  name: string
  confName: string
  source: PathSource | null
  ready: boolean
  readyTime: string | null
  tracks: Array<{ id: number; type: string; codec: string }>
  bytesReceived: number
  bytesSent: number
  readers: Array<{
    type: string
    id: string
  }>
}

export type PathList = {
  pageCount: number
  itemCount: number
  items: Path[]
}

export type GlobalConf = Record<string, unknown>

export type RecordingSegment = {
  start: string
  duration: number
  path: string
}

export type RecordingList = {
  pageCount: number
  itemCount: number
  items: RecordingSegment[]
}
