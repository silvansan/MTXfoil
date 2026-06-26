'use client'

import { useRouter } from 'next/navigation'
import { type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function ClickableRow({
  href,
  onActivate,
  children,
  className,
  disabled,
  ariaLabel,
}: {
  href?: string
  onActivate?: () => void
  children: ReactNode
  className?: string
  disabled?: boolean
  ariaLabel?: string
}) {
  const router = useRouter()

  function activate() {
    if (disabled) return
    if (onActivate) onActivate()
    else if (href) router.push(href)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate()
    }
  }

  function onClick(e: React.MouseEvent) {
    if (disabled) return
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [data-no-row-nav]')) {
      return
    }
    activate()
  }

  return (
    <div
      role={disabled ? undefined : 'link'}
      tabIndex={disabled ? undefined : 0}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        disabled
          ? undefined
          : 'cursor-pointer transition-colors hover:border-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mtx-accent-focus)] dark:hover:border-zinc-600',
        className,
      )}
    >
      {children}
    </div>
  )
}
