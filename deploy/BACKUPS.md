# MTXfoil Backups

This document covers backup procedures for PostgreSQL (desired state) and MediaMTX configuration (runtime paths and protocol settings).

## PostgreSQL

Postgres holds streams, events, users, forwarding jobs, and globals. Back it up before upgrades and on a regular schedule.

### Create a backup

**Linux / macOS:**

```bash
./scripts/backup-postgres.sh
```

**Windows (PowerShell):**

```powershell
.\scripts\backup-postgres.ps1
```

Optional environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `BACKUP_DIR` | `./backups/postgres` | Output directory |
| `POSTGRES_USER` | `mtxfoil` | Database user |
| `POSTGRES_DB` | `mtxfoil` | Database name |
| `POSTGRES_CONTAINER` | `mtxfoil-postgres` | Running container name |

Output files are gzip-compressed SQL dumps named `mtxfoil-postgres-<timestamp>.sql.gz`.

### Restore

1. Stop the dashboard and worker to avoid writes.
2. Restore into Postgres:

```bash
gunzip -c backups/postgres/mtxfoil-postgres-YYYYMMDDTHHMMSSZ.sql.gz | \
  docker exec -i mtxfoil-postgres psql -U mtxfoil -d mtxfoil
```

3. Restart services and verify `/admin` login and stream list.

## MediaMTX configuration

The dashboard writes `mediamtx.yml` on stream/global save and before each apply via `backupConfig()`.

| Setting | Default |
|---------|---------|
| Live config | `MEDIAMTX_CONFIG_PATH` (compose: `/app/mediamtx-config/mediamtx.yml`) |
| Backups | `MEDIAMTX_BACKUP_DIR` (compose: `/app/mediamtx-config/backups`) |

Each apply creates a timestamped file: `mediamtx-<ISO-timestamp>.yml`.

### Retention policy (recommended)

MTXfoil does not auto-prune backups. On production hosts, schedule cleanup, for example:

- Keep daily backups for 7 days
- Keep weekly backups for 4 weeks
- Copy the latest backup off-host (S3, NAS, or backup server)

Example (Linux cron, keep 14 days):

```bash
find /path/to/mediamtx/backups -name 'mediamtx-*.yml' -mtime +14 -delete
```

### Restore MediaMTX config

1. Copy the desired backup over `mediamtx.yml` on the shared volume.
2. Restart MediaMTX or run **Settings → Apply config** from the operator UI.
3. Confirm paths and protocol settings on `/settings` and `/protocols`.

## Recordings

Recorded segments live in the `./recordings` volume (or your host mount). They are not included in Postgres or YAML backups. Plan separate file-level backup or lifecycle rules for that directory.

Optional S3-compatible upload scaffold: see [RECORDINGS_S3.md](./RECORDINGS_S3.md).

## Disaster recovery order

1. Restore Postgres (source of truth for streams and settings)
2. Restore or regenerate `mediamtx.yml` (apply from dashboard after Postgres restore)
3. Restore recordings volume if needed
4. Run `./scripts/smoke-test.sh` or `node scripts/smoke-test.mjs`
