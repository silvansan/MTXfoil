import type { Payload } from 'payload'

import type { Stream } from '@/payload-types'
import {
  backupConfig,
  buildAuthSection,
  deletePathViaApi,
  diffObjects,
  generateYamlDocument,
  patchGlobalViaApi,
  patchPathViaApi,
  readCurrentYaml,
  reloadConfig,
  validateConfig,
  writeYamlConfig,
  type AuthSettings,
  type PathForwardingJob,
} from './mediamtx/config'
import { buildProtocolPatch } from './mediamtx/protocol'
import { mapCorsToYaml, enrichCorsFromEnv, validateCorsForProduction, type CorsSettings } from './mediamtx/cors'

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

function authFromGlobal(protocolGlobal: Record<string, unknown>): AuthSettings {
  const auth = (protocolGlobal.auth as Record<string, unknown> | undefined) || {}
  return {
    method: (auth.method as AuthSettings['method']) ?? 'internal',
    httpAddress: (auth.httpAddress as string | null) ?? null,
    jwtJwks: (auth.jwtJwks as string | null) ?? null,
    jwtClaimKey: (auth.jwtClaimKey as string | null) ?? null,
    jwtIssuer: (auth.jwtIssuer as string | null) ?? null,
    jwtAudience: (auth.jwtAudience as string | null) ?? null,
  }
}

function corsFromGlobal(corsGlobal: Record<string, unknown>): CorsSettings {
  const settings: CorsSettings = {
    apiAllowOrigins: mapOriginArray(corsGlobal.apiAllowOrigins),
    hlsAllowOrigins: mapOriginArray(corsGlobal.hlsAllowOrigins),
    webrtcAllowOrigins: mapOriginArray(corsGlobal.webrtcAllowOrigins),
    playbackAllowOrigins: mapOriginArray(corsGlobal.playbackAllowOrigins),
    metricsAllowOrigins: mapOriginArray(corsGlobal.metricsAllowOrigins),
    trustedProxies: mapProxyArray(corsGlobal.trustedProxies),
  }
  return enrichCorsFromEnv(settings)
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

export async function fetchForwardingJobsBySlug(
  payload: Payload,
): Promise<Record<string, PathForwardingJob[]>> {
  const result = await payload.find({
    collection: 'forwarding-jobs',
    limit: 500,
    depth: 1,
  })

  const bySlug: Record<string, PathForwardingJob[]> = {}

  for (const doc of result.docs) {
    const stream = doc.stream
    const slug =
      stream && typeof stream === 'object' && 'slug' in stream
        ? String((stream as { slug: string }).slug)
        : null
    if (!slug) continue

    const job: PathForwardingJob = {
      type: String(doc.type || ''),
      enabled: Boolean(doc.enabled),
      destinationUrl: String(doc.destinationUrl || ''),
      restartOnFailure: doc.restartOnFailure !== false,
    }

    if (!bySlug[slug]) bySlug[slug] = []
    bySlug[slug].push(job)
  }

  return bySlug
}

export async function syncStreamToMediaMtx(
  payload: Payload,
  stream: Stream,
): Promise<SyncResult> {
  const errors: string[] = []

  try {
    const streams = await fetchAllStreams(payload)
    const jobsBySlug = await fetchForwardingJobsBySlug(payload)
    const corsGlobal = await payload.findGlobal({ slug: 'cors-origins' })
    const cors = corsFromGlobal(corsGlobal as Record<string, unknown>)
    const protocolGlobal = await payload.findGlobal({ slug: 'protocol-settings' })
    const authSettings = authFromGlobal(protocolGlobal as Record<string, unknown>)
    const protocolPatch = buildProtocolPatch(protocolGlobal as Record<string, unknown>)

    const before = await readCurrentYaml()
    const afterDoc = await generateYamlDocument(
      streams,
      cors,
      protocolPatch,
      authSettings,
      jobsBySlug,
    )
    const validation = await validateConfig(afterDoc)
    if (!validation.valid) {
      return { ok: false, diffs: [], errors: validation.errors }
    }

    const backupPath = await backupConfig()
    await writeYamlConfig(afterDoc)

    if (stream.enabled) {
      await patchPathViaApi(stream, jobsBySlug[stream.slug] || [])
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

/**
 * Cleanup after a stream is deleted: regenerate the YAML from the remaining
 * streams (the deleted doc is already gone from the DB when afterDelete fires)
 * and remove the path from the running MediaMTX instance. Best-effort.
 */
export async function removeStreamFromMediaMtx(payload: Payload, slug: string): Promise<void> {
  try {
    const streams = await fetchAllStreams(payload)
    const jobsBySlug = await fetchForwardingJobsBySlug(payload)
    const corsGlobal = await payload.findGlobal({ slug: 'cors-origins' })
    const cors = corsFromGlobal(corsGlobal as Record<string, unknown>)
    const protocolGlobal = await payload.findGlobal({ slug: 'protocol-settings' })
    const authSettings = authFromGlobal(protocolGlobal as Record<string, unknown>)
    const protocolPatch = buildProtocolPatch(protocolGlobal as Record<string, unknown>)

    const afterDoc = await generateYamlDocument(
      streams,
      cors,
      protocolPatch,
      authSettings,
      jobsBySlug,
    )
    await backupConfig()
    await writeYamlConfig(afterDoc)
    await deletePathViaApi(slug)
  } catch {
    // best-effort: a missing config file or offline MediaMTX must not block delete
  }
}

export async function applyFullConfig(payload: Payload): Promise<SyncResult> {
  const errors: string[] = []

  try {
    const streams = await fetchAllStreams(payload)
    const jobsBySlug = await fetchForwardingJobsBySlug(payload)
    const corsGlobal = await payload.findGlobal({ slug: 'cors-origins' })
    const cors = corsFromGlobal(corsGlobal as Record<string, unknown>)
    const corsErrors = validateCorsForProduction(cors)
    if (corsErrors.length > 0) {
      return { ok: false, diffs: [], errors: corsErrors }
    }

    const protocolGlobal = await payload.findGlobal({ slug: 'protocol-settings' })
    const authSettings = authFromGlobal(protocolGlobal as Record<string, unknown>)
    const protocolPatch = buildProtocolPatch(protocolGlobal as Record<string, unknown>)

    const before = await readCurrentYaml()
    const afterDoc = await generateYamlDocument(
      streams,
      cors,
      protocolPatch,
      authSettings,
      jobsBySlug,
    )
    const validation = await validateConfig(afterDoc)
    if (!validation.valid) {
      return { ok: false, diffs: [], errors: validation.errors }
    }

    const backupPath = await backupConfig()
    await writeYamlConfig(afterDoc)

    await patchGlobalViaApi({
      ...mapCorsToYaml(cors),
      ...protocolPatch,
      ...buildAuthSection(streams, authSettings),
    })

    for (const stream of streams) {
      if (stream.enabled) {
        await patchPathViaApi(stream, jobsBySlug[stream.slug] || [])
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
    const jobsBySlug = await fetchForwardingJobsBySlug(payload)
    const corsGlobal = await payload.findGlobal({ slug: 'cors-origins' })
    const cors = corsFromGlobal(corsGlobal as Record<string, unknown>)
    const protocolGlobal = await payload.findGlobal({ slug: 'protocol-settings' })
    const authSettings = authFromGlobal(protocolGlobal as Record<string, unknown>)
    const protocolPatch = buildProtocolPatch(protocolGlobal as Record<string, unknown>)

    const before = await readCurrentYaml()
    const afterDoc = await generateYamlDocument(
      streams,
      cors,
      protocolPatch,
      authSettings,
      jobsBySlug,
    )
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
