# Nginx Proxy Manager — MTXfoil

Use NPM to terminate HTTPS for the **dashboard only**. Media ingest/playback ports connect directly to the host.

## Proxy host setup

1. **Hosts** → **Proxy Hosts** → **Add Proxy Host**
2. **Domain names:** `mtxfoil.example.com` (your dashboard domain)
3. **Scheme:** `http`
4. **Forward hostname / IP:** Docker host IP (or `mtxfoil-dashboard` if NPM is on same network)
5. **Forward port:** `3000`
6. **SSL:** Request a new certificate (Let's Encrypt)
7. **Websockets support:** ON (required for Payload admin)

### Advanced config (optional)

```nginx
# Increase body size for admin uploads
client_max_body_size 50m;

# Pass client IP to dashboard (for audit logs)
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
```

## Environment after HTTPS

Set these in `.env` or Portainer stack variables:

```env
# Dashboard (embeds, share links, CORS auto-merge)
DASHBOARD_PUBLIC_URL=https://mtxfoil.example.com

# Media hostname (may differ from dashboard)
PUBLIC_STREAM_DOMAIN=stream.example.com
HLS_BASE_URL=https://stream.example.com/hls
WEBRTC_BASE_URL=https://stream.example.com/webrtc
```

`DASHBOARD_PUBLIC_URL` is used for player embed URLs and WordPress shortcodes.  
`PUBLIC_STREAM_DOMAIN` is used for SRT/RTMP/HLS/WebRTC ingest and playback URLs shown to encoders.

## Split-domain example

| Host | Purpose |
|------|---------|
| `mtxfoil.example.com` | Operator UI + Payload admin (via NPM → :3000) |
| `stream.example.com` | Media ingest/playback (direct to host ports) |

Player embed snippet:

```html
<iframe src="https://mtxfoil.example.com/player/my-stream"></iframe>
```

HLS playback URL:

```text
https://stream.example.com/hls/my-stream/index.m3u8
```

## What NOT to proxy

| Port | Reason |
|------|--------|
| 9997 | MediaMTX API — internal only |
| 9998 | Metrics — internal only |
| 1935/8890/etc. | Low-latency media — direct to host |

## Public stream domain

If HLS/WebRTC are served from the same host as MediaMTX (ports 8888/8889), forward those ports on your firewall. Use NPM stream hosts or direct port forwarding — not the dashboard proxy.

## WebRTC note

WebRTC requires **UDP 8189** (ICE) and **TCP 8889** reachable from clients. Document these in your firewall/Portainer port mappings.

If the dashboard and media hostnames differ, set `WEBRTC_BASE_URL` to the media hostname clients reach for WHEP.

## CORS after HTTPS

1. Set `DASHBOARD_PUBLIC_URL` — its origin is auto-merged into CORS on config apply.
2. In **CORS Origins** (Admin globals or `/cors`), add your dashboard HTTPS origin if not auto-merged:

```text
https://mtxfoil.example.com
```

3. Add **trusted proxies** when behind NPM (Docker bridge range is typical):

```text
172.16.0.0/12
10.0.0.0/8
```

4. Avoid `*` in production — wildcard CORS blocks config apply when `NODE_ENV=production`.

## RTMPS

Port 1936 is published but RTMPS requires TLS certificates mounted into MediaMTX. Until certs are configured, use RTMP (1935) or SRT for ingest.
