'use client'

import { useWhip } from '@/components/operator/use-whip'
import { Button } from '@/components/ui/button'

export function WhipPublisher({
  whipUrl,
  authHeader,
}: {
  whipUrl: string
  authHeader?: string
}) {
  const { publishing, error, localStream, start, stop } = useWhip(whipUrl, authHeader)

  const startScreen = async () => {
    const media = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    await start(media)
  }

  return (
    <div className="space-y-4">
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        {localStream ? (
          <video
            className="h-full w-full object-contain"
            autoPlay
            muted
            playsInline
            aria-label="Local camera preview"
            ref={(el) => {
              if (el) el.srcObject = localStream
            }}
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-sm text-subtle"
            aria-hidden="true"
          >
            Camera preview appears here when publishing starts.
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!publishing ? (
          <>
            <Button type="button" onClick={() => start({ video: true, audio: true })}>
              Start camera + mic
            </Button>
            <Button type="button" variant="secondary" onClick={() => void startScreen().catch(() => {})}>
              Share screen
            </Button>
          </>
        ) : (
          <Button type="button" variant="destructive" onClick={stop}>
            Stop publishing
          </Button>
        )}
      </div>

      {publishing && (
        <p className="text-sm text-emerald-400" role="status" aria-live="polite">
          Publishing to MediaMTX via WHIP.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-subtle">
        Endpoint: <span className="font-mono break-all">{whipUrl}</span>
      </p>
    </div>
  )
}
