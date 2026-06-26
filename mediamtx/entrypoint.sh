#!/bin/sh
set -e
CONFIG="/mediamtx-config/mediamtx.yml"
BASELINE="/baseline/mediamtx.yml"
if [ ! -f "$CONFIG" ]; then
  echo "[mediamtx] Seeding $CONFIG from baseline"
  mkdir -p "$(dirname "$CONFIG")"
  cp "$BASELINE" "$CONFIG"
fi
exec /mediamtx "$CONFIG"
