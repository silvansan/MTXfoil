'use client'

import Link from 'next/link'

const LOGO_SIZE_CLASSES = {
  /** Mobile nav header */
  sm: 'h-auto w-28 max-w-full',
  /** Operator sidebar — desktop */
  md: 'h-auto w-[140px] max-w-full',
  /** Login / auth screens */
  lg: 'h-auto w-40 max-w-full',
} as const

export type MtxfoilLogoSize = keyof typeof LOGO_SIZE_CLASSES

type MtxfoilLogoProps = {
  className?: string
  href?: string
  size?: MtxfoilLogoSize
}

export function MtxfoilLogo({ className, href = '/', size = 'md' }: MtxfoilLogoProps) {
  const resolvedClass = className ?? LOGO_SIZE_CLASSES[size]

  const img = (
    <span className="relative inline-flex shrink-0 items-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- optimized brand assets from /public */}
      <img
        src="/foil-logo-light.webp"
        alt="foil"
        className={`${resolvedClass} dark:opacity-0`}
        width={160}
        height={160}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- optimized brand assets from /public */}
      <img
        src="/foil-logo-dark.webp"
        alt=""
        aria-hidden
        className={`${resolvedClass} pointer-events-none absolute inset-0 opacity-0 dark:opacity-100`}
        width={160}
        height={160}
      />
    </span>
  )

  if (href) {
    return (
      <Link href={href} className="flex shrink-0 items-center">
        {img}
      </Link>
    )
  }

  return img
}
