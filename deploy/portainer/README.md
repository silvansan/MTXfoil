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

- `./mediamtx` → shared MediaMTX config + backups (dashboard writes, MediaMTX reads)
- `./recordings` → recording output
- `postgres-data` → database persistence

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

Media ports typically go direct to the host (not through NPM).
