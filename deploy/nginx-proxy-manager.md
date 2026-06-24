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
```

## What NOT to proxy

| Port | Reason |
|------|--------|
| 9997 | MediaMTX API — internal only |
| 9998 | Metrics — internal only |
| 1935/8890/etc. | Low-latency media — direct to host |

## Public stream domain

Set `PUBLIC_STREAM_DOMAIN` in `.env` to your **media** hostname (may differ from dashboard):

```env
PUBLIC_STREAM_DOMAIN=stream.example.com
HLS_BASE_URL=https://stream.example.com/hls
WEBRTC_BASE_URL=https://stream.example.com/webrtc
```

If HLS/WebRTC are served from the same host as MediaMTX (ports 8888/8889), forward those ports on your firewall and use NPM stream hosts or direct port forwarding — not the dashboard proxy.

## WebRTC note

WebRTC requires **UDP 8189** (ICE) and **TCP 8889** reachable from clients. Document these in your firewall/Portainer port mappings.

## CORS after HTTPS

Update **CORS Origins** global in Payload admin to include your HTTPS dashboard origin:

```text
https://mtxfoil.example.com
```

Avoid `*` in production for API/metrics origins.
