'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsClient() {
  const [preview, setPreview] = useState<{ ok: boolean; diffs: Array<{ key: string }>; errors: string[] } | null>(null)
  const [applying, setApplying] = useState(false)

  async function handlePreview() {
    const res = await fetch('/api/config/preview')
    setPreview(await res.json())
  }

  async function handleApply() {
    setApplying(true)
    try {
      const res = await fetch('/api/config/apply', { method: 'POST' })
      setPreview(await res.json())
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={handlePreview} type="button">
          Preview diff
        </Button>
        <Button onClick={handleApply} disabled={applying} type="button">
          {applying ? 'Applying…' : 'Apply config'}
        </Button>
      </div>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>{preview.ok ? 'Diff preview' : 'Validation errors'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {preview.errors?.length > 0 && (
              <ul className="text-red-400">
                {preview.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {preview.diffs?.length === 0 && preview.ok && (
              <p className="text-zinc-400">No differences — config is in sync.</p>
            )}
            <ul className="space-y-2 font-mono text-xs">
              {preview.diffs?.map((d) => (
                <li key={d.key} className="rounded bg-zinc-950 p-2">
                  {d.key}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  )
}
