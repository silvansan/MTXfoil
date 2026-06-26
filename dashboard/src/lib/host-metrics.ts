import { execFile } from 'node:child_process'
import { statfs } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type HostGpuInfo =
  | { available: false }
  | { available: true; name: string; utilizationPercent: number | null }

export type HostMetrics = {
  cpuPercent: number | null
  ramUsedBytes: number
  ramTotalBytes: number
  diskUsedBytes: number | null
  diskTotalBytes: number | null
  diskPath: string | null
  netRxBytes: number | null
  netTxBytes: number | null
  gpu: HostGpuInfo
  scope: 'container' | 'host'
}

let prevCpu: { idle: number; total: number } | null = null

async function readCpuPercent(): Promise<number | null> {
  try {
    const stat = await readFile('/proc/stat', 'utf8')
    const first = stat.split('\n')[0]
    if (!first?.startsWith('cpu ')) return null
    const parts = first.split(/\s+/).slice(1).map(Number)
    const idle = parts[3]! + (parts[4] ?? 0)
    const total = parts.reduce((sum, n) => sum + n, 0)
    if (!prevCpu) {
      prevCpu = { idle, total }
      return null
    }
    const idleDelta = idle - prevCpu.idle
    const totalDelta = total - prevCpu.total
    prevCpu = { idle, total }
    if (totalDelta <= 0) return null
    return Math.min(100, Math.max(0, ((totalDelta - idleDelta) / totalDelta) * 100))
  } catch {
    return null
  }
}

async function readDiskUsage(): Promise<{
  usedBytes: number | null
  totalBytes: number | null
  path: string | null
}> {
  const candidates = [
    process.env.MEDIAMTX_CONFIG_PATH,
    process.env.MEDIAMTX_BACKUP_DIR,
    '/recordings',
    '/',
  ].filter((p): p is string => Boolean(p?.trim()))

  for (const path of candidates) {
    try {
      const info = await statfs(path)
      const totalBytes = Number(info.bsize) * info.blocks
      const freeBytes = Number(info.bsize) * info.bfree
      const usedBytes = totalBytes - freeBytes
      if (totalBytes > 0) {
        return { usedBytes, totalBytes, path }
      }
    } catch {
      // try next path
    }
  }

  return { usedBytes: null, totalBytes: null, path: null }
}

async function readNetworkBytes(): Promise<{ rx: number; tx: number } | null> {
  try {
    const content = await readFile('/proc/net/dev', 'utf8')
    let rx = 0
    let tx = 0
    for (const line of content.split('\n').slice(2)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const colon = trimmed.indexOf(':')
      if (colon === -1) continue
      const iface = trimmed.slice(0, colon).trim()
      if (iface === 'lo') continue
      const nums = trimmed
        .slice(colon + 1)
        .trim()
        .split(/\s+/)
        .map(Number)
      if (nums.length < 10) continue
      rx += nums[0]!
      tx += nums[8]!
    }
    return { rx, tx }
  } catch {
    return null
  }
}

async function readGpu(): Promise<HostGpuInfo> {
  try {
    const { stdout } = await execFileAsync(
      'nvidia-smi',
      ['--query-gpu=name,utilization.gpu', '--format=csv,noheader,nounits'],
      { timeout: 2000 },
    )
    const line = stdout.trim().split('\n')[0]
    if (!line) return { available: false }
    const comma = line.lastIndexOf(',')
    if (comma === -1) return { available: false }
    const name = line.slice(0, comma).trim()
    const utilRaw = line.slice(comma + 1).trim()
    const utilizationPercent = utilRaw === '[N/A]' ? null : Number(utilRaw)
    return {
      available: true,
      name,
      utilizationPercent: Number.isFinite(utilizationPercent) ? utilizationPercent : null,
    }
  } catch {
    return { available: false }
  }
}

export async function collectHostMetrics(): Promise<HostMetrics> {
  const ramTotalBytes = os.totalmem()
  const ramUsedBytes = ramTotalBytes - os.freemem()
  const [cpuPercent, disk, net, gpu] = await Promise.all([
    readCpuPercent(),
    readDiskUsage(),
    readNetworkBytes(),
    readGpu(),
  ])

  return {
    cpuPercent,
    ramUsedBytes,
    ramTotalBytes,
    diskUsedBytes: disk.usedBytes,
    diskTotalBytes: disk.totalBytes,
    diskPath: disk.path,
    netRxBytes: net?.rx ?? null,
    netTxBytes: net?.tx ?? null,
    gpu,
    scope: 'container',
  }
}
