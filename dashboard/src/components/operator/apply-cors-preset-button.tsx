'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

type Props = {
  presetId: string | number
  presetName: string
}

export function ApplyCorsPresetButton({ presetId, presetName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function apply() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cors/apply-preset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ presetId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply preset')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply preset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" size="sm" variant="outline" disabled={loading} onClick={apply}>
        {loading ? 'Applying…' : `Apply to ${presetName}`}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
