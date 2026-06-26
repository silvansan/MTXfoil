import { MediaMtxServerBadge } from '@/components/operator/mediamtx-server-badge'
import { SettingsClient } from '@/components/operator/settings-client'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Config Sync</h1>
        <p className="mt-2 text-muted">Validate, diff, backup, and apply MediaMTX configuration.</p>
        <div className="mt-3">
          <MediaMtxServerBadge />
        </div>
      </div>

      <SettingsClient />
    </div>
  )
}
