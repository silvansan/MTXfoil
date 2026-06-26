'use client'

import { useEffect, useState } from 'react'

export type WhepState = {
  /** The negotiated inbound media, or null while connecting / on error. */
  stream: MediaStream | null
  /** Human-readable error, or null. */
  error: string | null
}

/**
 * Negotiate a WebRTC (WHEP) playback session against MediaMTX and expose the
 * resulting inbound `MediaStream`. The stream is meant to be fed into the
 * shared video.js player via its `srcObject`, so WebRTC and HLS share one UI.
 *
 * Pass `undefined` for `whepUrl` to keep the connection idle (e.g. when the
 * WebRTC tab is not active).
 */
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

export function useWhep(whepUrl: string | undefined, authHeader?: string): WhepState {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!whepUrl) {
      setStream(null)
      setError(null)
      return
    }

    let pc: RTCPeerConnection | null = null
    let cancelled = false
    setStream(null)
    setError(null)

    async function connect() {
      pc = new RTCPeerConnection()
      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })

      pc.ontrack = (event) => {
        if (event.streams[0] && !cancelled) setStream(event.streams[0])
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await waitForIceGathering(pc)

      const res = await fetch(whepUrl as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: offer.sdp,
      })

      if (!res.ok) {
        // 404 (path has no publisher) and 400 (no media yet) are the normal
        // "offline" responses — surface a human-readable message.
        if (res.status === 404 || res.status === 400) {
          throw new Error('Stream is offline — waiting for a publisher.')
        }
        if (res.status === 401) {
          throw new Error('Not authorized to read this stream.')
        }
        throw new Error(`WHEP request failed (${res.status})`)
      }

      const answer = await res.text()
      if (cancelled || !pc) return
      await pc.setRemoteDescription({ type: 'answer', sdp: answer })
    }

    connect().catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'WebRTC connection failed')
      }
    })

    return () => {
      cancelled = true
      pc?.close()
      setStream(null)
    }
  }, [whepUrl, authHeader])

  return { stream, error }
}
