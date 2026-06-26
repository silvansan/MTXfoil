'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

export function DeleteRecordingButton({ path, start }: { path: string; start: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function remove() {
    if (!confirm(`Delete recording ${path} @ ${start}?`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/recordings/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path, start }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" disabled={loading} onClick={remove}>
      {loading ? 'Deleting…' : 'Delete'}
    </Button>
  )
}
