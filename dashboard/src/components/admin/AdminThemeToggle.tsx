'use client'

import React from 'react'

import { ThemeToggle } from '@/components/theme-toggle'

export function AdminThemeToggle() {
  return (
    <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
      <ThemeToggle />
    </div>
  )
}
