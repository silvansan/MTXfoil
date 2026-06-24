#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/postgres}"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
OUTPUT_FILE="$BACKUP_DIR/mtxfoil-postgres-$TIMESTAMP.sql.gz"

POSTGRES_USER="${POSTGRES_USER:-mtxfoil}"
POSTGRES_DB="${POSTGRES_DB:-mtxfoil}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-mtxfoil-postgres}"

mkdir -p "$BACKUP_DIR"

echo "Creating Postgres backup: $OUTPUT_FILE"
docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUTPUT_FILE"
echo "Backup complete."
