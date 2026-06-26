'use client'

import Link from 'next/link'
import React from 'react'

export function OperatorLink() {
  return (
    <Link
      href="/"
      className="nav__link"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        padding: '0.5rem 0.75rem',
        borderRadius: '4px',
        border: '1px solid var(--theme-elevation-150)',
        color: 'var(--theme-elevation-800)',
        fontWeight: 600,
        textDecoration: 'none',
      }}
    >
      <span aria-hidden>↗</span>
      Operator Dashboard
    </Link>
  )
}
