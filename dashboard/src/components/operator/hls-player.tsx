'use client'

import Hls from 'hls.js'
import { useEffect, useRef } from 'react'

export function HlsPlayer({ src, autoplay = true }: { src: string; autoplay?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      if (autoplay) void video.play().catch(() => {})
      return
    }

    if (!Hls.isSupported()) return

    const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
    hls.loadSource(src)
    hls.attachMedia(video)
    if (autoplay) {
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play().catch(() => {})
      })
    }

    return () => hls.destroy()
  }, [src, autoplay])

  return <video ref={videoRef} controls playsInline className="aspect-video w-full rounded-lg bg-black" />
}
