import React from 'react'

export function Logo() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
      }}
    >
      <span
        style={{
          borderRadius: '0.5rem',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          padding: '0.375rem 0.625rem',
          fontSize: '1.5rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'rgb(110, 231, 183)',
          lineHeight: 1,
        }}
      >
        MTXfoil
      </span>
      <span
        style={{
          fontSize: '0.875rem',
          color: 'var(--theme-elevation-600)',
        }}
      >
        MediaMTX Control Panel
      </span>
    </div>
  )
}
