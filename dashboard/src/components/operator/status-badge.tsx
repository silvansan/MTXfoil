import { Badge } from '@/components/ui/badge'

export function StatusBadge({ ready, recording }: { ready: boolean; recording?: boolean }) {
  if (ready && recording) {
    return <Badge variant="warning">Live · Recording</Badge>
  }
  if (ready) {
    return <Badge variant="success">Live</Badge>
  }
  return <Badge variant="muted">Offline</Badge>
}
