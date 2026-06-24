import { listRecordings, formatRecordingPlaybackUrl } from '@/lib/mediamtx/recordings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/operator/copy-button'

export default async function RecordingsPage() {
  const hlsBase = process.env.HLS_BASE_URL || 'http://localhost:8888'
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
        <p className="mt-2 text-zinc-400">Segments from MediaMTX recording API.</p>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={`${item.path}-${item.start}`}>
            <CardHeader>
              <CardTitle>{item.path}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-400">
              <p>Start: {item.start}</p>
              <p>Duration: {item.duration}s</p>
              <div className="flex items-center justify-between gap-2 rounded-md bg-zinc-950 p-2 font-mono text-xs">
                <span className="truncate">{item.playbackUrl}</span>
                <CopyButton value={item.playbackUrl} />
              </div>
            </CardContent>
          </Card>
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
