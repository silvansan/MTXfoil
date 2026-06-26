import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type ConnectionSessionRow = {
  id?: string
  remoteAddr?: string
  path?: string
  state?: string
}

type ConnectionSessionsCardProps = {
  title: string
  rows: ConnectionSessionRow[]
  error?: string | null
  unavailable?: boolean
}

export function ConnectionSessionsCard({
  title,
  rows,
  error,
  unavailable,
}: ConnectionSessionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {unavailable ? (
          <p className="text-sm text-muted">Unavailable — MediaMTX not connected.</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">No active connections.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                  <th className="pb-2 pr-3 font-medium">Path</th>
                  <th className="pb-2 pr-3 font-medium">Remote</th>
                  <th className="pb-2 font-medium">State</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rows.map((row) => (
                  <tr
                    key={row.id || `${row.path}-${row.remoteAddr}`}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  >
                    <td className="py-1.5 pr-3">{row.path || '—'}</td>
                    <td className="py-1.5 pr-3 text-zinc-500">{row.remoteAddr || '—'}</td>
                    <td className="py-1.5">{row.state || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
