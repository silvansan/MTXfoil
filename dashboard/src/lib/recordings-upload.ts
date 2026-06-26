export type S3UploadConfig = {
  enabled: boolean
  endpoint: string | null
  bucket: string | null
  region: string | null
  hasCredentials: boolean
}

export function listUploadConfig(): S3UploadConfig {
  const endpoint = process.env.S3_ENDPOINT?.trim() || null
  const bucket = process.env.S3_BUCKET?.trim() || null
  const region = process.env.S3_REGION?.trim() || null
  const accessKey = process.env.S3_ACCESS_KEY?.trim()
  const secretKey = process.env.S3_SECRET_KEY?.trim()
  const enabled = process.env.RECORDING_UPLOAD_ENABLED === 'true'

  return {
    enabled,
    endpoint,
    bucket,
    region,
    hasCredentials: Boolean(accessKey && secretKey),
  }
}

export function validateS3Env(): { ok: boolean; errors: string[] } {
  const config = listUploadConfig()
  const errors: string[] = []

  if (!config.enabled) {
    return { ok: true, errors: [] }
  }

  if (!config.endpoint) errors.push('S3_ENDPOINT is required when RECORDING_UPLOAD_ENABLED=true')
  if (!config.bucket) errors.push('S3_BUCKET is required when RECORDING_UPLOAD_ENABLED=true')
  if (!config.region) errors.push('S3_REGION is required when RECORDING_UPLOAD_ENABLED=true')
  if (!config.hasCredentials) {
    errors.push('S3_ACCESS_KEY and S3_SECRET_KEY are required when RECORDING_UPLOAD_ENABLED=true')
  }

  return { ok: errors.length === 0, errors }
}

/** Placeholder for future worker/dashboard upload hook. */
export function logUploadNotWired(context: string): void {
  console.warn(`[recordings-upload] S3 upload not yet wired (${context})`)
}
