'use client'

import Link from 'next/link'

type MtxfoilLogoProps = {
  className?: string
  href?: string
}

export function MtxfoilLogo({ className = 'h-9 w-auto', href = '/' }: MtxfoilLogoProps) {
  const img = (
    <span className="relative inline-flex shrink-0 items-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- optimized brand assets from /public */}
      <img
        src="/foil-logo-light.webp"
        alt="foil"
        className={`${className} dark:opacity-0`}
        width={144}
        height={144}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- optimized brand assets from /public */}
      <img
        src="/foil-logo-dark.webp"
        alt=""
        aria-hidden
        className={`${className} pointer-events-none absolute inset-0 opacity-0 dark:opacity-100`}
        width={144}
        height={144}
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
