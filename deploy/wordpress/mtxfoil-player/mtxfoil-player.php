<?php
/**
 * Plugin Name: MTXfoil Player
 * Plugin URI: https://github.com/silvansan/MTXfoil
 * Description: Embed MTXfoil stream players via the [mtxfoil_player] shortcode.
 * Version: 1.0.0
 * Author: MTXfoil
 * License: MIT
 * Text Domain: mtxfoil-player
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Render an iframe embed matching MTXfoil dashboard buildEmbedSnippet().
 *
 * @param array<string, string> $atts Shortcode attributes.
 */
function mtxfoil_player_shortcode(array $atts): string
{
    $atts = shortcode_atts(
        [
            'url' => '',
            'width' => '640',
            'height' => '360',
            'token' => '',
        ],
        $atts,
        'mtxfoil_player'
    );

    $url = trim($atts['url']);
    if ($url === '') {
        return '<!-- mtxfoil_player: url attribute is required -->';
    }

    $token = trim($atts['token']);
    if ($token !== '') {
        $separator = (strpos($url, '?') !== false) ? '&' : '?';
        $url .= $separator . 'token=' . rawurlencode($token);
    }

    $width = max(1, (int) $atts['width']);
    $height = max(1, (int) $atts['height']);
    $src = esc_url($url);

    return sprintf(
        '<iframe src="%s" width="%d" height="%d" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>',
        $src,
        $width,
        $height
    );
}

add_shortcode('mtxfoil_player', 'mtxfoil_player_shortcode');
