# MTXfoil

Self-hosted control panel for [MediaMTX](https://github.com/bluenviron/mediamtx). Manage streams, protocols, CORS, recordings, and forwarding without hand-editing `mediamtx.yml`.

**Repository:** [github.com/silvansan/MTXfoil](https://github.com/silvansan/MTXfoil)

MTXfoil is a lightweight WMSPanel-style dashboard for churches, events, schools, and self-hosted streaming. It covers SRT, RTMP, RTSP, HLS, WebRTC, access control, and operator workflows — not SRT-only.

- **Operator UI** at `/` — live status, ingest/playback URLs, monitoring
- **Admin** at `/admin` — Payload CMS for streams, events, users, settings
- **Docker Compose** — MediaMTX, PostgreSQL, Redis, optional FFmpeg worker

## Quick start

```bash
cp .env.example .env
# Set PAYLOAD_SECRET (32+ chars)

docker compose up --build
```

- Dashboard: http://localhost:3000
- Admin: http://localhost:3000/admin

See `deploy/portainer/README.md` and `deploy/nginx-proxy-manager.md` for production behind a reverse proxy.

**Portainer deploy failed with `registry: denied`?** Use compose path `deploy/portainer/PORTAINER_STACK.yml` (builds on server). See the troubleshooting table in `deploy/portainer/README.md`.

## License

MIT — Copyright (c) 2026 [silvansan](https://github.com/silvansan). See [LICENSE](LICENSE).

MTXfoil aligns with its major dependencies ([MediaMTX](https://github.com/bluenviron/mediamtx), [Payload CMS](https://github.com/payloadcms/payload), [Next.js](https://github.com/vercel/next.js) — all MIT). Third-party license summary: [LICENSES.md](LICENSES.md).
