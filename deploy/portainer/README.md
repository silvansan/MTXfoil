# Portainer — deploy MTXfoil

## Which file to paste?

| File | Use in Portainer Web editor? |
|------|------------------------------|
| **`PORTAINER_STACK.yml`** | **YES — paste this one** |

---

## Before first deploy

1. Clone or upload this repository to your server (or build images locally).
2. Copy `.env.example` → `.env` and set:
   - `PAYLOAD_SECRET` (32+ random characters)
   - `POSTGRES_PASSWORD`
   - `PUBLIC_STREAM_DOMAIN`
   - `PLAYBACK_TOKEN_SECRET`

---

## Steps

1. **Stacks** → **Add stack** → **Web editor**
2. Paste **`PORTAINER_STACK.yml`**
3. **Environment variables** → **Advanced mode** → paste from **`.env.example`** (replace every placeholder)
4. **Deploy**
5. Open `http://<server-ip>:3000`
6. Create admin user at `/admin`

---

## Volumes

The stack mounts:

- `mtxfoil-mediamtx-config` → shared MediaMTX config + backups (dashboard writes, MediaMTX reads). **Seeded automatically** on first start from the image baseline (`mediamtx/entrypoint.sh`).
- `mtxfoil-recordings` → recording output
- `mtxfoil-postgres-data` → database persistence

Build context must include the repo root so `./mediamtx` and `./dashboard` Dockerfiles resolve.

---

## Media ports

Forward these on your firewall for ingest/playback:

| Port | Protocol | Service |
|------|----------|---------|
| 1935 | TCP | RTMP |
| 1936 | TCP | RTMPS |
| 8554 | TCP | RTSP |
| 8888 | TCP | HLS |
| 8889 | TCP | WebRTC HTTP |
| 8189 | UDP | WebRTC ICE |
| 8890 | UDP | SRT |

Do **not** expose `9997` (API) or `9998` (metrics) publicly.

---

## HTTPS

Put Nginx Proxy Manager in front of port **3000** only. See `../nginx-proxy-manager.md`.

Set `DASHBOARD_PUBLIC_URL`, `HLS_BASE_URL`, and `WEBRTC_BASE_URL` to `https://` URLs after TLS deploy.

## Image pinning

After building images locally or in CI, tag and push with a version:

```bash
export MTXFOIL_VERSION=2026.06.26
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker tag mtxfoil-dashboard:latest mtxfoil-dashboard:$MTXFOIL_VERSION
docker tag mtxfoil-worker:latest mtxfoil-worker:$MTXFOIL_VERSION
```

Set `MTXFOIL_VERSION` in Portainer stack env to match. Default is `latest` for first deploy.
