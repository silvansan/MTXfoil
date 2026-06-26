'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  showAudit = false,
  showSettings = false,
  showForwarding = false,
}: {
  viewerOnly?: boolean
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
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/20 px-2 py-1 text-sm font-bold text-emerald-300">MTXfoil</div>
          <span className="text-sm text-zinc-400">MediaMTX Control Panel</span>
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
              )}
            >
              {link.label}
            </Link>
          ))}
          {!viewerOnly && (
            <Link
              href="/admin"
              className="ml-2 rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              Admin / CMS →
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
