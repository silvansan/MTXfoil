'use client'

import { useTheme } from '@payloadcms/ui'
import { Moon, Sun } from 'lucide-react'
import React, { useEffect, useState } from 'react'

export function AdminThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && theme === 'dark'

  return (
    <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
      <button
        type="button"
        aria-label={mounted ? (isDark ? 'Switch to light theme' : 'Switch to dark theme') : 'Toggle theme'}
        disabled={!mounted}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '2.25rem',
          height: '2.25rem',
          borderRadius: '0.375rem',
          border: '1px solid var(--theme-elevation-150)',
          background: 'var(--theme-input-bg)',
          color: 'var(--theme-elevation-800)',
          cursor: mounted ? 'pointer' : 'default',
          opacity: mounted ? 1 : 0.6,
        }}
      >
        {mounted ? (
          isDark ? (
            <Sun size={16} aria-hidden />
          ) : (
            <Moon size={16} aria-hidden />
          )
        ) : (
          <Sun size={16} aria-hidden style={{ opacity: 0 }} />
        )}
      </button>
    </div>
  )
}
