# Portainer — deploy MTXfoil

No SSH required. Everything below is done in the Portainer UI.

## Troubleshooting: `error from registry: denied`

Portainer runs `docker compose pull` before deploy. That fails in two common cases:

| Symptom | Cause | Fix (Portainer only) |
|---------|-------|----------------------|
| Pull `ghcr.io/silvansan/mtxfoil-*` **denied** | GHCR images not published yet, or packages are **private** | Use **`PORTAINER_STACK.yml`** (builds on server) — see below. For GHCR later: publish images (`.github/workflows/publish-images.yml`), set packages **public**, add GHCR registry in Portainer if private. |
| Pull `mtxfoil-dashboard` / `mtxfoil-worker` **denied** | Portainer tries Docker Hub for unqualified image names | Use current **`PORTAINER_STACK.yml`** (includes `pull_policy: build`) or **`docker-compose.yml` + `docker-compose.prod.yml`**. |

`bluenviron/mediamtx` rate limits show **`toomanyrequests`**, not `denied` — if you only see `denied`, it is almost always GHCR or Docker Hub auth for first-party images.

**Works today (no GHCR):** Repository → compose path **`deploy/portainer/PORTAINER_STACK.yml`** → paste **`stack.env.example`** env → Deploy. First deploy builds dashboard/worker (10–20 min; needs ~4 GB RAM).

---

## Choose a deploy method

| Method | Compose file(s) | Builds on server? | Auto-updates from Git? |
|--------|-----------------|-------------------|------------------------|
| **Repository (recommended)** | `deploy/portainer/PORTAINER_STACK.yml` | Yes — dashboard + worker | Yes — Pull and redeploy / webhook |
| **Repository (GHCR, fast deploy)** | `deploy/portainer/PORTAINER_STACK.ghcr.yml` | No — pulls GHCR images | Yes — after images are published |
| **Web editor** | Paste `PORTAINER_STACK.yml` | Yes | No — manual paste on changes |
| **Repository (full compose)** | `docker-compose.yml` + `docker-compose.prod.yml` | Yes — custom `mediamtx` image too | Yes |

For most operators with Portainer-only access, use **Repository** with **`PORTAINER_STACK.yml`** (build on server).

---

## Repository-only (no SSH)

Portainer clones the repo over **HTTPS** from GitHub. You do not need shell/SSH on the host.

### 1. Stacks → Add stack → Repository

