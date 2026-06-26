import { getPayload } from 'payload'
import config from '@payload-config'

import { DeleteRecordingButton } from '@/components/operator/delete-recording-button'
import { CopyButton } from '@/components/operator/copy-button'
import { ClickableRow } from '@/components/operator/clickable-row'
import { listRecordings, formatRecordingPlaybackUrl } from '@/lib/mediamtx/recordings'
import { loadUrlTemplates } from '@/lib/url-templates'
import { codeRowClass } from '@/lib/operator-ui'
import { isAdmin } from '@/lib/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { headers } from 'next/headers'

export default async function RecordingsPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const canDelete = isAdmin(user)
  const urlTemplates = await loadUrlTemplates(payload)
  const hlsBase = urlTemplates.hlsBaseUrl

  let items: Array<{ path: string; start: string; duration: number; playbackUrl: string }> = []

  try {
    const list = await listRecordings()
    items = list.items.map((item) => ({
      path: item.path,
      start: item.start,
      duration: item.duration,
      playbackUrl: formatRecordingPlaybackUrl(item.path, item.start, hlsBase),
    }))
  } catch {
    items = []
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recordings</h1>
        <p className="mt-2 text-muted">Segments from MediaMTX recording API.</p>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <ClickableRow
            key={`${item.path}-${item.start}`}
            href={`/streams/${item.path}`}
            ariaLabel={`Open stream ${item.path}`}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{item.path}</CardTitle>
                {canDelete && (
                  <div data-no-row-nav>
                    <DeleteRecordingButton path={item.path} start={item.start} />
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted">
                <p>Start: {item.start}</p>
                <p>Duration: {item.duration}s</p>
                <div className={codeRowClass}>
                  <span className="truncate">{item.playbackUrl}</span>
                  <div data-no-row-nav>
                    <CopyButton value={item.playbackUrl} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </ClickableRow>
        ))}
        {items.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-zinc-500">No recordings found.</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
