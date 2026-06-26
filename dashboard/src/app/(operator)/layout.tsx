import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { OperatorNav } from '@/components/operator/operator-nav'
import { canAccessOperatorRoute, canApplyConfig, canManageForwarding, isAdmin, isViewer } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })

  const pathname = hdrs.get('x-pathname') || ''

  if (!user) {
    // Send users to the Payload login, but bring them back to the operator UI
    // afterwards (Payload honours the `redirect` query param) instead of
    // dropping them on the admin dashboard.
    const target = pathname.startsWith('/') ? pathname : '/'
    redirect(`/admin/login?redirect=${encodeURIComponent(target)}`)
  }

  if (!canAccessOperatorRoute(user, pathname)) {
    const streams = await payload.find({
      collection: 'streams',
      where: { playbackEnabled: { equals: true } },
      limit: 1,
    })
    const first = streams.docs[0]
    if (first?.slug) {
      redirect(`/player/${first.slug}`)
    }
    redirect('/admin/login')
  }

  if (pathname.startsWith('/settings') && !canApplyConfig(user)) redirect('/')
  if (pathname.startsWith('/forwarding') && !canManageForwarding(user)) redirect('/')
  if (pathname.startsWith('/audit') && !isAdmin(user)) redirect('/')

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <OperatorNav
        viewerOnly={isViewer(user)}
        showAudit={isAdmin(user)}
        showSettings={canApplyConfig(user)}
        showForwarding={canManageForwarding(user)}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
