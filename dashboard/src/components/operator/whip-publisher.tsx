'use client'

import { useEffect, useRef } from 'react'

import { useWhip } from '@/components/operator/use-whip'
import { Button } from '@/components/ui/button'
import { CodeSnippet } from '@/components/operator/code-snippet'

export function WhipPublisher({
  whipUrl,
  authHeader,
}: {
  whipUrl: string
  authHeader?: string
}) {
  const previewRef = useRef<HTMLVideoElement>(null)
  const { localStream, status, error, start, stop } = useWhip(whipUrl, authHeader)

  useEffect(() => {
    const video = previewRef.current
    if (!video) return
    video.srcObject = localStream
    if (localStream) void video.play().catch(() => {})
    return () => {
      video.srcObject = null
    }
  }, [localStream])

  const busy = status === 'connecting'
  const live = status === 'live'

  return (
    <div className="space-y-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <video
          ref={previewRef}
          playsInline
          muted
          className="h-full w-full object-contain"
        />
        {!localStream && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
            Camera preview appears after you start publishing
          </div>
        )}
        {error && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-red-950/80 px-4 py-2 text-center text-sm text-red-200">
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy || live} onClick={() => void start()}>
          {busy ? 'Connecting…' : 'Start publishing'}
        </Button>
        <Button type="button" variant="secondary" disabled={!live && !busy} onClick={() => void stop()}>
          Stop
        </Button>
        {live && (
          <span className="self-center text-sm text-emerald-400">Live — viewers can play this path</span>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-zinc-500">
          WHIP endpoint (for OBS, browser tools, or other encoders):
        </p>
        <CodeSnippet value={whipUrl} copyLabel="Copy WHIP URL" />
      </div>
    </div>
  )
}
