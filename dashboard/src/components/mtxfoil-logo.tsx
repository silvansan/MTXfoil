'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

type MtxfoilLogoProps = {
  className?: string
  href?: string
}

export function MtxfoilLogo({ className = 'h-9 w-auto', href = '/' }: MtxfoilLogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const src =
    mounted && resolvedTheme === 'dark'
      ? '/mtxfoil-logo-dark.webp'
      : '/mtxfoil-logo-light.webp'

  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- optimized brand assets from /public
    <img
      src={src}
      alt="MTXfoil"
      className={className}
      width={144}
      height={144}
    />
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
