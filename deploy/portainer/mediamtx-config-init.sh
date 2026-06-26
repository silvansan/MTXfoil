#!/bin/sh
# One-shot seed/repair for mtxfoil-mediamtx-config volume (Portainer stacks).
# MediaMTX 1.11.x rejects plural *AllowOrigins and global trustedProxies keys.

set -e

CFG="${MEDIAMTX_CONFIG_DIR:-/mediamtx-config}/mediamtx.yml"
REF="${MTXFOIL_CONFIG_REF:-main}"
REPO="${MTXFOIL_REPO:-silvansan/MTXfoil}"
BASE_URL="https://raw.githubusercontent.com/${REPO}/${REF}/mediamtx/mediamtx.yml"

mkdir -p "$(dirname "$CFG")"

seed_from_github() {
  echo "[mediamtx-init] Seeding mediamtx.yml from GitHub (${REPO}@${REF})"
  wget -q -O "$CFG" "$BASE_URL"
}

has_legacy_cors_keys() {
  [ -f "$CFG" ] && grep -qE 'AllowOrigins:|^trustedProxies:' "$CFG"
}

strip_legacy_cors_keys() {
  echo "[mediamtx-init] Stripping legacy *AllowOrigins / trustedProxies keys (MediaMTX 1.11.x incompatible)"
  awk '
    /^[a-zA-Z].*AllowOrigins:/ {
      if ($0 ~ /AllowOrigins: \[\]/) next
      if ($0 ~ /AllowOrigins: \[.*\]/) next
      block = 1
      next
    }
    /^trustedProxies:/ {
      if ($0 ~ /trustedProxies: \[\]/) next
      if ($0 ~ /trustedProxies: \[.*\]/) next
      block = 1
      next
    }
    block && /^  - / { next }
    block && /^[^ #]/ { block = 0 }
    { print }
  ' "$CFG" > "${CFG}.tmp"
  mv "${CFG}.tmp" "$CFG"
}

validate_config() {
  if [ ! -f "$CFG" ]; then
    echo "[mediamtx-init] ERROR: ${CFG} missing after init"
    exit 1
  fi
  if grep -qE 'AllowOrigins:|^trustedProxies:' "$CFG"; then
    echo "[mediamtx-init] ERROR: legacy CORS keys still present in ${CFG}"
    echo "[mediamtx-init] Delete volume mtxfoil-mediamtx-config or set MTXFOIL_CONFIG_FORCE_RESEED=true and redeploy"
    exit 1
  fi
  echo "[mediamtx-init] Config OK (no legacy *AllowOrigins keys)"
}

if [ "${MTXFOIL_CONFIG_FORCE_RESEED:-}" = "true" ]; then
  echo "[mediamtx-init] MTXFOIL_CONFIG_FORCE_RESEED=true — replacing config from GitHub"
  seed_from_github
  validate_config
  exit 0
fi

if [ ! -f "$CFG" ]; then
  seed_from_github
  validate_config
  exit 0
fi

if has_legacy_cors_keys; then
  strip_legacy_cors_keys
fi

echo "[mediamtx-init] Config already present, skipping seed"
validate_config
