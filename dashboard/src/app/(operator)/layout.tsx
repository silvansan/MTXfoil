import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { OperatorNav } from '@/components/operator/operator-nav'
import { canAccessOperatorRoute, isViewer } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect('/admin/login')
  }

  const pathname = (await headers()).get('x-pathname') || ''
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

  return (
    <div className="min-h-screen">
      <OperatorNav viewerOnly={isViewer(user)} />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  )
}
