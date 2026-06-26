'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type WhipState = {
  publishing: boolean
  error: string | null
  localStream: MediaStream | null
}

async function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 4000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return
  await new Promise<void>((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', onChange)
      resolve()
    }
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') done()
    }
    pc.addEventListener('icegatheringstatechange', onChange)
    setTimeout(done, timeoutMs)
  })
}

/**
 * Publish camera/screen to a MediaMTX WHIP endpoint (POST application/sdp).
 */
export function useWhip(
  whipUrl: string | undefined,
  authHeader?: string,
): WhipState & {
  start: (constraintsOrStream?: MediaStreamConstraints | MediaStream) => Promise<void>
  stop: () => void
} {
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const sessionUrlRef = useRef<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    const sessionUrl = sessionUrlRef.current
    sessionUrlRef.current = null
    if (sessionUrl) {
      void fetch(sessionUrl, {
        method: 'DELETE',
        headers: authHeader ? { Authorization: authHeader } : undefined,
      }).catch(() => {})
    }
    pcRef.current?.close()
    pcRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setLocalStream(null)
    setPublishing(false)
  }, [authHeader])

  const stop = useCallback(() => {
    setError(null)
    cleanup()
  }, [cleanup])

  const start = useCallback(
    async (
      constraintsOrStream: MediaStreamConstraints | MediaStream = { video: true, audio: true },
    ) => {
      if (!whipUrl) return
      stop()
      setError(null)

      try {
        const media =
          constraintsOrStream instanceof MediaStream
            ? constraintsOrStream
            : await navigator.mediaDevices.getUserMedia(constraintsOrStream)
        streamRef.current = media
        setLocalStream(media)

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        })
        pcRef.current = pc
        media.getTracks().forEach((track) => pc.addTrack(track, media))

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await waitForIceGathering(pc)

        const res = await fetch(whipUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sdp',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          body: pc.localDescription?.sdp ?? offer.sdp,
        })

        if (!res.ok) {
          if (res.status === 401) throw new Error('Not authorized to publish to this path.')
          throw new Error(`WHIP publish failed (${res.status})`)
        }

        const location = res.headers.get('Location')
        if (location) {
          sessionUrlRef.current = new URL(location, whipUrl).toString()
        }

        const answer = await res.text()
        await pc.setRemoteDescription({ type: 'answer', sdp: answer })
        setPublishing(true)
      } catch (err) {
        cleanup()
        setError(err instanceof Error ? err.message : 'WHIP publish failed')
      }
    },
    [authHeader, cleanup, stop, whipUrl],
  )

  useEffect(() => () => cleanup(), [cleanup])

  return { publishing, error, localStream, start, stop }
}
