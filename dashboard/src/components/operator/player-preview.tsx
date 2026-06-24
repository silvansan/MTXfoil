'use client'

import { useState } from 'react'

import { HlsPlayer } from '@/components/operator/hls-player'
import { WebRtcPlayer } from '@/components/operator/webrtc-player'
import { Button } from '@/components/ui/button'

type Mode = 'hls' | 'webrtc'

export function PlayerPreview({
  hlsSrc,
  whepUrl,
}: {
  hlsSrc: string
  whepUrl: string
}) {
  const [mode, setMode] = useState<Mode>('hls')

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'hls' ? 'default' : 'secondary'}
          onClick={() => setMode('hls')}
        >
          HLS
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'webrtc' ? 'default' : 'secondary'}
          onClick={() => setMode('webrtc')}
        >
          WebRTC
        </Button>
      </div>
      {mode === 'hls' ? <HlsPlayer src={hlsSrc} /> : <WebRtcPlayer whepUrl={whepUrl} />}
    </div>
  )
}