| Field | Value |
|-------|-------|
| **Name** | `mtxfoil` (or your choice) |
| **Build method** | Repository |
| **Repository URL** | `https://github.com/silvansan/MTXfoil` (or your fork) |
| **Repository reference** | `main` (or a release tag, e.g. `v2026.06.26`) |
| **Compose path** | `deploy/portainer/PORTAINER_STACK.yml` |
| **Authentication** | Only if the repo is **private** — add a GitHub username + [PAT](https://github.com/settings/tokens) with `repo` read scope |

Do **not** use `docker-compose.yml` here unless you intend to build images on the server (see [Alternative: build from source](#alternative-repository-deploy-custom-builds)).

### 2. Environment variables → Advanced mode

Paste contents of **`stack.env.example`** and replace every `CHANGE_ME` value:

- `PAYLOAD_SECRET` — 32+ random characters
- `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `PLAYBACK_TOKEN_SECRET`, `MEDIAMTX_INTERNAL_PASS`
- `PUBLIC_STREAM_DOMAIN`, `DASHBOARD_PUBLIC_URL`, `HLS_BASE_URL`, `WEBRTC_BASE_URL`

Optional pinning (recommended for production):

```env
MTXFOIL_VERSION=v2026.06.26
MTXFOIL_CONFIG_REF=v2026.06.26
```

### 3. Registry (GHCR stack only)

Skip this when using **`PORTAINER_STACK.yml`** (default build stack).

For **`PORTAINER_STACK.ghcr.yml`**: if packages are private, **Registries** → Add registry → GHCR (`ghcr.io`) with a read token (PAT with `read:packages`). Public packages from `ghcr.io/silvansan` need no registry entry.

### 4. Deploy → first-run checklist

1. Open `http://<server-ip>:3000`
2. Create admin at `/admin`
3. **Settings** → apply config (syncs MediaMTX credentials + CORS from your env)

### 5. Updates (still no SSH)

**Stacks** → your stack → **Pull and redeploy** (or enable **GitOps updates** / webhook) to pick up compose or env changes from GitHub.

---

## Web editor (paste YAML)

| File | Use in Portainer Web editor? |
|------|------------------------------|
| **`PORTAINER_STACK.yml`** | **YES — paste this one** |

Same image-only stack as the Repository method, but you paste the YAML manually instead of pointing at Git. Use when you cannot use Repository deploy or want a one-off test.

---

## Before first deploy

1. Copy `stack.env.example` values into Portainer **Environment variables → Advanced mode** and replace every `CHANGE_ME` placeholder:
   - `PAYLOAD_SECRET` (32+ random characters)
   - `POSTGRES_PASSWORD`
   - `REDIS_PASSWORD`
   - `PLAYBACK_TOKEN_SECRET`
   - `MEDIAMTX_INTERNAL_PASS`
   - `PUBLIC_STREAM_DOMAIN`, `DASHBOARD_PUBLIC_URL`, `HLS_BASE_URL`, `WEBRTC_BASE_URL`

2. **Default stack builds on server** — `PORTAINER_STACK.yml` builds `dashboard` and `worker` from the cloned repo (`pull_policy: build` avoids Docker Hub pull errors). No GHCR setup required.

3. **GHCR fast path (optional)** — `PORTAINER_STACK.ghcr.yml` pulls `ghcr.io/silvansan/mtxfoil-dashboard` and `mtxfoil-worker`. Images are built on push to `main` once `.github/workflows/publish-images.yml` is on `main` and the workflow has run. Make packages **public** (GitHub → Packages → Package settings) or add a GHCR registry in Portainer.

4. **Outbound HTTPS** — `mediamtx-config-init` downloads baseline `mediamtx.yml` from GitHub on first deploy. The host must reach `raw.githubusercontent.com`.

---

## Steps

1. **Stacks** → **Add stack** → **Web editor**
2. Paste **`PORTAINER_STACK.yml`**
3. **Environment variables** → **Advanced mode** → paste from **`stack.env.example`** (replace placeholders)
4. **Deploy**
5. Open `http://<server-ip>:3000`
6. Create admin user at `/admin`
7. Open **Settings** → apply config so MediaMTX credentials and CORS match your env

---

## Volumes

The stack mounts:

- `mtxfoil-mediamtx-config` → shared MediaMTX config + backups (dashboard writes, MediaMTX reads). **Seeded on first start** by `mediamtx-config-init` from the GitHub baseline (`mediamtx/mediamtx.yml` on `main`, or set `MTXFOIL_CONFIG_REF` to a release tag).
- `mtxfoil-recordings` → recording output
- `mtxfoil-postgres-data` → database persistence

Existing volumes are **not** re-seeded; only an empty config volume triggers the init download.

---

## Alternative: Repository deploy (custom builds)

Use only when you need to build images on the server (custom code, fork without GHCR, or air-gapped registry):

1. **Stacks** → **Add stack** → **Repository**
2. Repository URL: `https://github.com/silvansan/MTXfoil` (or your fork)
3. Repository reference: branch or tag
4. Compose path: `docker-compose.yml`
5. **Additional paths** (or comma-separated compose paths, depending on Portainer version): `docker-compose.prod.yml`
6. **Environment variables** → **Advanced mode** — same as `stack.env.example`; **`REDIS_PASSWORD` is required** (prod override enables Redis auth)
7. Deploy — first run builds `./mediamtx`, `./dashboard`, and `./worker` (slow; needs disk/RAM)

**Gotchas for custom builds:**

- `PAYLOAD_DB_PUSH` is already `"false"` — schema comes from committed migrations, not auto-push.
- `docker-compose.prod.yml` overrides `REDIS_URL` to include `REDIS_PASSWORD`; dashboard/worker will fail healthchecks if `REDIS_PASSWORD` is unset.
- Bind mounts (`./mediamtx`, `./recordings`) resolve relative to the cloned repo checkout on the Portainer host — no manual seed step.
- Custom `mediamtx` image builds from `bluenviron/mediamtx:latest` (see root `docker-compose.yml` note on plural CORS fields).

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

| Variable | Default | Purpose |
|----------|---------|---------|
| `MTXFOIL_VERSION` | `latest` | Dashboard + worker image tag |
| `MTXFOIL_IMAGE_REGISTRY` | `ghcr.io/silvansan` | GHCR stack only (`PORTAINER_STACK.ghcr.yml`) |
| `MEDIAMTX_IMAGE_TAG` | `latest` | Official `bluenviron/mediamtx` tag |
| `MTXFOIL_CONFIG_REF` | `main` | Git ref for baseline `mediamtx.yml` seed (branch or tag) |

Pin `MTXFOIL_VERSION` to a release tag (e.g. `v2026.06.26`) and set `MTXFOIL_CONFIG_REF` to the same tag for a matched config baseline.

**GHCR stack** (`PORTAINER_STACK.ghcr.yml`): after images exist, pin `MTXFOIL_VERSION` to a release tag or commit SHA from the Publish images workflow.

To build and push images yourself:

```bash
export MTXFOIL_VERSION=2026.06.26
docker compose -f docker-compose.yml -f docker-compose.prod.yml build dashboard worker
docker tag mtxfoil-dashboard:latest ghcr.io/silvansan/mtxfoil-dashboard:$MTXFOIL_VERSION
docker tag mtxfoil-worker:latest ghcr.io/silvansan/mtxfoil-worker:$MTXFOIL_VERSION
docker push ghcr.io/silvansan/mtxfoil-dashboard:$MTXFOIL_VERSION
docker push ghcr.io/silvansan/mtxfoil-worker:$MTXFOIL_VERSION
```

Set `MTXFOIL_VERSION` in Portainer stack env to match.
