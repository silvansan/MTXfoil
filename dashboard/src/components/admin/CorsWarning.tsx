'use client'

import React from 'react'

export function CorsWarning() {
  return (
    <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-200">
      Wildcard (*) origins are allowed but not recommended in production. Review each service before applying.
    </div>
  )
}
