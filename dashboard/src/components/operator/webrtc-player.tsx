'use client'

import { useEffect, useRef, useState } from 'react'

export function WebRtcPlayer({ whepUrl, autoplay = true }: { whepUrl: string; autoplay?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !whepUrl) return

    let pc: RTCPeerConnection | null = null
    let cancelled = false

    async function connect() {
      setError(null)
      pc = new RTCPeerConnection()
      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })

      pc.ontrack = (event) => {
        if (video && event.streams[0]) {
          video.srcObject = event.streams[0]
          if (autoplay) void video.play().catch(() => {})
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const res = await fetch(whepUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })

      if (!res.ok) {
        throw new Error(`WHEP ${res.status}`)
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
      if (video) video.srcObject = null
    }
  }, [whepUrl, autoplay])

  return (
    <div className="space-y-2">
      <video ref={videoRef} controls playsInline className="aspect-video w-full rounded-lg bg-black" />
      {error && <p className="text-sm text-red-400">WebRTC: {error}</p>}
    </div>
  )
}
