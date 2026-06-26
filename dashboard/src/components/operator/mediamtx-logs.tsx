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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch('/api/logs/mediamtx')
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as LogsResponse | { message?: string } | null
        if (!res.ok) {
          const message =
            body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
              ? body.message
              : `Logs request failed (${res.status})`
          throw new Error(message)
        }
        return body as LogsResponse
      })
      .then((data) => {
        setLogs(data)
        setLoadError(null)
      })
      .catch((err) => {
        setLogs(null)
        setLoadError(err instanceof Error ? err.message : 'Failed to load logs')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>MediaMTX logs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {loading && <p className="text-muted">Loading logs…</p>}

        {loadError && (
          <p className="text-red-600 dark:text-red-400" role="alert">
            {loadError}
          </p>
        )}

        {!loading && !loadError && logs?.source === 'instructions' && logs.message && (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-muted dark:border-zinc-800 dark:bg-zinc-900/50">
            {logs.message}
          </p>
        )}

        {!loading && !loadError && logs?.source === 'file' && logs.lines.length > 0 && (
          <pre
            aria-label="MediaMTX log output"
            className="bg-code text-code max-h-64 overflow-auto rounded-md p-3 font-mono text-xs"
          >
            {logs.lines.join('\n')}
          </pre>
        )}

        {!loading && !loadError && logs?.source === 'file' && logs.lines.length === 0 && (
          <p className="text-muted">Log file is empty.</p>
        )}
      </CardContent>
    </Card>
  )
}
