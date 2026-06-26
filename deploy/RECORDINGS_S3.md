# Recording upload to S3 (scaffold)

MTXfoil stores recordings on the local `./recordings` volume by default. This document describes the **scaffold** for optional S3-compatible offload. Full lifecycle automation (upload on segment close, retention policies) is not yet wired.

## Environment variables

Set in `.env` (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `RECORDING_UPLOAD_ENABLED` | Set `true` to enable upload tooling (default off) |
| `S3_ENDPOINT` | S3-compatible endpoint URL |
| `S3_BUCKET` | Target bucket name |
| `S3_ACCESS_KEY` | Access key ID |
| `S3_SECRET_KEY` | Secret access key |
| `S3_REGION` | Region (required by most providers) |

Dashboard helpers in `dashboard/src/lib/recordings-upload.ts`:

- `listUploadConfig()` — read current env state
- `validateS3Env()` — validate required vars when upload is enabled

## Manual upload script

Install the AWS SDK in the dashboard package (one-time):

```bash
cd dashboard
npm install @aws-sdk/client-s3
```

Upload all files from a local recordings directory:

```bash
node scripts/upload-recordings-s3.mjs
```

Optional environment:

| Variable | Default | Purpose |
|----------|---------|---------|
| `RECORDINGS_DIR` | `./recordings` | Local directory to scan |
| `S3_PREFIX` | `recordings/` | Key prefix inside the bucket |

The script uses the same `S3_*` variables as the dashboard. It skips upload when `RECORDING_UPLOAD_ENABLED` is not `true`.

## What is not implemented yet

- Automatic upload when MediaMTX finishes a recording segment
- Worker queue job for retries and lifecycle
- Deletion of local files after successful upload
- UI toggle beyond env-based scaffold

For disaster recovery of recordings today, use file-level backup of the recordings volume (see `deploy/BACKUPS.md`).
