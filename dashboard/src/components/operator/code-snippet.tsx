'use client'

import { useState } from 'react'

import { CopyButton } from '@/components/operator/copy-button'
import { Button } from '@/components/ui/button'

/**
 * Copy-first code block: shows a single copy button and keeps the raw snippet
 * hidden by default. A subtle "Show code" toggle reveals it for power users.
 */
export function CodeSnippet({ value, copyLabel }: { value: string; copyLabel: string }) {
  const [shown, setShown] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton value={value} label={copyLabel} />
        <Button variant="ghost" size="sm" type="button" onClick={() => setShown((s) => !s)}>
          {shown ? 'Hide code' : 'Show code'}
        </Button>
      </div>
      {shown && (
        <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 text-xs">{value}</pre>
      )}
    </div>
  )
}
