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
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError('')
            }}
            placeholder="Enter playback password"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit">Unlock playback</Button>
        </form>
      </CardContent>
    </Card>
  )
}
