import type { Payload } from 'payload'

import {
  fetchAllStreams,
  fetchForwardingJobsBySlug,
} from './config-sync'
import { mtxHealthCheck } from './mediamtx/client'
import {
  buildAuthSection,
  backupConfig,
  envCredentialsMatchYaml,
  generateYamlDocument,
  getMediaMtxInternalCredentials,
  patchGlobalViaApi,
  readCurrentYaml,
  readYamlInternalSuperuser,
  reloadConfig,
  validateConfig,
  writeYamlConfig,
  type InternalCredentials,
} from './mediamtx/config'
import { buildProtocolPatch } from './mediamtx/protocol'
import { enrichCorsFromEnv, type CorsSettings } from './mediamtx/cors'

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

function corsFromPayloadGlobal(corsGlobal: Record<string, unknown>): CorsSettings {
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

function authFromGlobal(protocolGlobal: Record<string, unknown>) {
  const auth = (protocolGlobal.auth as Record<string, unknown> | undefined) || {}
  return {
    method: (auth.method as 'internal' | 'http' | 'jwt' | null | undefined) ?? 'internal',
    httpAddress: (auth.httpAddress as string | null) ?? null,
    jwtJwks: (auth.jwtJwks as string | null) ?? null,
    jwtClaimKey: (auth.jwtClaimKey as string | null) ?? null,
    jwtIssuer: (auth.jwtIssuer as string | null) ?? null,
    jwtAudience: (auth.jwtAudience as string | null) ?? null,
  }
}

const DEFAULT_BOOTSTRAP_CREDS: InternalCredentials = { user: 'mtxfoil', pass: 'mtxfoil' }

/**
 * After a fresh Portainer deploy, mediamtx-config-init seeds baseline mediamtx.yml
 * (mtxfoil:mtxfoil) while MEDIAMTX_INTERNAL_USER/PASS come from stack env. Sync YAML
 * + hot-apply auth using the credentials currently in mediamtx.yml.
 */
export async function syncMediaMtxCredentialsIfNeeded(payload: Payload): Promise<boolean> {
  const envCreds = getMediaMtxInternalCredentials()
  const yamlCreds = await readYamlInternalSuperuser()
  const currentDoc = await readCurrentYaml()

  if (currentDoc.authMethod && currentDoc.authMethod !== 'internal') {
    return false
  }

  const health = await mtxHealthCheck()
  if (health.ok && envCredentialsMatchYaml(envCreds, yamlCreds)) {
    return false
  }

  if (envCredentialsMatchYaml(envCreds, yamlCreds) && !health.ok) {
    console.warn(
      `[mediamtx-startup] mediamtx.yml credentials match env but API probe failed: ${health.error ?? 'unknown'}`,
    )
    return false
  }

  const bootstrapCreds = yamlCreds ?? DEFAULT_BOOTSTRAP_CREDS
  console.log(
    `[mediamtx-startup] Syncing MEDIAMTX_INTERNAL_USER/PASS into mediamtx.yml (bootstrap via ${bootstrapCreds.user})`,
  )

  const streams = await fetchAllStreams(payload)
  const jobsBySlug = await fetchForwardingJobsBySlug(payload)
  const corsGlobal = await payload.findGlobal({ slug: 'cors-origins' })
  const cors = corsFromPayloadGlobal(corsGlobal as unknown as Record<string, unknown>)
  const protocolGlobal = await payload.findGlobal({ slug: 'protocol-settings' })
  const authSettings = authFromGlobal(protocolGlobal as unknown as Record<string, unknown>)
  const protocolPatch = buildProtocolPatch(protocolGlobal as unknown as Record<string, unknown>)

  const afterDoc = await generateYamlDocument(
    streams,
    cors,
    protocolPatch,
    authSettings,
    jobsBySlug,
  )
  const validation = await validateConfig(afterDoc)
  if (!validation.valid) {
    console.error('[mediamtx-startup] Config validation failed:', validation.errors.join('; '))
    return false
  }

  await backupConfig()
  await writeYamlConfig(afterDoc)

  const authPatch = buildAuthSection(streams, authSettings)
  await patchGlobalViaApi(authPatch, { basicAuth: bootstrapCreds })
  await reloadConfig({ basicAuth: bootstrapCreds })

  const after = await mtxHealthCheck()
  if (after.ok) {
    console.log('[mediamtx-startup] MediaMTX credentials synced; API auth OK')
    return true
  }

  console.warn(
    `[mediamtx-startup] YAML updated but API still failing — apply config from /settings: ${after.error ?? 'unknown'}`,
  )
  return false
}
