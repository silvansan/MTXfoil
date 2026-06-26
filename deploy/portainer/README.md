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

Paste contents of **`stack.env.example`** and complete [Required before first prod deploy](#required-before-first-prod-deploy) (all secrets + domains).

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

## Required before first prod deploy

The dashboard runs `NODE_ENV=production` and **refuses to start** with default or weak credentials. Set these in Portainer **Environment variables → Advanced mode** before deploy (copy `stack.env.example`, then replace every `CHANGE_ME` / `REPLACE_` value).

Generate secrets locally:

```bash
openssl rand -hex 16   # POSTGRES_PASSWORD, REDIS_PASSWORD, MEDIAMTX_INTERNAL_PASS
openssl rand -hex 32   # PAYLOAD_SECRET, PLAYBACK_TOKEN_SECRET (64 hex chars)
```

| Variable | Required | Notes |
|----------|----------|-------|
| `PAYLOAD_SECRET` | Yes | 32+ random characters; not the dev fallback |
| `PLAYBACK_TOKEN_SECRET` | Yes | 32+ chars, **different** from `PAYLOAD_SECRET` |
| `POSTGRES_PASSWORD` | Yes | Strong password; not `mtxfoil` or other common defaults |
| `REDIS_PASSWORD` | Yes | Required — prod stack enables Redis auth |
| `MEDIAMTX_INTERNAL_USER` | Yes | **Unique username** — `mtxfoil`, `admin`, `mediamtx`, etc. are rejected |
| `MEDIAMTX_INTERNAL_PASS` | Yes | Strong password; must differ from `MEDIAMTX_INTERNAL_USER` |
| `PUBLIC_STREAM_DOMAIN` | Yes | Media hostname (e.g. `stream.example.com`) |
| `DASHBOARD_PUBLIC_URL` | Yes | `https://` dashboard URL after TLS |
| `HLS_BASE_URL` | Yes | `https://` HLS base (e.g. `https://stream.example.com/hls`) |
| `WEBRTC_BASE_URL` | Yes | `https://` WebRTC base (e.g. `https://stream.example.com/webrtc`) |

Example (generate your own values — do not copy these):

```env
MEDIAMTX_INTERNAL_USER=mtxctl_a1b2c3d4
MEDIAMTX_INTERNAL_PASS=<output of openssl rand -hex 16>
PAYLOAD_SECRET=<output of openssl rand -hex 32>
PLAYBACK_TOKEN_SECRET=<different output of openssl rand -hex 32>
POSTGRES_PASSWORD=<output of openssl rand -hex 16>
REDIS_PASSWORD=<output of openssl rand -hex 16>
```

After updating env vars: **Stacks** → your stack → **Update the stack** (or Pull and redeploy). Then open **Settings** → apply config so MediaMTX receives the new internal credentials.

### Symptom: HTTP 500 on load / `MEDIAMTX_INTERNAL_USER`

The dashboard calls `validateProductionEnv()` when Payload loads (`payload.config.ts`). In production, weak credentials throw immediately — Next.js surfaces this as **HTTP 500** with a digest (not a friendly page). Container logs show the real message, e.g.:

```text
MEDIAMTX_INTERNAL_USER must not use the default or a common weak value in production
```

**Most common cause:** Portainer env still has `MEDIAMTX_INTERNAL_USER=mtxfoil` from an older `stack.env.example`. The compose files no longer default this value, but an existing stack keeps whatever you pasted on first deploy.

**Fix in Portainer (no SSH):**

1. **Stacks** → select your `mtxfoil` stack → **Editor** (or **Environment variables**).
2. In **Advanced mode**, find and replace these lines (generate your own values — do not copy examples):

   ```env
   MEDIAMTX_INTERNAL_USER=mtxctl_a1b2c3d4
   MEDIAMTX_INTERNAL_PASS=<openssl rand -hex 16>
   ```

   Rules: username must **not** be `mtxfoil`, `admin`, `mediamtx`, `postgres`, etc.; password must differ from the username.

3. While here, confirm the other required secrets are set (not `CHANGE_ME`):

   ```env
   PAYLOAD_SECRET=<openssl rand -hex 32>
   PLAYBACK_TOKEN_SECRET=<different openssl rand -hex 32>
   POSTGRES_PASSWORD=<openssl rand -hex 16>
   REDIS_PASSWORD=<openssl rand -hex 16>
   DASHBOARD_PUBLIC_URL=https://mtx.silvans.ch
   HLS_BASE_URL=https://<stream-host>/hls
   WEBRTC_BASE_URL=https://<stream-host>/webrtc
   PUBLIC_STREAM_DOMAIN=<stream-host>
   ```

4. **Update the stack** (or **Pull and redeploy** if using Repository deploy).
5. **Containers** → `mtxfoil-dashboard` → **Logs** — confirm no credential errors on startup.
6. Open the dashboard → **Settings** → **Apply config** so MediaMTX receives the new internal credentials.

Validation is intentional and cannot be bypassed. Unset required vars now fail at **deploy** time (`${VAR:?…}` in current stack YAML) instead of a silent 500.

---

## Before first deploy

1. Complete [Required before first prod deploy](#required-before-first-prod-deploy) above.

2. **Default stack builds on server** — `PORTAINER_STACK.yml` builds `dashboard` and `worker` from the cloned repo (`pull_policy: build` avoids Docker Hub pull errors). No GHCR setup required.

3. **GHCR fast path (optional)** — `PORTAINER_STACK.ghcr.yml` pulls `ghcr.io/silvansan/mtxfoil-dashboard` and `mtxfoil-worker`. Images are built on push to `main` once `.github/workflows/publish-images.yml` is on `main` and the workflow has run. Make packages **public** (GitHub → Packages → Package settings) or add a GHCR registry in Portainer.

4. **Outbound HTTPS** — `mediamtx-config-init` downloads baseline `mediamtx.yml` from GitHub on first deploy. The host must reach `raw.githubusercontent.com`.

---

## Troubleshooting: MediaMTX Disconnected / dashboard unhealthy

The dashboard Docker **healthcheck** calls `GET /api/health/mediamtx` inside the container. That endpoint probes MediaMTX at `MEDIAMTX_API_URL` (default `http://mediamtx:9997`). It does **not** check Postgres or Redis.

| Symptom | Meaning |
|---------|---------|
| UI **Disconnected** + `fetch failed` / `ECONNREFUSED` | Dashboard container cannot open TCP to MediaMTX API (network, API disabled, or wrong URL). |
| UI **Disconnected** + `401` / `403` | MediaMTX is reachable but `MEDIAMTX_INTERNAL_USER/PASS` do not match `mediamtx.yml` — open **Settings → Apply config**. |
| Portainer **mtxfoil-dashboard unhealthy** | Same as above — healthcheck fails when MediaMTX probe fails. |
| **mtxfoil-mediamtx running** but dashboard still disconnected | Container is up but API may be off, on another network, or config on the volume is wrong. |

### Portainer checklist (no SSH)

1. **Containers** → confirm all `mtxfoil-*` services are on network **`mtxfoil`** (stack YAML sets `networks.mtxfoil.name: mtxfoil`). If dashboard and mediamtx are on different networks, redeploy the full stack — do not attach containers manually across stacks.

2. **Containers** → `mtxfoil-dashboard` → **Inspect** → **Env** → verify:
   - `MEDIAMTX_API_URL=http://mediamtx:9997` (not `localhost`, not `https`, not the host IP)
   - Do **not** add a Portainer env override like `MEDIAMTX_API_URL=https://…` unless you also change the compose file to use `${MEDIAMTX_API_URL:-http://mediamtx:9997}`.

3. **Containers** → `mtxfoil-mediamtx` → **Logs** — look for config parse errors or `listener opened on :9997` (API). If the process exits and restarts, fix the YAML on the volume.

4. **Containers** → `mtxfoil-mediamtx-config-init` → **Logs** — should show `Config OK` or a successful GitHub seed. Init needs outbound HTTPS to `raw.githubusercontent.com`. On redeploy it **strips legacy `*AllowOrigins` keys** from an existing volume (MediaMTX 1.11.x rejects them).

5. **Volumes** → `mtxfoil-mediamtx-config` — if `mediamtx.yml` has `api: false` or wrong `apiAddress`, either:
   - Open dashboard **Settings → Apply config** (regenerates YAML from Postgres + env), or
   - Remove the volume and redeploy to re-seed from GitHub (`MTXFOIL_CONFIG_REF`), then **Apply config** again for credentials.

6. After fixing env or config: **Stacks** → **Update the stack** → open **Settings → Apply config** so MediaMTX internal user/password match `MEDIAMTX_INTERNAL_USER/PASS`.

7. **Quick probe** (if you have host shell access):  
   `docker exec mtxfoil-dashboard node -e "fetch('http://mediamtx:9997/v3/paths/list',{headers:{Authorization:'Basic '+Buffer.from(process.env.MEDIAMTX_INTERNAL_USER+':'+process.env.MEDIAMTX_INTERNAL_PASS).toString('base64')}}).then(r=>console.log(r.status)).catch(e=>console.error(e))"`  
   Expect `200`. `ECONNREFUSED` = network/API off; `401` = apply config.

The operator UI and `/api/health/mediamtx` response now include the **redacted target URL** and underlying **cause** (e.g. `ECONNREFUSED`) to speed up debugging.

---

## Troubleshooting: `unknown field "apiAllowOrigins"` (MediaMTX crash loop)

MediaMTX **1.11.3** rejects plural `*AllowOrigins` YAML keys (added in MediaMTX 1.15+). Older MTXfoil builds wrote them to the shared volume; **redeploying alone does not fix it** because `mediamtx-config-init` used to skip when `mediamtx.yml` already existed.

| Fix | When to use |
|-----|-------------|
| **Pull and redeploy** with current stack + `MTXFOIL_CONFIG_REF=main` | Init auto-strips legacy keys on every deploy (current `PORTAINER_STACK*.yml`). |
| **Dashboard** → **Settings → Apply config** | After pulling a dashboard image with the CORS fix (`935e26f+`); then **restart** `mtxfoil-mediamtx`. |
| **Strip volume in place** (no volume delete) | Immediate fix on the host — see commands below. |
| **`MTXFOIL_CONFIG_FORCE_RESEED=true`** + redeploy | Replace entire YAML from GitHub (loses custom paths until you **Apply config**). |

**Host one-liner** (strip legacy keys, keep paths):

```sh
docker run --rm -v mtxfoil-mediamtx-config:/cfg alpine:3.20 sh -c \
  "sed -i '/AllowOrigins:/d;/^trustedProxies:/d' /cfg/mediamtx.yml && grep -E 'AllowOrigins|trustedProxies' /cfg/mediamtx.yml && exit 1 || echo OK"
docker restart mtxfoil-mediamtx
```

Pin dashboard to a build that includes the fix: `MTXFOIL_VERSION=latest` (or a release tag after `935e26f`). `MTXFOIL_CONFIG_REF=main` is sufficient for the baseline seed; it does **not** rewrite an existing volume unless init repair runs.

---

## Troubleshooting: port bind / unhealthy mediamtx

| Symptom | Cause | Fix (Portainer only) |
|---------|-------|----------------------|
| `Bind for 0.0.0.0:1935 failed: port already allocated` | Host port still bound by a previous stack, another service, or `RTMP_PORT` not set in env | **Stacks** → remove the failed stack (or stop/delete `mtxfoil-*` containers). Set `RTMP_PORT` / `RTMPS_PORT` (and any other `*_PORT` vars) in **Environment variables**, then redeploy. |
| `dependency failed to start: container mtxfoil-mediamtx is unhealthy` | Older stack YAML used `wget` in a MediaMTX healthcheck; official `bluenviron/mediamtx` has no shell or `wget` | Pull/redeploy with current `PORTAINER_STACK*.yml` (no MediaMTX healthcheck; dashboard waits on `service_started` and probes API itself). |
| Dashboard stuck starting | MediaMTX not reachable on Docker network | Check **mediamtx** container logs. Confirm `mediamtx-config-init` completed (Alpine + `wget` seeds config once; existing volume skips re-download). |
| `mediamtx: error: unexpected argument /mediamtx-config/mediamtx.yml` | Stack `command` duplicated the binary (`["/mediamtx", "/mediamtx-config/..."]`) while the image ENTRYPOINT is already `/mediamtx` | Pull/redeploy with current `PORTAINER_STACK*.yml` where `command` is only `["/mediamtx-config/mediamtx.yml"]`. Pin `MEDIAMTX_IMAGE_TAG=1.11.3` in stack env. |

**Remap RTMP example** (host 1940/1941 when 1935/1936 are taken):

```env
RTMP_PORT=1940
RTMPS_PORT=1941
```

Publishers still use `rtmp://<host>:1940/...` — only the host side of the mapping changes.

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

Existing volumes are **not** fully re-seeded on redeploy; init **repairs** legacy `*AllowOrigins` / `trustedProxies` keys when present. Set `MTXFOIL_CONFIG_FORCE_RESEED=true` once to replace the file entirely from GitHub.

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
