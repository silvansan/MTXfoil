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
        {logs?.message && <p className="text-muted">{logs.message}</p>}
        {logs?.lines.length ? (
          <pre
            aria-label="MediaMTX log output"
            className="bg-code text-code max-h-64 overflow-auto rounded-md p-3 font-mono text-xs"
          >
            {logs.lines.join('\n')}
          </pre>
        ) : (
          <p className="text-muted">No log lines available.</p>
        )}
      </CardContent>
    </Card>
  )
}
