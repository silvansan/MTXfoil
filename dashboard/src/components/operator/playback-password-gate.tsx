'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
            <label htmlFor="playback-password" className="text-sm text-zinc-300">
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
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
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
