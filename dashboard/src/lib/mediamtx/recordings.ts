import { mtxFetch } from './client'
import type { RecordingList } from './types'

export async function listRecordings(pathName?: string): Promise<RecordingList> {
  const query = pathName ? `?path=${encodeURIComponent(pathName)}` : ''
  return mtxFetch<RecordingList>(`/v3/recordings/list${query}`)
}

export async function deleteRecordingSegment(pathName: string, start: string): Promise<void> {
  await mtxFetch(`/v3/recordings/deletesegment`, {
    method: 'POST',
    body: JSON.stringify({ path: pathName, start }),
  })
}

export type RecordingItem = {
  path: string
  start: string
  duration: number
  playbackUrl: string
}

export function formatRecordingPlaybackUrl(pathName: string, start: string, hlsBase: string): string {
  const base = hlsBase.replace(/\/$/, '')
  return `${base}/${pathName}/recordings/${start}/index.m3u8`
}
