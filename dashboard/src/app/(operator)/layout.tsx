import { OperatorNav } from '@/components/operator/operator-nav'

export const dynamic = 'force-dynamic'

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <OperatorNav />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  )
}
