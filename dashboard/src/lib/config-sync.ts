import type { Payload } from 'payload'

import type { Stream } from '@/payload-types'
import {
  backupConfig,
  deletePathViaApi,
  diffObjects,
  generateYamlDocument,
  patchGlobalViaApi,
  patchPathViaApi,
  readCurrentYaml,
  reloadConfig,
  validateConfig,
  writeYamlConfig,
} from './mediamtx/config'
import { mapCorsToYaml, type CorsSettings } from './mediamtx/cors'

function mapOriginArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'origin' in item) {
        return String((item as { origin?: string }).origin || '')
      }
      return ''
    })
    .filter(Boolean)
}

function mapProxyArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'proxy' in item) {
        return String((item as { proxy?: string }).proxy || '')
      }
      return ''
    })
    .filter(Boolean)
}

function corsFromGlobal(corsGlobal: Record<string, unknown>): CorsSettings {
  return {
    apiAllowOrigins: mapOriginArray(corsGlobal.apiAllowOrigins),
    hlsAllowOrigins: mapOriginArray(corsGlobal.hlsAllowOrigins),
    webrtcAllowOrigins: mapOriginArray(corsGlobal.webrtcAllowOrigins),
    playbackAllowOrigins: mapOriginArray(corsGlobal.playbackAllowOrigins),
    metricsAllowOrigins: mapOriginArray(corsGlobal.metricsAllowOrigins),
    trustedProxies: mapProxyArray(corsGlobal.trustedProxies),
  }
}

export type SyncResult = {
  ok: boolean
  backupPath?: string
  diffs: Array<{ key: string; before: unknown; after: unknown }>
  errors: string[]
}

export async function fetchAllStreams(payload: Payload): Promise<Stream[]> {
  const result = await payload.find({
    collection: 'streams',
    limit: 500,
    depth: 0,
  })
  return result.docs as Stream[]
}

export async function syncStreamToMediaMtx(
  payload: Payload,
  stream: Stream,
): Promise<SyncResult> {
  const errors: string[] = []

  try {
    const streams = await fetchAllStreams(payload)
    const corsGlobal = await payload.findGlobal({ slug: 'cors-origins' })
    const cors = corsFromGlobal(corsGlobal as Record<string, unknown>)

    const before = await readCurrentYaml()
    const afterDoc = await generateYamlDocument(streams, cors)
    const validation = await validateConfig(afterDoc)
    if (!validation.valid) {
      return { ok: false, diffs: [], errors: validation.errors }
    }

    const backupPath = await backupConfig()
    await writeYamlConfig(afterDoc)

    if (stream.enabled) {
      await patchPathViaApi(stream)
    } else {
      await deletePathViaApi(stream.slug)
    }

    const diffs = diffObjects(before, afterDoc)
    return { ok: true, backupPath, diffs, errors }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Sync failed')
    return { ok: false, diffs: [], errors }
  }
}

export async function applyFullConfig(payload: Payload): Promise<SyncResult> {
  const errors: string[] = []

  try {
    const streams = await fetchAllStreams(payload)
    const corsGlobal = await payload.findGlobal({ slug: 'cors-origins' })
    const cors = corsFromGlobal(corsGlobal as Record<string, unknown>)
    const protocolGlobal = await payload.findGlobal({ slug: 'protocol-settings' })

    const protocolPatch: Record<string, unknown> = {}
    if (protocolGlobal.srtEnabled !== undefined) protocolPatch.srt = protocolGlobal.srtEnabled ? 'yes' : 'no'
    if (protocolGlobal.rtmpEnabled !== undefined) protocolPatch.rtmp = protocolGlobal.rtmpEnabled ? 'yes' : 'no'
    if (protocolGlobal.hlsEnabled !== undefined) protocolPatch.hls = protocolGlobal.hlsEnabled ? 'yes' : 'no'
    if (protocolGlobal.webrtcEnabled !== undefined) protocolPatch.webrtc = protocolGlobal.webrtcEnabled ? 'yes' : 'no'

    const before = await readCurrentYaml()
    const afterDoc = await generateYamlDocument(streams, cors, protocolPatch)
    const validation = await validateConfig(afterDoc)
    if (!validation.valid) {
      return { ok: false, diffs: [], errors: validation.errors }
    }

    const backupPath = await backupConfig()
    await writeYamlConfig(afterDoc)

    await patchGlobalViaApi({
      ...mapCorsToYaml(cors),
      ...protocolPatch,
    })

    for (const stream of streams) {
      if (stream.enabled) {
        await patchPathViaApi(stream)
      }
    }

    await reloadConfig()
    const diffs = diffObjects(before, afterDoc)
    return { ok: true, backupPath, diffs, errors }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Apply failed')
    return { ok: false, diffs: [], errors }
  }
}

export async function previewConfigDiff(payload: Payload): Promise<SyncResult> {
  try {
    const streams = await fetchAllStreams(payload)
    const corsGlobal = await payload.findGlobal({ slug: 'cors-origins' })
    const cors = corsFromGlobal(corsGlobal as Record<string, unknown>)

    const before = await readCurrentYaml()
    const afterDoc = await generateYamlDocument(streams, cors)
    const validation = await validateConfig(afterDoc)
    const diffs = diffObjects(before, afterDoc)

    return {
      ok: validation.valid,
      diffs,
      errors: validation.errors,
    }
  } catch (err) {
    return {
      ok: false,
      diffs: [],
      errors: [err instanceof Error ? err.message : 'Preview failed'],
    }
  }
}
