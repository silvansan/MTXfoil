import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'

import type { Stream } from '@/payload-types'
import { mapStreamAuthToPath } from './auth'
import { mapCorsToYaml, type CorsSettings } from './cors'
import { mtxFetch } from './client'
import type { PathConf } from './types'

export type PathForwardingJob = {
  type: string
  enabled: boolean
  destinationUrl: string
  restartOnFailure?: boolean
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function localRtmpReadUrl(slug: string): string {
  const { user, pass } = getMediaMtxInternalCredentials()
  const host = process.env.MEDIAMTX_RUNONREADY_HOST || '127.0.0.1'
  const port = process.env.RTMP_PORT || '1935'
  const q = `?user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`
  return `rtmp://${host}:${port}/${slug}${q}`
}

/** FFmpeg one-liner for MediaMTX runOnReady (runs inside the MediaMTX container). */
export function buildRtmpPushRunOnReadyCommand(slug: string, destinationUrl: string): string {
  const input = localRtmpReadUrl(slug)
  return [
    'ffmpeg',
    '-nostdin',
    '-hide_banner',
    '-nostats',
    '-loglevel',
    'warning',
    '-rw_timeout',
    '5000000',
    '-i',
    shellQuote(input),
    '-c',
    'copy',
    '-f',
    'flv',
    shellQuote(destinationUrl),
  ].join(' ')
}

function applyRunOnReady(
  conf: PathConf,
  slug: string,
  jobs: PathForwardingJob[] | undefined,
): void {
  const rtmpJobs = (jobs || []).filter((j) => j.enabled && j.type === 'rtmp-push' && j.destinationUrl)
  if (rtmpJobs.length === 0) return

  const commands = rtmpJobs.map((j) => buildRtmpPushRunOnReadyCommand(slug, j.destinationUrl))
  conf.runOnReady = commands.length === 1 ? commands[0] : commands.join(' & ')
  conf.runOnReadyRestart = rtmpJobs.some((j) => j.restartOnFailure !== false)
}

export function getMediaMtxInternalCredentials(): { user: string; pass: string } {
  return {
    user: process.env.MEDIAMTX_INTERNAL_USER || 'mtxfoil',
    pass: process.env.MEDIAMTX_INTERNAL_PASS || 'mtxfoil',
  }
}

/** Auth modes whose paths are readable by anonymous viewers (no MediaMTX credentials). */
const ANONYMOUS_READ_MODES = new Set(['public', 'unlisted'])

/**
 * Global MediaMTX auth method selection (sourced from the ProtocolSettings
 * `auth` group). In MediaMTX `authMethod` is a SERVER-WIDE setting (not
 * per-path), so this drives how *all* publish/read/playback requests are
 * authorized. Per-stream `authMode` still describes each stream's access
 * policy and is enforced either by the internal user list (internal mode) or
 * by the built-in HTTP auth endpoint (http mode).
 */
export type AuthSettings = {
  method?: 'internal' | 'http' | 'jwt' | null
  httpAddress?: string | null
  jwtJwks?: string | null
  jwtClaimKey?: string | null
  jwtIssuer?: string | null
  jwtAudience?: string | null
}

/**
 * Default endpoint MediaMTX calls when "External HTTP" mode is selected and no
 * custom address is configured. Points at the dashboard's own built-in auth
 * endpoint (reachable as the `dashboard` service on the compose network), which
 * authorizes based on each stream's per-stream `authMode`.
 */
export function getDefaultAuthHttpAddress(): string {
  return process.env.MEDIAMTX_AUTH_HTTP_URL || 'http://dashboard:3000/api/mediamtx/auth'
}

/**
 * Actions that must never be gated by an external/JWT auth backend, so the
 * dashboard control plane (config patches, status polling, metrics scrape)
 * cannot be locked out if that backend is misconfigured or unreachable. These
 * ports are bound to the internal Docker network only.
 */
const CONTROL_PLANE_EXCLUDE = [
  { action: 'api', path: '' },
  { action: 'metrics', path: '' },
  { action: 'pprof', path: '' },
]

/**
 * Build the global auth section for the generated YAML / API patch. `internal`
 * (the default) preserves the existing behavior exactly. `http`/`jwt` switch the
 * server-wide auth method and add the relevant connection settings.
 */
export function buildAuthSection(
  streams: Stream[] = [],
  authSettings?: AuthSettings,
): Record<string, unknown> {
  const method = authSettings?.method || 'internal'

  if (method === 'http') {
    return {
      authMethod: 'http',
      authHTTPAddress: authSettings?.httpAddress?.trim() || getDefaultAuthHttpAddress(),
      authHTTPExclude: CONTROL_PLANE_EXCLUDE,
    }
  }

  if (method === 'jwt') {
    const conf: Record<string, unknown> = {
      authMethod: 'jwt',
      authJWTClaimKey: authSettings?.jwtClaimKey?.trim() || 'mediamtx_permissions',
      authJWTExclude: CONTROL_PLANE_EXCLUDE,
    }
    if (authSettings?.jwtJwks?.trim()) conf.authJWTJWKS = authSettings.jwtJwks.trim()
    if (authSettings?.jwtIssuer?.trim()) conf.authJWTIssuer = authSettings.jwtIssuer.trim()
    if (authSettings?.jwtAudience?.trim()) conf.authJWTAudience = authSettings.jwtAudience.trim()
    return conf
  }

  return buildInternalAuthSection(streams)
}

export function buildInternalAuthSection(streams: Stream[] = []): Record<string, unknown> {
  const { user, pass } = getMediaMtxInternalCredentials()

  const authInternalUsers: Array<Record<string, unknown>> = [
    {
      user,
      pass,
      ips: [],
      permissions: [
        { action: 'publish', path: '' },
        { action: 'read', path: '' },
        { action: 'playback', path: '' },
        { action: 'api', path: '' },
        { action: 'metrics', path: '' },
      ],
    },
  ]

  // Grant anonymous read/playback only on the specific paths that opt into
  // public/unlisted access. This lets the player (and embeds) load HLS/WebRTC
  // directly from MediaMTX without triggering a Basic Auth prompt, while
  // internal/password/token streams remain protected.
  const anonymousReadPaths = streams
    .filter(
      (s) =>
        s.enabled &&
        s.playbackEnabled &&
        ANONYMOUS_READ_MODES.has(s.authMode || 'internal'),
    )
    .map((s) => s.slug)

  if (anonymousReadPaths.length > 0) {
    authInternalUsers.push({
      user: 'any',
      pass: '',
      ips: [],
      permissions: anonymousReadPaths.flatMap((p) => [
        { action: 'read', path: p },
        { action: 'playback', path: p },
      ]),
    })
  }

  return {
    authMethod: 'internal',
    authInternalUsers,
  }
}

export function getConfigPath(): string {
  return process.env.MEDIAMTX_CONFIG_PATH || path.join(process.cwd(), '../mediamtx/mediamtx.yml')
}

export function getBackupDir(): string {
  return process.env.MEDIAMTX_BACKUP_DIR || path.join(process.cwd(), '../mediamtx/backups')
}

export async function readCurrentYaml(): Promise<Record<string, unknown>> {
  await ensureConfigExists()
  const configPath = getConfigPath()
  const content = await fs.readFile(configPath, 'utf8')
  return (yaml.load(content) as Record<string, unknown>) || {}
}

/** Copy bundled baseline config when the shared volume is empty (first Portainer deploy). */
export async function ensureConfigExists(): Promise<void> {
  const configPath = getConfigPath()
  try {
    await fs.access(configPath)
    return
  } catch {
    // missing — seed below
  }

  const baselinePath =
    process.env.MEDIAMTX_BASELINE_CONFIG_PATH ||
    path.join(process.cwd(), 'mediamtx-baseline', 'mediamtx.yml')

  try {
    await fs.mkdir(path.dirname(configPath), { recursive: true })
    await fs.copyFile(baselinePath, configPath)
    console.log(`[config] Seeded ${configPath} from ${baselinePath}`)
  } catch (err) {
    throw new Error(
      `MediaMTX config missing at ${configPath} and baseline not found at ${baselinePath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  }
}

export function streamToPathConf(
  stream: Stream,
  forwardingJobs?: PathForwardingJob[],
): PathConf {
  const auth = mapStreamAuthToPath(stream)
  const conf: PathConf = {
    name: stream.slug,
    source: 'publisher',
    record: Boolean(stream.recordingEnabled),
    recordPath: stream.recordingEnabled ? './recordings/%path/%Y-%m-%d_%H-%M-%S-%f' : undefined,
    overridePublisher: true,
  }

  if (stream.sourceType === 'redirect' && stream.sourceUrl) {
    conf.source = 'redirect'
    conf.sourceRedirect = stream.sourceUrl
  } else if (stream.sourceType === 'proxy' && stream.sourceUrl) {
    conf.source = stream.sourceUrl
    ;(conf as Record<string, unknown>).sourceOnDemand = true
  }

  if (auth.publishUser) {
    ;(conf as Record<string, unknown>).publishUser = auth.publishUser
    ;(conf as Record<string, unknown>).publishPass = auth.publishPass
  }
  if (auth.readUser) {
    ;(conf as Record<string, unknown>).readUser = auth.readUser
    ;(conf as Record<string, unknown>).readPass = auth.readPass
  }

  applyRunOnReady(conf, stream.slug, forwardingJobs)

  return conf
}

export function buildPathsSection(
  streams: Stream[],
  jobsBySlug: Record<string, PathForwardingJob[]> = {},
): Record<string, Omit<PathConf, 'name'>> {
  const paths: Record<string, Omit<PathConf, 'name'>> = {}
  for (const stream of streams) {
    if (!stream.enabled) continue
    const { name: _name, ...rest } = streamToPathConf(stream, jobsBySlug[stream.slug] || [])
    paths[stream.slug] = rest
  }
  return paths
}

export async function generateYamlDocument(
  streams: Stream[],
  cors?: CorsSettings,
  protocolPatch?: Record<string, unknown>,
  authSettings?: AuthSettings,
  jobsBySlug: Record<string, PathForwardingJob[]> = {},
): Promise<Record<string, unknown>> {
  const current = await readCurrentYaml()
  const paths = buildPathsSection(streams, jobsBySlug)

  return {
    ...current,
    ...buildAuthSection(streams, authSettings),
    ...(cors ? mapCorsToYaml(cors) : {}),
    ...(protocolPatch || {}),
    paths,
  }
}

export async function backupConfig(): Promise<string> {
  const configPath = getConfigPath()
  const backupDir = getBackupDir()
  await fs.mkdir(backupDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDir, `mediamtx-${timestamp}.yml`)
  await fs.copyFile(configPath, backupPath)
  return backupPath
}

export async function writeYamlConfig(doc: Record<string, unknown>): Promise<void> {
  const configPath = getConfigPath()
  const content = yaml.dump(doc, { lineWidth: 120, noRefs: true })
  await fs.writeFile(configPath, content, 'utf8')
}

export async function patchPathViaApi(
  stream: Stream,
  forwardingJobs?: PathForwardingJob[],
): Promise<void> {
  const conf = streamToPathConf(stream, forwardingJobs)
  const { name, ...body } = conf

  try {
    await mtxFetch(`/v3/config/paths/get/${encodeURIComponent(name)}`)
    await mtxFetch(`/v3/config/paths/patch/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  } catch {
    await mtxFetch(`/v3/config/paths/add/${encodeURIComponent(name)}`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }
}

export async function deletePathViaApi(slug: string): Promise<void> {
  try {
    await mtxFetch(`/v3/config/paths/delete/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
    })
  } catch {
    // path may not exist
  }
}

export async function patchGlobalViaApi(patch: Record<string, unknown>): Promise<void> {
  await mtxFetch('/v3/config/global/patch', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function reloadConfig(): Promise<void> {
  try {
    await mtxFetch('/v3/config/reload', { method: 'POST' })
  } catch {
    // reload endpoint may not exist in all versions
  }
}

export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Array<{ key: string; before: unknown; after: unknown }> {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const diffs: Array<{ key: string; before: unknown; after: unknown }> = []

  for (const key of keys) {
    const b = before[key]
    const a = after[key]
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      diffs.push({ key, before: b, after: a })
    }
  }

  return diffs
}

export async function validateConfig(doc: Record<string, unknown>): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []
  if (!doc.paths || typeof doc.paths !== 'object') {
    errors.push('paths section is required')
  }
  if (doc.api !== 'yes' && doc.api !== true) {
    errors.push('api should be enabled for dashboard control')
  }
  return { valid: errors.length === 0, errors }
}
