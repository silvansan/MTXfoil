'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

export function DeleteStreamButton({
  id,
  name,
  redirectTo,
  size = 'sm',
}: {
  id: string
  name: string
  redirectTo?: string
  size?: 'sm' | 'default'
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Delete stream "${name}"? This removes its MediaMTX path. This cannot be undone.`)) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/streams/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error || `Failed (${res.status})`)
      }
      if (redirectTo) {
        router.push(redirectTo)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="destructive" size={size} type="button" onClick={onDelete} disabled={busy}>
        <Trash2 className="h-3.5 w-3.5" />
        {busy ? 'Deleting…' : 'Delete'}
      </Button>
      {error && (
        <span className="text-xs text-red-400" role="alert">
          {error}
        </span>
      )}
    </>
  )
}
