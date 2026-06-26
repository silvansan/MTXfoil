'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Film,
  Globe,
  LayoutDashboard,
  Menu,
  Radio,
  Send,
  Settings,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { MtxfoilLogo } from '@/components/mtxfoil-logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  visible?: boolean
}

type NavGroup = {
  id: string
  label: string
  items: NavItem[]
}

const dashboardLink = {
  href: '/',
  label: 'Dashboard',
  icon: LayoutDashboard,
}

const navGroups: NavGroup[] = [
  {
    id: 'live',
    label: 'LIVE',
    items: [
      { href: '/streams', label: 'Streams', icon: Radio },
      { href: '/events', label: 'Events', icon: CalendarDays },
      { href: '/metrics', label: 'Metrics', icon: Activity },
    ],
  },
  {
    id: 'publish',
    label: 'PUBLISH',
    items: [
      { href: '/protocols', label: 'Protocols', icon: SlidersHorizontal },
      { href: '/forwarding', label: 'Forwarding', icon: Send, visible: true },
      { href: '/cors', label: 'CORS', icon: Globe },
    ],
  },
  {
    id: 'rec',
    label: 'REC',
    items: [{ href: '/recordings', label: 'Recordings', icon: Film }],
  },
]

const systemLinks: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings, visible: true },
  { href: '/audit', label: 'Audit', icon: ClipboardList, visible: true },
]

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href))
}

function useIsDesktopHover() {
  const [isDesktopHover, setIsDesktopHover] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px) and (hover: hover)')
    const update = () => setIsDesktopHover(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isDesktopHover
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  indented = false,
  onNavigate,
}: {
  href: string
  label: string
  icon: LucideIcon
  pathname: string
  indented?: boolean
  onNavigate?: () => void
}) {
  const isActive = isActivePath(pathname, href)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'sidebar-nav-link',
        indented && 'sidebar-nav-link-indented',
        isActive ? 'sidebar-nav-link-active' : 'sidebar-nav-link-inactive',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  )
}

function NavAccordion({
  group,
  pathname,
  isDesktopHover,
  openSections,
  toggleSection,
  onNavigate,
}: {
  group: NavGroup
  pathname: string
  isDesktopHover: boolean
  openSections: Record<string, boolean>
  toggleSection: (id: string) => void
  onNavigate?: () => void
}) {
  const visibleItems = group.items.filter((item) => item.visible !== false)
  if (visibleItems.length === 0) return null

  const hasActiveChild = visibleItems.some((item) => isActivePath(pathname, item.href))
  const isOpen = openSections[group.id] ?? hasActiveChild

  return (
    <div
      className={cn('sidebar-accordion', (isOpen || hasActiveChild) && 'sidebar-accordion-open')}
      data-open={isOpen || hasActiveChild ? 'true' : 'false'}
    >
      <button
        type="button"
        className="sidebar-accordion-trigger"
        aria-expanded={isOpen}
        onClick={() => {
          if (!isDesktopHover) toggleSection(group.id)
        }}
      >
        <span className="sidebar-accordion-label">{group.label}</span>
        <ChevronRight className="sidebar-accordion-chevron size-3.5 shrink-0" aria-hidden />
      </button>
      <div className="sidebar-accordion-content">
        <div className="sidebar-accordion-items space-y-0.5">
          {visibleItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              pathname={pathname}
              indented
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

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
  const isDesktopHover = useIsDesktopHover()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const groups = useMemo(
    () =>
      navGroups.map((group) => ({
        ...group,
        items: group.items.map((item) => {
          if (item.href === '/forwarding') return { ...item, visible: showForwarding }
          return item
        }),
      })),
    [showForwarding],
  )

  const bottomLinks = useMemo(
    () =>
      systemLinks.map((item) => {
        if (item.href === '/audit') return { ...item, visible: showAudit }
        if (item.href === '/settings') return { ...item, visible: showSettings }
        return item
      }),
    [showAudit, showSettings],
  )

  const sidebarBody = !viewerOnly && (
    <>
      <NavLink
        href={dashboardLink.href}
        label={dashboardLink.label}
        icon={dashboardLink.icon}
        pathname={pathname}
        onNavigate={closeMobile}
      />

      <div className="sidebar-groups" role="navigation" aria-label="Operator sections">
        {groups.map((group) => (
          <NavAccordion
            key={group.id}
            group={group}
            pathname={pathname}
            isDesktopHover={isDesktopHover}
            openSections={openSections}
            toggleSection={toggleSection}
            onNavigate={closeMobile}
          />
        ))}
      </div>

      <div className="mt-auto space-y-0.5 border-t border-[var(--mtx-border)] pt-3">
        {bottomLinks
          .filter((item) => item.visible !== false)
          .map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              pathname={pathname}
              onNavigate={closeMobile}
            />
          ))}
        {showAdmin && (
          <Link
            href="/admin/collections/streams"
            onClick={closeMobile}
            className="sidebar-nav-link sidebar-nav-link-inactive sidebar-nav-link-admin"
          >
            <ExternalLink className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Payload CMS</span>
          </Link>
        )}
      </div>
    </>
  )

  return (
    <div className="operator-nav-root md:contents">
      <header className="sidebar-mobile-header flex md:hidden">
        <MtxfoilLogo size="sm" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {!viewerOnly && (
            <button
              type="button"
              className="sidebar-mobile-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </button>
          )}
        </div>
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="sidebar-overlay md:hidden"
          aria-label="Close navigation menu"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          'sidebar',
          mobileOpen && 'sidebar-mobile-open',
          viewerOnly && 'sidebar-viewer-only',
        )}
        aria-label="Operator navigation"
      >
        <div className="sidebar-header hidden md:flex">
          <MtxfoilLogo size="md" />
        </div>

        <div className="sidebar-body">{sidebarBody}</div>

        <div className="sidebar-footer hidden md:flex">
          <ThemeToggle />
        </div>

        {!viewerOnly && (
          <button
            type="button"
            className="sidebar-mobile-close flex md:hidden"
            onClick={closeMobile}
            aria-label="Close navigation menu"
          >
            <X className="size-5" />
          </button>
        )}
      </aside>
    </div>
  )
}
