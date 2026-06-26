'use client'

import Link from 'next/link'

type MtxfoilLogoProps = {
  className?: string
  href?: string
}

export function MtxfoilLogo({ className = 'h-9 w-auto', href = '/' }: MtxfoilLogoProps) {
  const img = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- optimized brand assets from /public */}
      <img
        src="/mtxfoil-logo-dark.webp"
        alt="MTXfoil"
        className={`${className} hidden dark:block`}
        width={144}
        height={144}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- optimized brand assets from /public */}
      <img
        src="/mtxfoil-logo-light.webp"
        alt="MTXfoil"
        className={`${className} block dark:hidden`}
        width={144}
        height={144}
      />
    </>
  )

  if (href) {
    return (
      <Link href={href} className="flex shrink-0 items-center">
        {img}
      </Link>
    )
  }

  return <span className="flex shrink-0 items-center">{img}</span>
}
