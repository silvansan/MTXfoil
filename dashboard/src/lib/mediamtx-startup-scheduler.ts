import type { Payload } from 'payload'

let startupSyncPromise: Promise<void> | null = null

/**
 * One-shot credential sync after deploy. Triggered from health checks and
 * operator layout once Payload is available.
 */
export function scheduleMediaMtxStartupSync(payload: Payload, options?: { awaitResult?: boolean }): Promise<void> {
  if (process.env.MEDIAMTX_AUTO_SYNC_CREDENTIALS === 'false') {
    return Promise.resolve()
  }

  if (!startupSyncPromise) {
    startupSyncPromise = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 2_000))
      const { syncMediaMtxCredentialsIfNeeded } = await import('@/lib/mediamtx-startup-sync')
      await syncMediaMtxCredentialsIfNeeded(payload)
    })().catch((err) => {
      startupSyncPromise = null
      console.error(
        '[mediamtx-startup] Auto credential sync failed:',
        err instanceof Error ? err.message : err,
      )
    })
  }

  if (options?.awaitResult) {
    return startupSyncPromise
  }

  void startupSyncPromise
  return Promise.resolve()
}
