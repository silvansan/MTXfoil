#!/usr/bin/env bash
# MTXfoil first-run bootstrap — seed config, validate compose, print next steps.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> MTXfoil bootstrap"

if [[ ! -f .env ]]; then
  echo "Copying .env.example → .env"
  cp .env.example .env
  echo "!! Edit .env and set secrets before production deploy"
fi

echo "==> Validating Docker Compose"
docker compose -f docker-compose.yml config >/dev/null
docker compose -f docker-compose.yml -f docker-compose.prod.yml config >/dev/null

echo "==> Seeding MediaMTX baseline into local volume (if empty)"
CONFIG_DIR="$ROOT/mediamtx"
mkdir -p "$CONFIG_DIR/backups"
if [[ ! -f "$CONFIG_DIR/mediamtx.yml" ]]; then
  echo "!! Missing $CONFIG_DIR/mediamtx.yml — copy from repo or run docker compose up (mediamtx entrypoint seeds the volume)"
else
  echo "MediaMTX config present at $CONFIG_DIR/mediamtx.yml"
fi

cat <<'EOF'

Next steps:
  1. Set PAYLOAD_SECRET, POSTGRES_PASSWORD, PLAYBACK_TOKEN_SECRET (and REDIS_PASSWORD for prod)
  2. docker compose up --build -d
  3. Create admin at http://localhost:3000/admin
  4. Set DASHBOARD_PUBLIC_URL / HLS_BASE_URL / WEBRTC_BASE_URL after TLS
  5. Lock down CORS at /cors and apply config at /settings
  6. node scripts/smoke-test.mjs

Production:
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

EOF
