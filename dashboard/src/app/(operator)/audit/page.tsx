import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isAdmin } from '@/lib/permissions'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AuditPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!isAdmin(user)) redirect('/')

  const logs = await payload.find({
    collection: 'audit-logs',
    limit: 100,
    sort: '-createdAt',
    depth: 1,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="mt-2 text-zinc-400">
          Recent admin actions — config apply, stream changes, user role changes, and CORS updates.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent events</CardTitle>
          <Link href="/admin/collections/audit-logs" className="text-sm text-emerald-400 underline">
            Full log in Admin →
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.docs.length === 0 ? (
            <p className="text-sm text-zinc-500">No audit events recorded yet.</p>
          ) : (
            logs.docs.map((entry) => {
              const actor =
                entry.actor && typeof entry.actor === 'object' && 'email' in entry.actor
                  ? String((entry.actor as { email?: string }).email)
                  : 'system'
              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-1 rounded-md border border-zinc-800 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted">{entry.action}</Badge>
                      <span className="text-sm text-zinc-300">{entry.summary}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {actor}
                      {entry.ip ? ` · ${entry.ip}` : ''}
                      {entry.resourceId ? ` · ${entry.resource}/${entry.resourceId}` : ` · ${entry.resource}`}
                    </p>
                  </div>
                  <time className="text-xs text-zinc-500">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                  </time>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
