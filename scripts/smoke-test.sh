#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://localhost:3000}"
HEALTH_URL="$BASE_URL/api/health/mediamtx"

echo "Smoke test: GET $HEALTH_URL"
status="$(curl -s -o /tmp/mtxfoil-smoke.json -w "%{http_code}" "$HEALTH_URL")"

if [ "$status" != "200" ]; then
  echo "FAIL: expected HTTP 200, got $status"
  cat /tmp/mtxfoil-smoke.json || true
  exit 1
fi

if ! grep -q '"ok"' /tmp/mtxfoil-smoke.json; then
  echo "FAIL: health response missing ok field"
  cat /tmp/mtxfoil-smoke.json
  exit 1
fi

echo "PASS: dashboard health endpoint responded with HTTP 200"
