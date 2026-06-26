import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type MediaMtxHealth = {
  ok: boolean
  latencyMs: number
  error?: string
}

type MediaMtxConnectionCardProps = {
  health: MediaMtxHealth
  /** Extra context shown when disconnected (metrics page vs dashboard). */
  offlineHint?: string
  /** Optional fetch error from the status poll (client dashboard only). */
  fetchError?: string | null
}

export function MediaMtxConnectionCard({
  health,
  offlineHint,
  fetchError,
}: MediaMtxConnectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          MediaMTX Connection
          {health.ok ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="danger">Disconnected</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted">
        <p>
          Latency: {health.latencyMs}ms
          {health.error ? ` — ${health.error}` : ''}
        </p>
        {!health.ok && offlineHint && (
          <p className="text-red-600 dark:text-red-400" role="alert">
            {offlineHint}
          </p>
        )}
        {fetchError && (
          <p className="text-red-600 dark:text-red-400" role="alert">
            {fetchError}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
