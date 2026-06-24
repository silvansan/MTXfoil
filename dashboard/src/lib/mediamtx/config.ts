import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'

import type { Stream } from '@/payload-types'
import { mapStreamAuthToPath } from './auth'
import { mapCorsToYaml, type CorsSettings } from './cors'
import { mtxFetch } from './client'
import type { PathConf } from './types'

export function getConfigPath(): string {
  return process.env.MEDIAMTX_CONFIG_PATH || path.join(process.cwd(), '../mediamtx/mediamtx.yml')
}

export function getBackupDir(): string {
  return process.env.MEDIAMTX_BACKUP_DIR || path.join(process.cwd(), '../mediamtx/backups')
}

export async function readCurrentYaml(): Promise<Record<string, unknown>> {
  const configPath = getConfigPath()
  const content = await fs.readFile(configPath, 'utf8')
  return (yaml.load(content) as Record<string, unknown>) || {}
}

export function streamToPathConf(stream: Stream): PathConf {
  const auth = mapStreamAuthToPath(stream)
  const conf: PathConf = {
    name: stream.slug,
    source: stream.sourceType === 'redirect' ? 'redirect' : 'publisher',
    record: Boolean(stream.recordingEnabled),
    recordPath: stream.recordingEnabled ? './recordings/%path/%Y-%m-%d_%H-%M-%S-%f' : undefined,
    overridePublisher: true,
  }

  if (stream.sourceType === 'redirect' && stream.sourceUrl) {
    conf.sourceRedirect = stream.sourceUrl
  }

  if (auth.publishUser) {
    ;(conf as Record<string, unknown>).publishUser = auth.publishUser
    ;(conf as Record<string, unknown>).publishPass = auth.publishPass
  }
  if (auth.readUser) {
    ;(conf as Record<string, unknown>).readUser = auth.readUser
    ;(conf as Record<string, unknown>).readPass = auth.readPass
  }

  return conf
}

export function buildPathsSection(streams: Stream[]): Record<string, Omit<PathConf, 'name'>> {
  const paths: Record<string, Omit<PathConf, 'name'>> = {}
  for (const stream of streams) {
    if (!stream.enabled) continue
    const { name: _name, ...rest } = streamToPathConf(stream)
    paths[stream.slug] = rest
  }
  return paths
}

export async function generateYamlDocument(
  streams: Stream[],
  cors?: CorsSettings,
  protocolPatch?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const current = await readCurrentYaml()
  const paths = buildPathsSection(streams)

  return {
    ...current,
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

export async function patchPathViaApi(stream: Stream): Promise<void> {
  const conf = streamToPathConf(stream)
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
