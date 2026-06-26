'use client'

import { useCallback, useRef, useState } from 'react'

export type WhipStatus = 'idle' | 'connecting' | 'live' | 'error'

export type WhipState = {
  localStream: MediaStream | null
  status: WhipStatus
  error: string | null
  start: () => Promise<void>
  stop: () => Promise<void>
}

/**
 * Negotiate a WebRTC (WHIP) publish session against MediaMTX. Unlike WHEP
 * playback, publishing is user-initiated (camera/mic permission + Start).
 */
export function useWhip(whipUrl: string, authHeader?: string): WhipState {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<WhipStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const sessionUrlRef = useRef<string | null>(null)
  const mediaRef = useRef<MediaStream | null>(null)

  const stop = useCallback(async () => {
    const sessionUrl = sessionUrlRef.current
    sessionUrlRef.current = null

    if (sessionUrl) {
      try {
        await fetch(sessionUrl, {
          method: 'DELETE',
          headers: authHeader ? { Authorization: authHeader } : undefined,
        })
      } catch {
        // Best-effort teardown; local tracks are stopped regardless.
      }
    }

    pcRef.current?.close()
    pcRef.current = null

    mediaRef.current?.getTracks().forEach((track) => track.stop())
    mediaRef.current = null
    setLocalStream(null)
    setStatus('idle')
    setError(null)
  }, [authHeader])

  const start = useCallback(async () => {
    if (!whipUrl) return

    setError(null)
    setStatus('connecting')

    try {
      await stop()

      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      mediaRef.current = media
      setLocalStream(media)

      const pc = new RTCPeerConnection()
      pcRef.current = pc
      media.getTracks().forEach((track) => pc.addTrack(track, media))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const res = await fetch(whipUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: offer.sdp,
      })

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Not authorized to publish to this path.')
        }
        throw new Error(`WHIP request failed (${res.status})`)
      }

      const location = res.headers.get('Location')
      if (location) {
        sessionUrlRef.current = new URL(location, whipUrl).toString()
      }

      const answer = await res.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answer })
      setStatus('live')
    } catch (err) {
      await stop()
      setStatus('error')
      setError(err instanceof Error ? err.message : 'WebRTC publish failed')
    }
  }, [authHeader, stop, whipUrl])

  return { localStream, status, error, start, stop }
}
