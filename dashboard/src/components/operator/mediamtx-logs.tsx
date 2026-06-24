'use client'

import { useEffect, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type LogsResponse = {
  source: 'file' | 'instructions'
  lines: string[]
  message?: string
}

export function MediaMtxLogs() {
  const [logs, setLogs] = useState<LogsResponse | null>(null)

  useEffect(() => {
    void fetch('/api/logs/mediamtx')
      .then((res) => res.json())
      .then(setLogs)
      .catch(() => setLogs({ source: 'instructions', lines: [], message: 'Failed to load logs' }))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>MediaMTX logs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {logs?.message && <p className="text-zinc-400">{logs.message}</p>}
        {logs?.lines.length ? (
          <pre className="max-h-64 overflow-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
            {logs.lines.join('\n')}
          </pre>
        ) : (
          <p className="text-zinc-500">No log lines available.</p>
        )}
      </CardContent>
    </Card>
  )
}
