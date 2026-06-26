'use client'

import { Check, Copy, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { codeRowClass, panelClass } from '@/lib/operator-ui'

function buildEmbed(playerUrl: string): string {
  return `<iframe src="${playerUrl}" width="640" height="360" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-subtle">{label}</p>
      <div className={codeRowClass}>
        <span className="truncate text-zinc-900 dark:text-zinc-100">{value}</span>
        <Button variant="outline" size="sm" type="button" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

export function ShareButton({
  slug,
  authMode,
  size = 'sm',
  variant = 'outline',
}: {
  slug: string
  authMode?: string | null
  size?: 'sm' | 'default'
  variant?: 'outline' | 'secondary' | 'ghost'
}) {
  const [open, setOpen] = useState(false)
  const [origin, setOrigin] = useState('')
  const [tokenUrl, setTokenUrl] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [issuing, setIssuing] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const panelId = `share-panel-${slug}`

  const playerUrl = origin ? `${origin}/player/${slug}` : `/player/${slug}`
  const isToken = authMode === 'token'

  async function issueToken() {
    setIssuing(true)
    setTokenError(null)
    try {
      const res = await fetch(`/api/playback/token?slug=${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      })
      const json = (await res.json().catch(() => ({}))) as { playerUrl?: string; error?: string }
      if (!res.ok || !json.playerUrl) throw new Error(json.error || `Failed (${res.status})`)
      setTokenUrl(origin ? `${origin}${json.playerUrl}` : json.playerUrl)
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'Failed to issue token')
    } finally {
      setIssuing(false)
    }
  }

  return (
    <div className="relative inline-block">
      <Button
        variant={variant}
        size={size}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </Button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Share stream"
          className={`absolute right-0 z-20 mt-2 w-80 space-y-3 ${panelClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          <CopyRow label="Player link" value={playerUrl} />
          <CopyRow label="Embed (iframe)" value={buildEmbed(playerUrl)} />
          {isToken && (
            <div className="space-y-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
              <p className="text-xs text-subtle">
                This stream requires a playback token. Generate a time-limited shareable link.
              </p>
              {tokenUrl ? (
                <CopyRow label="Tokenized link (1h)" value={tokenUrl} />
              ) : (
                <Button variant="secondary" size="sm" type="button" onClick={issueToken} disabled={issuing}>
                  {issuing ? 'Generating…' : 'Generate share link'}
                </Button>
              )}
              {tokenError && <p className="text-xs text-red-400">{tokenError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
