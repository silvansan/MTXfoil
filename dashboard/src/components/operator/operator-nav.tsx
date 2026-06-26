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
    <header className="nav-bar">
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
                    'nav-link',
                    isActive ? 'nav-link-active' : 'nav-link-inactive',
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
            {showAdmin && (
              <Link
                href="/admin/collections/streams"
                className="nav-link-admin"
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
