import { readFile } from 'node:fs/promises'

const DEFAULT_TAIL_LINES = 100

export type MediaMtxLogsResult = {
  source: 'file' | 'instructions'
  lines: string[]
  message?: string
}

export async function tailMediaMtxLogs(maxLines = DEFAULT_TAIL_LINES): Promise<MediaMtxLogsResult> {
  const logPath = process.env.MEDIAMTX_LOG_PATH?.trim()

  if (logPath) {
    try {
      const content = await readFile(logPath, 'utf8')
      const lines = content.split(/\r?\n/).filter(Boolean)
      return {
        source: 'file',
        lines: lines.slice(-maxLines),
      }
    } catch (err) {
      return {
        source: 'instructions',
        lines: [],
        message: err instanceof Error ? err.message : 'Failed to read log file',
      }
    }
  }

  return {
    source: 'instructions',
    lines: [],
    message:
      'MediaMTX logs to stdout by default. Tail container logs: docker logs mtxfoil-mediamtx --tail 100. ' +
      'To read from a file here, set MEDIAMTX_LOG_PATH to a mounted log path.',
  }
}
