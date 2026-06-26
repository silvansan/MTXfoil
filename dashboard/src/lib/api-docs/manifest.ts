/**
 * Central manifest for dashboard-owned API routes.
 * Used by OpenAPI generation and smoke-test discovery.
 */

export type ApiAuthLevel =
  | 'none'
  | 'operator'
  | 'admin'
  | 'mediamtx-callback'

export type ApiRouteManifestEntry = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  summary: string
  description?: string
  tag: string
  auth: ApiAuthLevel
  requestBody?: { description: string; schemaRef?: string; example?: unknown }
  queryParams?: Array<{ name: string; required?: boolean; description: string; schema: { type: string } }>
  responses: Record<string, { description: string; schemaRef?: string }>
}

export const API_DOCS_VERSION = '1.0.0'

export const apiRouteManifest: ApiRouteManifestEntry[] = [
  {
    method: 'GET',
    path: '/api/health/mediamtx',
    tag: 'Health',
    summary: 'MediaMTX connectivity probe',
    description: 'Public liveness check against the MediaMTX control API. Returns 503 when MediaMTX is unreachable.',
    auth: 'none',
    responses: {
      '200': { description: 'MediaMTX reachable', schemaRef: '#/components/schemas/HealthResponse' },
      '503': { description: 'MediaMTX unreachable', schemaRef: '#/components/schemas/HealthResponse' },
    },
  },
  {
    method: 'GET',
    path: '/api/status',
    tag: 'Monitoring',
    summary: 'Dashboard status snapshot',
    description: 'Live stream statuses, MediaMTX health, and Prometheus metrics. Requires operator+ session.',
    auth: 'operator',
    responses: {
      '200': { description: 'Status payload', schemaRef: '#/components/schemas/StatusResponse' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role (viewer)' },
    },
  },
  {
    method: 'GET',
    path: '/api/config/preview',
    tag: 'Config',
    summary: 'Preview MediaMTX config diff',
    description: 'Compare desired config (Postgres) with current mediamtx.yml without applying. Admin+ only.',
    auth: 'admin',
    responses: {
      '200': { description: 'Diff preview', schemaRef: '#/components/schemas/SyncResult' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
    },
  },
  {
    method: 'POST',
    path: '/api/config/apply',
    tag: 'Config',
    summary: 'Apply full MediaMTX config',
    description: 'Validate, backup, write YAML, and hot-patch MediaMTX API. Admin+ only.',
    auth: 'admin',
    responses: {
      '200': { description: 'Config applied', schemaRef: '#/components/schemas/SyncResult' },
      '400': { description: 'Validation failed', schemaRef: '#/components/schemas/SyncResult' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
      '500': { description: 'Apply error', schemaRef: '#/components/schemas/SyncResult' },
    },
  },
  {
    method: 'GET',
    path: '/api/logs/mediamtx',
    tag: 'Monitoring',
    summary: 'Tail MediaMTX logs',
    description: 'Returns recent log lines when MEDIAMTX_LOG_PATH is set, otherwise setup instructions. Operator+ only.',
    auth: 'operator',
    responses: {
      '200': { description: 'Log tail', schemaRef: '#/components/schemas/MediaMtxLogsResult' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
    },
  },
  {
    method: 'GET',
    path: '/api/playback/token',
    tag: 'Playback',
    summary: 'Issue playback token (query)',
    description: 'Issue an HMAC playback token for a token-auth stream. Operator+ only.',
    auth: 'operator',
    queryParams: [{ name: 'slug', required: true, description: 'Stream slug', schema: { type: 'string' } }],
    responses: {
      '200': { description: 'Token issued', schemaRef: '#/components/schemas/PlaybackTokenResponse' },
      '400': { description: 'Invalid request or stream auth mode' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role or playback disabled' },
      '404': { description: 'Stream not found' },
    },
  },
  {
    method: 'POST',
    path: '/api/playback/token',
    tag: 'Playback',
    summary: 'Issue playback token (body)',
    description: 'Same as GET; accepts `{ "slug": "..." }` in the JSON body. Operator+ only.',
    auth: 'operator',
    requestBody: {
      description: 'Stream slug',
      schemaRef: '#/components/schemas/PlaybackTokenRequest',
      example: { slug: 'main-stage' },
    },
    responses: {
      '200': { description: 'Token issued', schemaRef: '#/components/schemas/PlaybackTokenResponse' },
      '400': { description: 'slug required or invalid auth mode' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role or playback disabled' },
      '404': { description: 'Stream not found' },
    },
  },
  {
    method: 'POST',
    path: '/api/mediamtx/auth',
    tag: 'MediaMTX Auth',
    summary: 'MediaMTX HTTP auth callback',
    description:
      'Built-in external HTTP auth backend. MediaMTX POSTs publish/read/playback decisions here when authMethod is http. Any 2xx allows; other statuses deny. Rate-limited.',
    auth: 'mediamtx-callback',
    requestBody: {
      description: 'MediaMTX authorization request',
      schemaRef: '#/components/schemas/MediaMtxAuthRequest',
      example: { action: 'read', path: 'main-stage', user: '', password: '' },
    },
    responses: {
      '200': { description: 'Allow' },
      '401': { description: 'Deny' },
      '429': { description: 'Rate limited' },
    },
  },
  {
    method: 'POST',
    path: '/api/streams/create',
    tag: 'Streams',
    summary: 'Create stream',
    description: 'Operator proxy for Payload Streams create. Operator+ only.',
    auth: 'operator',
    requestBody: {
      description: 'Stream fields',
      schemaRef: '#/components/schemas/StreamCreateRequest',
      example: { name: 'Main Stage', slug: 'main-stage', sourceType: 'publisher' },
    },
    responses: {
      '201': { description: 'Stream created' },
      '400': { description: 'Validation error' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
    },
  },
  {
    method: 'PATCH',
    path: '/api/streams/{id}',
    tag: 'Streams',
    summary: 'Update stream',
    auth: 'operator',
    requestBody: { description: 'Partial stream fields', schemaRef: '#/components/schemas/StreamUpdateRequest' },
    responses: {
      '200': { description: 'Stream updated' },
      '400': { description: 'Validation error' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
      '404': { description: 'Stream not found' },
    },
  },
  {
    method: 'DELETE',
    path: '/api/streams/{id}',
    tag: 'Streams',
    summary: 'Delete stream',
    auth: 'admin',
    responses: {
      '200': { description: 'Stream deleted' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
      '404': { description: 'Stream not found' },
    },
  },
  {
    method: 'POST',
    path: '/api/events',
    tag: 'Events',
    summary: 'Create event',
    auth: 'operator',
    requestBody: {
      description: 'Event fields',
      example: { title: 'Sunday Service', slug: 'sunday-service', status: 'draft' },
    },
    responses: {
      '201': { description: 'Event created' },
      '400': { description: 'Validation error' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
    },
  },
  {
    method: 'PATCH',
    path: '/api/events/{id}',
    tag: 'Events',
    summary: 'Update event',
    auth: 'operator',
    responses: {
      '200': { description: 'Event updated' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
      '404': { description: 'Event not found' },
    },
  },
  {
    method: 'DELETE',
    path: '/api/events/{id}',
    tag: 'Events',
    summary: 'Delete event',
    auth: 'admin',
    responses: {
      '200': { description: 'Event deleted' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
      '404': { description: 'Event not found' },
    },
  },
  {
    method: 'POST',
    path: '/api/forwarding',
    tag: 'Forwarding',
    summary: 'Create forwarding job',
    auth: 'admin',
    requestBody: {
      description: 'Forwarding job fields',
      example: { name: 'YouTube', stream: '1', destinationUrl: 'rtmp://a.rtmp.youtube.com/live2/key', type: 'rtmp-push' },
    },
    responses: {
      '201': { description: 'Job created' },
      '400': { description: 'Validation error' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
    },
  },
  {
    method: 'PATCH',
    path: '/api/forwarding/{id}',
    tag: 'Forwarding',
    summary: 'Update forwarding job',
    auth: 'admin',
    responses: {
      '200': { description: 'Job updated' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
      '404': { description: 'Job not found' },
    },
  },
  {
    method: 'DELETE',
    path: '/api/forwarding/{id}',
    tag: 'Forwarding',
    summary: 'Delete forwarding job',
    auth: 'admin',
    responses: {
      '200': { description: 'Job deleted' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
      '404': { description: 'Job not found' },
    },
  },
  {
    method: 'PATCH',
    path: '/api/cors',
    tag: 'CORS',
    summary: 'Update CORS origins global',
    auth: 'operator',
    requestBody: {
      description: 'Origin arrays per MediaMTX service',
      example: { hlsAllowOrigins: ['https://example.com'] },
    },
    responses: {
      '200': { description: 'CORS updated' },
      '400': { description: 'Invalid JSON' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
    },
  },
  {
    method: 'POST',
    path: '/api/cors/presets',
    tag: 'CORS',
    summary: 'Create CORS preset',
    auth: 'operator',
    responses: {
      '201': { description: 'Preset created' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
    },
  },
  {
    method: 'PATCH',
    path: '/api/cors/presets/{id}',
    tag: 'CORS',
    summary: 'Update CORS preset',
    auth: 'operator',
    responses: {
      '200': { description: 'Preset updated' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
      '404': { description: 'Preset not found' },
    },
  },
  {
    method: 'DELETE',
    path: '/api/cors/presets/{id}',
    tag: 'CORS',
    summary: 'Delete CORS preset',
    auth: 'admin',
    responses: {
      '200': { description: 'Preset deleted' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
      '404': { description: 'Preset not found' },
    },
  },
  {
    method: 'POST',
    path: '/api/cors/apply-preset',
    tag: 'CORS',
    summary: 'Apply CORS preset to global',
    auth: 'admin',
    requestBody: { description: 'Preset id', example: { presetId: '1' } },
    responses: {
      '200': { description: 'Preset applied' },
      '400': { description: 'Invalid request' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
    },
  },
  {
    method: 'PATCH',
    path: '/api/protocols',
    tag: 'Protocols',
    summary: 'Update protocol settings global',
    auth: 'admin',
    responses: {
      '200': { description: 'Settings updated' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
    },
  },
  {
    method: 'POST',
    path: '/api/recordings/delete',
    tag: 'Recordings',
    summary: 'Delete recording segment',
    auth: 'admin',
    requestBody: {
      description: 'Recording path and segment start timestamp',
      example: { path: 'main-stage', start: '2026-01-01T12:00:00Z' },
    },
    responses: {
      '200': { description: 'Segment deleted' },
      '400': { description: 'path and start required' },
      '401': { description: 'Not authenticated' },
      '403': { description: 'Insufficient role' },
      '500': { description: 'Delete failed' },
    },
  },
]
