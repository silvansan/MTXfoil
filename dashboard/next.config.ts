import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

import {
  BASE_SECURITY_HEADERS,
  WHIP_SECURITY_HEADERS,
  buildAdminCsp,
  buildApiDocsCsp,
  buildDashboardCsp,
  buildPlayerCsp,
  collectMediaOrigins,
} from './src/lib/security-headers'

const mediaOrigins = collectMediaOrigins()

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/player/:path*',
        headers: [
          ...BASE_SECURITY_HEADERS,
          {
            key: 'Content-Security-Policy',
            value: buildPlayerCsp(mediaOrigins),
          },
        ],
      },
      {
        source: '/api/docs/openapi.json',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: buildAdminCsp() },
        ],
      },
      {
        source: '/((?!player/|admin/).*)',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Content-Security-Policy',
            value: buildDashboardCsp(mediaOrigins),
          },
        ],
      },
      {
        source: '/streams/:slug/whip',
        headers: [
          ...WHIP_SECURITY_HEADERS,
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Content-Security-Policy',
            value: buildDashboardCsp(mediaOrigins),
          },
        ],
      },
      {
        source: '/api/docs',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: buildApiDocsCsp() },
        ],
      },
    ]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
