'use client'

import 'video.js/dist/video-js.css'

import videojs from 'video.js'
import type Player from 'video.js/dist/types/player'
import { useEffect, useRef } from 'react'

type VideoJsPlayerProps = {
  /** HLS (or other VHS-compatible) source URL. Ignored when `stream` is set. */
  src?: string
  /**
   * A live `MediaStream` (e.g. negotiated via WebRTC/WHEP). When provided it is
   * attached to the underlying media element via `srcObject`, so WebRTC renders
   * inside the same video.js skin/controls as HLS.
   */
  stream?: MediaStream | null
  /** MIME type of the HLS source. Defaults to HLS. */
  type?: string
  autoplay?: boolean
  muted?: boolean
  controls?: boolean
  /**
   * Optional `Authorization` header value (e.g. `Basic ...`). When set, it is
   * attached to every VHS request (playlists + segments) so MediaMTX serves
   * protected streams without triggering a native Basic Auth dialog. Only
   * relevant for HLS playback.
   */
  authHeader?: string
  className?: string
  /** Fired when the player surfaces a fatal error (e.g. stream offline). */
  onError?: (message: string) => void
  /** Fired once media starts playing, so callers can clear an offline overlay. */
  onPlaying?: () => void
}

// VHS exposes global request hooks; they are not in the published typings.
type VhsRequestOptions = { headers?: Record<string, string>; [key: string]: unknown }
type VhsRequestHook = (options: VhsRequestOptions) => VhsRequestOptions
type VhsXhr = {
  // Modern VHS (video.js 8 / @videojs/http-streaming 3): register/unregister hooks.
  onRequest?: (hook: VhsRequestHook) => void
  offRequest?: (hook: VhsRequestHook) => void
  // Legacy single-hook property (deprecated, kept as a fallback).
  beforeRequest?: VhsRequestHook
}
function getVhsXhr(): VhsXhr | undefined {
  const vhs = (videojs as unknown as { Vhs?: { xhr?: VhsXhr } }).Vhs
  return vhs?.xhr
}

/** Reach the native <video> element video.js decorates, to set `srcObject`. */
function getMediaEl(player: Player): HTMLVideoElement | undefined {
  const tech = (
    player as unknown as {
      tech?: (opts?: unknown) => { el?: () => HTMLVideoElement } | undefined
    }
  ).tech?.({ IWillNotUseThisInPlugins: true })
  return tech?.el?.()
}

export function VideoJsPlayer({
  src,
  stream,
  type = 'application/x-mpegURL',
  autoplay = true,
  muted = true,
  controls = true,
  authHeader,
  className,
  onError,
  onPlaying,
}: VideoJsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<Player | null>(null)
  const onErrorRef = useRef(onError)
  const onPlayingRef = useRef(onPlaying)
  onErrorRef.current = onError
  onPlayingRef.current = onPlaying

  // Keep the auth header in sync for the VHS global request hook. Prefer the
  // modern onRequest/offRequest API and fall back to the deprecated property.
  useEffect(() => {
    const xhr = getVhsXhr()
    if (!xhr || !authHeader) return

    const hook: VhsRequestHook = (options) => {
      options.headers = { ...(options.headers ?? {}), Authorization: authHeader }
      return options
    }

    if (typeof xhr.onRequest === 'function') {
      xhr.onRequest(hook)
      return () => {
        getVhsXhr()?.offRequest?.(hook)
      }
    }

    xhr.beforeRequest = hook
    return () => {
      const x = getVhsXhr()
      if (x) x.beforeRequest = undefined
    }
  }, [authHeader])

  // Create the player once.
  useEffect(() => {
    if (!containerRef.current || playerRef.current) return

    // video.js works best when it owns a fresh <video-js> element rather than
    // a React-rendered one, so create it imperatively inside our container.
    const videoEl = document.createElement('video-js')
    videoEl.classList.add('vjs-big-play-centered')
    containerRef.current.appendChild(videoEl)

    const player = videojs(videoEl, {
      controls,
      autoplay,
      muted,
      preload: 'auto',
      fluid: true,
      responsive: true,
      playsinline: true,
      html5: {
        vhs: { overrideNative: true, lowLatencyMode: true },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
    })

    player.on('error', () => {
      const err = player.error()
      onErrorRef.current?.(err?.message || 'Stream is offline')
    })
    player.on('playing', () => {
      onPlayingRef.current?.()
    })

    playerRef.current = player
  }, [autoplay, muted, controls])

  // HLS source: only when there is no live MediaStream.
  useEffect(() => {
    const player = playerRef.current
    if (!player || player.isDisposed()) return
    if (src && !stream) {
      player.src({ src, type })
    }
  }, [src, type, stream])

  // WebRTC MediaStream: attach to the native media element via srcObject.
  useEffect(() => {
    const player = playerRef.current
    if (!player || player.isDisposed()) return
    const mediaEl = getMediaEl(player)
    if (!mediaEl) return

    if (stream) {
      mediaEl.srcObject = stream
      if (autoplay) void player.play()?.catch(() => {})
    } else {
      mediaEl.srcObject = null
    }

    return () => {
      const el = getMediaEl(player)
      if (el) el.srcObject = null
    }
  }, [stream, autoplay])

  useEffect(() => {
    return () => {
      const player = playerRef.current
      if (player && !player.isDisposed()) {
        player.dispose()
        playerRef.current = null
      }
    }
  }, [])

  return (
    <div className={className ?? 'aspect-video w-full overflow-hidden rounded-lg bg-black'}>
      <div data-vjs-player ref={containerRef} className="h-full w-full" />
    </div>
  )
}
