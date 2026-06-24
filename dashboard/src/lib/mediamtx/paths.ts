import { mtxFetch } from './client'
import type { Path, PathList } from './types'

export type StreamStatus = {
  name: string
  ready: boolean
  sourceType: string | null
  readerCount: number
  readersByType: Record<string, number>
  bytesReceived: number
  bytesSent: number
  recording: boolean
  tracks: Array<{ type: string; codec: string }>
}

function countReadersByType(readers: Path['readers']): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const reader of readers) {
    counts[reader.type] = (counts[reader.type] || 0) + 1
  }
  return counts
}

export function mapPathToStatus(path: Path, recording = false): StreamStatus {
  return {
    name: path.name,
    ready: path.ready,
    sourceType: path.source?.type ?? null,
    readerCount: path.readers.length,
    readersByType: countReadersByType(path.readers),
    bytesReceived: path.bytesReceived,
    bytesSent: path.bytesSent,
    recording,
    tracks: path.tracks.map((t) => ({ type: t.type, codec: t.codec })),
  }
}

export async function listPaths(): Promise<PathList> {
  return mtxFetch<PathList>('/v3/paths/list')
}

export async function getPath(name: string): Promise<Path> {
  return mtxFetch<Path>(`/v3/paths/get/${encodeURIComponent(name)}`)
}

export async function listStreamStatuses(
  recordingPaths: Set<string> = new Set(),
): Promise<StreamStatus[]> {
  const list = await listPaths()
  return list.items.map((p) => mapPathToStatus(p, recordingPaths.has(p.name)))
}

export async function getStreamStatus(
  name: string,
  recording = false,
): Promise<StreamStatus | null> {
  try {
    const path = await getPath(name)
    return mapPathToStatus(path, recording)
  } catch {
    return null
  }
}
