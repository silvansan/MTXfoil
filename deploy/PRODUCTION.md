# MTXfoil Production Checklist

Use this checklist when deploying MTXfoil beyond local development.

## 1. Secrets and environment

Copy `.env.example` to `.env` and set strong values:

| Variable | Requirement |
|----------|-------------|
| `PAYLOAD_SECRET` | 32+ random characters; app refuses dev placeholders when `NODE_ENV=production` |
| `PLAYBACK_TOKEN_SECRET` | 32+ characters, separate from `PAYLOAD_SECRET` |
| `POSTGRES_PASSWORD` | Strong password; match `DATABASE_URL` |
| `REDIS_PASSWORD` | Required with `docker-compose.prod.yml` |
| `MEDIAMTX_INTERNAL_USER` / `MEDIAMTX_INTERNAL_PASS` | Rotate from defaults; written to `mediamtx.yml` on config apply |

Deploy with both compose files:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## 2. TLS and reverse proxy

- Put [Nginx Proxy Manager](nginx-proxy-manager.md) (or similar) in front of the dashboard on port 3000.
- Enable HTTPS and WebSocket support for the operator UI and Payload admin.
- Set `PUBLIC_STREAM_DOMAIN`, `HLS_BASE_URL`, and `WEBRTC_BASE_URL` to your public media hostname.

## 3. Firewall and media ports

Publish only what you need on the host:

| Port | Service |
|------|---------|
| 3000 | Dashboard (or proxy only) |
| 1935 / 1936 | RTMP / RTMPS |
| 8554 | RTSP |
| 8888 | HLS |
| 8889 | WebRTC HTTP |
| 8189/udp | WebRTC ICE |
| 8890/udp | SRT |

Do **not** expose MediaMTX control API (9997) or metrics (9998) to the public internet.

## 4. CORS lockdown

1. Set `DASHBOARD_PUBLIC_URL=https://your-dashboard-domain` after NPM TLS deploy.
2. Open `/cors` in the operator UI — review warnings and trusted proxies.
3. Replace wildcard (`*`) origins for API, HLS, WebRTC, playback, and metrics before go-live.
4. Add trusted proxy CIDRs (e.g. `172.16.0.0/12`) when behind NPM.
5. Apply presets from `/cors` or edit in Payload admin → Globals → CORS Origins.
6. Apply config from `/settings` — **wildcard CORS blocks apply in production**.

`DASHBOARD_PUBLIC_URL` is auto-merged into CORS on apply. Playback/WebRTC URLs use `HLS_BASE_URL` and `WEBRTC_BASE_URL` on the media hostname.

## 5. Auth and RBAC

- Create admin users at `/admin` with appropriate roles (`superadmin`, `admin`, `operator`, `viewer`).
- Viewers are limited to `/player/*`.
- Operator APIs require authentication:
  - Config apply/preview: admin+
  - Status, metrics, logs: operator+
  - Playback token issuance: operator+
- Token- and password-gated streams enforce access on `/player/[slug]`.
- Admin actions are recorded in `/audit` (config apply, stream CRUD, user role changes, CORS/protocol edits).

## 6. Healthchecks and dependencies

Production compose adds healthchecks for dashboard, Redis, and MediaMTX. Services wait on healthy dependencies where configured.

Verify manually:

```bash
curl -s http://localhost:3000/api/health/mediamtx
node scripts/smoke-test.mjs
```

## 7. Backups

- Schedule Postgres backups: see [BACKUPS.md](BACKUPS.md)
- Retain MediaMTX YAML backups from `MEDIAMTX_BACKUP_DIR`
- Plan separate backup for the recordings volume

## 8. Schema and upgrades

- Production sets `PAYLOAD_DB_PUSH=false`. Use Payload migrations for schema changes.
- Pin image tags via `MTXFOIL_VERSION` for dashboard/worker; third-party images pinned in `docker-compose.prod.yml`.
- After upgrading MediaMTX, regenerate OpenAPI types: `npm run generate:openapi` in `dashboard/`.

## 9. Post-deploy smoke test

1. `docker compose ps` — all services healthy
2. `node scripts/smoke-test.mjs` — dashboard health OK
3. Log in at `/admin`, create a test stream
4. Publish a test pattern (SRT/RTMP), confirm live status on `/`
5. Open `/player/<slug>` and verify HLS/WebRTC preview
6. Review `/cors` for wildcard warnings
7. Run config preview/apply from `/settings` as admin

## 10. Portainer troubleshooting (mtx.silvans.ch pattern)

Symptoms: dashboard **MediaMTX Disconnected** (`fetch failed`), worker `health check redis error: max retries`, worker `failed to list MediaMTX paths`.

| Check | Action |
|-------|--------|
| **MediaMTX container** | Portainer → `mtxfoil-mediamtx` logs. Crash-loop = bad `mediamtx.yml` on volume or port conflict. API is internal-only (`http://mediamtx:9997`) — never expose 9997 on the host. |
| **Config / creds drift** | Seeded `mediamtx.yml` uses `mtxfoil:mtxfoil`. Production `MEDIAMTX_INTERNAL_USER/PASS` must be written via **/settings → Apply config** after deploy or credential rotation. Auth mismatch shows `API auth failed (401)` not `fetch failed`. |
| **Redis password** | `REDIS_PASSWORD` in stack env must match redis `--requirepass`. Prefer `openssl rand -hex 16`. Set `REDIS_PASSWORD` on dashboard **and** worker (not only inside `REDIS_URL`). Redeploy stack after env changes. |
| **Stack network** | All services on network `mtxfoil`. `docker exec mtxfoil-dashboard wget -qO- http://mediamtx:9997/v3/paths/list` should respond (401 without auth is OK). |
| **GHCR image age** | Pull latest `mtxfoil-dashboard` / `mtxfoil-worker` after fixes; set `MTXFOIL_VERSION` if you pin tags. |

Quick recovery sequence:

1. Confirm `mtxfoil-redis` healthy (`redis-cli -a "$REDIS_PASSWORD" ping` → PONG).
2. Confirm `mtxfoil-mediamtx` running (not restarting).
3. Log in at `https://mtx.silvans.ch/admin` → **Settings** (`/settings`) → preview + **Apply config** (syncs creds + YAML).
4. Restart worker + dashboard containers after env/stack updates.

## Related docs

- [Portainer stack](portainer/README.md)
- [Nginx Proxy Manager](nginx-proxy-manager.md)
- [Backups](BACKUPS.md)
