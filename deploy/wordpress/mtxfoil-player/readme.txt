=== MTXfoil Player ===
Contributors: mtxfoil
Tags: streaming, video, iframe, shortcode, mediamtx
Requires at least: 5.8
Tested up to: 6.7
Stable tag: 1.0.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Embed MTXfoil stream players on WordPress posts and pages.

== Description ==

Adds the `[mtxfoil_player]` shortcode to embed the same iframe used by the MTXfoil operator dashboard player page.

== Installation ==

1. Download or copy the `mtxfoil-player` folder from the MTXfoil repository (`deploy/wordpress/mtxfoil-player/`).
2. Upload the folder to `wp-content/plugins/`, or zip it and install via **Plugins → Add New → Upload Plugin**.
3. Activate **MTXfoil Player** under **Plugins**.

== Usage ==

Copy the shortcode from an MTXfoil stream's player page, or build one manually:

`[mtxfoil_player url="https://dashboard.example.org/player/my-stream" width="640" height="360"]`

For token-gated streams, add a `token` attribute (appends `?token=` or `&token=` to the URL):

`[mtxfoil_player url="https://dashboard.example.org/player/my-stream" token="YOUR_TOKEN"]`

== Changelog ==

= 1.0.0 =
* Initial release with `[mtxfoil_player]` shortcode.
