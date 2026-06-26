'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { inputClass, labelClass } from '@/lib/operator-ui'

type Props = {
  slug: string
}

export function PlaybackPasswordGate({ slug }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!password.trim()) {
      setError('Password is required')
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set('password', password.trim())
    router.replace(`/player/${slug}?${params.toString()}`)
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Playback password required</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="playback-password" className={labelClass}>
              Playback password
            </label>
            <input
              id="playback-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              placeholder="Enter playback password"
              className={inputClass}
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <Button type="submit">Unlock playback</Button>
        </form>
      </CardContent>
    </Card>
  )
}
