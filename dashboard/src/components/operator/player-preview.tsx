'use client'

import { useState } from 'react'

import { useWhep } from '@/components/operator/use-whep'
import { VideoJsPlayer } from '@/components/operator/videojs-player'
import { Button } from '@/components/ui/button'

type Mode = 'hls' | 'webrtc'

export function PlayerPreview({
  hlsSrc,
  whepUrl,
  authHeader,
}: {
  hlsSrc: string
  whepUrl: string
  authHeader?: string
}) {
  const [mode, setMode] = useState<Mode>('hls')
  const [hlsOffline, setHlsOffline] = useState(false)

  // Only negotiate WebRTC while its tab is active.
  const { stream, error: whepError } = useWhep(mode === 'webrtc' ? whepUrl : undefined, authHeader)

  const offlineMessage =
    mode === 'webrtc'
      ? whepError
      : hlsOffline
        ? 'Waiting for a publisher to start sending media to this path.'
        : null

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Playback mode" className="flex gap-2">
        <Button
          type="button"
          size="sm"
          role="tab"
          aria-selected={mode === 'hls'}
          variant={mode === 'hls' ? 'default' : 'secondary'}
          onClick={() => {
            setHlsOffline(false)
            setMode('hls')
          }}
        >
          HLS
        </Button>
        <Button
          type="button"
          size="sm"
          role="tab"
          aria-selected={mode === 'webrtc'}
          variant={mode === 'webrtc' ? 'default' : 'secondary'}
          onClick={() => setMode('webrtc')}
        >
          WebRTC
        </Button>
      </div>

      <div
        role="tabpanel"
        aria-label={mode === 'hls' ? 'HLS playback' : 'WebRTC playback'}
        className="relative"
      >
        <VideoJsPlayer
          key={mode}
          src={mode === 'hls' ? hlsSrc : undefined}
          stream={mode === 'webrtc' ? stream : null}
          authHeader={mode === 'hls' ? authHeader : undefined}
          onError={() => mode === 'hls' && setHlsOffline(true)}
          onPlaying={() => mode === 'hls' && setHlsOffline(false)}
        />
        {offlineMessage && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/70 text-center"
          >
            <p className="text-sm font-medium text-white">Stream is offline</p>
            <p className="mt-1 px-4 text-xs text-subtle">{offlineMessage}</p>
          </div>
        )}
      </div>
    </div>
  )
}
