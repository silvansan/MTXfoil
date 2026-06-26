#!/usr/bin/env node
/**
 * Manual S3 upload for local recording files (scaffold).
 * Requires: cd dashboard && npm install @aws-sdk/client-s3
 */
import { createReadStream, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const repoRoot = fileURLToPath(new URL('..', import.meta.url))

function loadS3Client() {
  try {
    const mod = require(join(repoRoot, 'dashboard/node_modules/@aws-sdk/client-s3'))
    return mod.S3Client
  } catch {
    console.error('Missing @aws-sdk/client-s3. Run: cd dashboard && npm install @aws-sdk/client-s3')
    process.exit(1)
  }
}

function env(name, fallback = '') {
  return (process.env[name] || fallback).trim()
}

function walkFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkFiles(full))
    else if (entry.isFile()) files.push(full)
  }
  return files
}

async function main() {
  if (env('RECORDING_UPLOAD_ENABLED') !== 'true') {
    console.log('RECORDING_UPLOAD_ENABLED is not true — skipping upload')
    return
  }

  const endpoint = env('S3_ENDPOINT')
  const bucket = env('S3_BUCKET')
  const region = env('S3_REGION')
  const accessKeyId = env('S3_ACCESS_KEY')
  const secretAccessKey = env('S3_SECRET_KEY')
  const recordingsDir = env('RECORDINGS_DIR', './recordings')
  const prefix = env('S3_PREFIX', 'recordings/')

  const missing = []
  if (!endpoint) missing.push('S3_ENDPOINT')
  if (!bucket) missing.push('S3_BUCKET')
  if (!region) missing.push('S3_REGION')
  if (!accessKeyId) missing.push('S3_ACCESS_KEY')
  if (!secretAccessKey) missing.push('S3_SECRET_KEY')
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(', ')}`)
  }

  const S3Client = loadS3Client()
  const { PutObjectCommand } = require(join(repoRoot, 'dashboard/node_modules/@aws-sdk/client-s3'))

  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })

  const files = walkFiles(recordingsDir)
  if (files.length === 0) {
    console.log(`No files under ${recordingsDir}`)
    return
  }

  for (const filePath of files) {
    const key = `${prefix}${relative(recordingsDir, filePath).replace(/\\/g, '/')}`
    const body = createReadStream(filePath)
    const size = statSync(filePath).size
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentLength: size,
      }),
    )
    console.log(`Uploaded ${key}`)
  }

  console.log(`Done — ${files.length} file(s) uploaded to s3://${bucket}/${prefix}`)
}

main().catch((err) => {
  console.error('FAIL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
