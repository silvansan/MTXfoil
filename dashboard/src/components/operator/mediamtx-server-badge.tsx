import { getMediaMtxServers } from '@/lib/mediamtx/client'
import { Badge } from '@/components/ui/badge'

export function MediaMtxServerBadge() {
  const { primary, servers } = getMediaMtxServers()
  const multi = servers.length > 1

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
      <span>MediaMTX server:</span>
      <Badge variant="muted">{primary.name}</Badge>
      <code className="text-xs text-zinc-500">{primary.apiUrl}</code>
      {multi && (
        <span className="text-xs text-zinc-500">(+{servers.length - 1} more in MEDIAMTX_SERVERS)</span>
      )}
    </div>
  )
}
