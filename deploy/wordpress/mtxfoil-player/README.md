# MTXfoil Player (WordPress)

Minimal WordPress plugin that registers the `[mtxfoil_player]` shortcode used by the MTXfoil operator dashboard.

## Install

1. Copy this folder to `wp-content/plugins/mtxfoil-player/`, or zip it and upload via **Plugins → Add New → Upload Plugin**.
2. Activate **MTXfoil Player**.

Source path in the MTXfoil repo: `deploy/wordpress/mtxfoil-player/`.

## Shortcode

```
[mtxfoil_player url="https://your-dashboard/player/stream-slug" width="640" height="360"]
```

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `url` | yes | — | Player page URL from MTXfoil |
| `width` | no | `640` | iframe width in pixels |
| `height` | no | `360` | iframe height in pixels |
| `token` | no | — | Playback token for token-gated streams |

Token-gated example:

```
[mtxfoil_player url="https://your-dashboard/player/stream-slug" token="issued-token"]
```

Output matches the dashboard embed snippet (iframe with `allowfullscreen` and `allow="autoplay; encrypted-media"`).
