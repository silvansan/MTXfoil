'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { MtxfoilLogo } from '@/components/mtxfoil-logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

const allLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/streams', label: 'Streams' },
  { href: '/events', label: 'Events' },
  { href: '/cors', label: 'CORS' },
  { href: '/protocols', label: 'Protocols' },
  { href: '/recordings', label: 'Recordings' },
  { href: '/forwarding', label: 'Forwarding' },
  { href: '/metrics', label: 'Metrics' },
  { href: '/audit', label: 'Audit' },
  { href: '/settings', label: 'Settings' },
]

export function OperatorNav({
  viewerOnly = false,
  showAdmin = false,
  showAudit = false,
  showSettings = false,
  showForwarding = false,
}: {
  viewerOnly?: boolean
  showAdmin?: boolean
  showAudit?: boolean
  showSettings?: boolean
  showForwarding?: boolean
}) {
  const pathname = usePathname()
  const links = viewerOnly
    ? []
    : allLinks.filter((link) => {
        if (link.href === '/audit' && !showAudit) return false
        if (link.href === '/settings' && !showSettings) return false
        if (link.href === '/forwarding' && !showForwarding) return false
        return true
      })

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <MtxfoilLogo />
        <div className="flex flex-wrap items-center gap-1">
          <nav aria-label="Operator" className="flex flex-wrap items-center gap-1">
            {links.map((link) => {
              const isActive =
                pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200',
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
            {showAdmin && (
              <Link
                href="/admin/collections/streams"
                className="ml-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Payload CMS
              </Link>
            )}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
