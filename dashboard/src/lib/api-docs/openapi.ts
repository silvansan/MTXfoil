import { API_DOCS_VERSION, apiRouteManifest, type ApiAuthLevel } from './manifest'

type OpenApiDocument = {
  openapi: string
  info: { title: string; version: string; description: string }
  servers: Array<{ url: string; description: string }>
  tags: Array<{ name: string; description: string }>
  paths: Record<string, Record<string, unknown>>
  components: {
    securitySchemes: Record<string, unknown>
    schemas: Record<string, unknown>
  }
}

const TAG_DESCRIPTIONS: Record<string, string> = {
  Health: 'Public connectivity probes',
  Monitoring: 'Live status and logs (operator+)',
  Config: 'MediaMTX YAML sync and apply (admin+)',
  Playback: 'Playback token issuance (operator+)',
  'MediaMTX Auth': 'External HTTP auth callback invoked by MediaMTX',
  Streams: 'Operator CRUD proxy for streams',
  Events: 'Operator CRUD proxy for events',
  Forwarding: 'FFmpeg forwarding jobs (admin+)',
  CORS: 'CORS origin management',
  Protocols: 'Protocol settings global',
  Recordings: 'Recording segment management',
}

function securityForAuth(auth: ApiAuthLevel): Array<Record<string, string[]>> | undefined {
  switch (auth) {
    case 'none':
    case 'mediamtx-callback':
      return undefined
    case 'operator':
      return [{ payloadSession: [] }]
    case 'admin':
      return [{ payloadSession: [] }]
    default:
      return undefined
  }
}

function roleNote(auth: ApiAuthLevel): string {
  switch (auth) {
    case 'operator':
      return 'Requires Payload session cookie with role: operator, admin, or superadmin.'
    case 'admin':
      return 'Requires Payload session cookie with role: admin or superadmin.'
    case 'mediamtx-callback':
      return 'Called by MediaMTX (not browser clients). No session cookie; authorize via stream auth rules.'
    default:
      return ''
  }
}

const schemas = {
  ErrorResponse: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Unauthorized' },
    },
    required: ['error'],
  },
  HealthResponse: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', example: true },
      latencyMs: { type: 'integer', example: 12 },
      error: { type: 'string', nullable: true },
      target: {
        type: 'string',
        nullable: true,
        description: 'Redacted MEDIAMTX_API_URL used for the probe',
        example: 'http://mediamtx:9997',
      },
      cause: {
        type: 'string',
        nullable: true,
        description: 'Underlying network error when fetch fails before HTTP',
        example: 'connect ECONNREFUSED 172.18.0.4:9997',
      },
    },
    required: ['ok', 'latencyMs'],
  },
  SyncResult: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      backupPath: { type: 'string', nullable: true },
      diffs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            before: {},
            after: {},
          },
        },
      },
      errors: { type: 'array', items: { type: 'string' } },
    },
    required: ['ok', 'diffs', 'errors'],
  },
  StatusResponse: {
    type: 'object',
    properties: {
      health: { $ref: '#/components/schemas/HealthResponse' },
      streams: { type: 'array', items: { type: 'object' } },
      metrics: { type: 'object', nullable: true },
    },
  },
  MediaMtxLogsResult: {
    type: 'object',
    properties: {
      source: { type: 'string', enum: ['file', 'instructions'] },
      lines: { type: 'array', items: { type: 'string' } },
      message: { type: 'string', nullable: true },
    },
    required: ['source', 'lines'],
  },
  PlaybackTokenRequest: {
    type: 'object',
    properties: {
      slug: { type: 'string', example: 'main-stage' },
    },
    required: ['slug'],
  },
  PlaybackTokenResponse: {
    type: 'object',
    properties: {
      slug: { type: 'string' },
      token: { type: 'string' },
      expiresAt: { type: 'string', format: 'date-time' },
      playerUrl: { type: 'string' },
    },
    required: ['slug', 'token', 'expiresAt', 'playerUrl'],
  },
  MediaMtxAuthRequest: {
    type: 'object',
    properties: {
      user: { type: 'string' },
      password: { type: 'string' },
      token: { type: 'string' },
      ip: { type: 'string' },
      action: {
        type: 'string',
        enum: ['publish', 'read', 'playback', 'api', 'metrics', 'pprof'],
      },
      path: { type: 'string' },
      protocol: { type: 'string' },
      id: { type: 'string' },
      query: { type: 'string' },
    },
  },
  StreamCreateRequest: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      slug: { type: 'string' },
      event: { type: 'string', description: 'Event ID' },
      sourceType: { type: 'string', enum: ['publisher', 'proxy', 'redirect', 'test'] },
      sourceUrl: { type: 'string' },
      ingestProtocol: { type: 'string' },
      enabledProtocols: { type: 'array', items: { type: 'string' } },
      recordingEnabled: { type: 'boolean' },
      playbackEnabled: { type: 'boolean' },
      authMode: {
        type: 'string',
        enum: ['public', 'unlisted', 'password', 'token', 'internal'],
      },
      publishPassword: { type: 'string' },
      readPassword: { type: 'string' },
      notes: { type: 'string' },
    },
    required: ['name', 'slug'],
  },
  StreamUpdateRequest: {
    type: 'object',
    additionalProperties: true,
    description: 'Partial stream fields (same shape as create)',
  },
}

export function buildOpenApiDocument(baseUrl = ''): OpenApiDocument {
  const tags = [...new Set(apiRouteManifest.map((r) => r.tag))].map((name) => ({
    name,
    description: TAG_DESCRIPTIONS[name] || name,
  }))

  const paths: Record<string, Record<string, unknown>> = {}

  for (const route of apiRouteManifest) {
    const pathItem = paths[route.path] || {}
    const parameters = route.path.includes('{id}')
      ? [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Resource ID',
          },
        ]
      : []

    if (route.queryParams) {
      for (const qp of route.queryParams) {
        parameters.push({
          name: qp.name,
          in: 'query',
          required: Boolean(qp.required),
          schema: qp.schema,
          description: qp.description,
        })
      }
    }

    const operation: Record<string, unknown> = {
      tags: [route.tag],
      summary: route.summary,
      description: [route.description, roleNote(route.auth)].filter(Boolean).join('\n\n'),
      responses: Object.fromEntries(
        Object.entries(route.responses).map(([code, res]) => [
          code,
          {
            description: res.description,
            ...(res.schemaRef
              ? { content: { 'application/json': { schema: { $ref: res.schemaRef.replace('#/components/schemas/', '#/components/schemas/') } } } }
              : code === '401' || code === '403'
                ? { content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
                : {}),
          },
        ]),
      ),
    }

    if (parameters.length > 0) operation.parameters = parameters

    if (route.requestBody) {
      operation.requestBody = {
        required: true,
        description: route.requestBody.description,
        content: {
          'application/json': {
            schema: route.requestBody.schemaRef
              ? { $ref: route.requestBody.schemaRef }
              : { type: 'object' },
            ...(route.requestBody.example ? { example: route.requestBody.example } : {}),
          },
        },
      }
    }

    const security = securityForAuth(route.auth)
    if (security) operation.security = security

    pathItem[route.method.toLowerCase()] = operation
    paths[route.path] = pathItem
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'MTXfoil Dashboard API',
      version: API_DOCS_VERSION,
      description:
        'Operator and admin HTTP API for the MTXfoil control panel. Authentication uses the Payload CMS session cookie (`payload-token`) set after login at `/admin`. Role checks are enforced per route via `api-auth.ts` and `permissions.ts`. This documents dashboard-owned routes only — not the external MediaMTX control API.',
    },
    servers: baseUrl ? [{ url: baseUrl, description: 'Current host' }] : [{ url: '/', description: 'Relative to dashboard origin' }],
    tags,
    paths,
    components: {
      securitySchemes: {
        payloadSession: {
          type: 'apiKey',
          in: 'cookie',
          name: 'payload-token',
          description:
            'Payload CMS session cookie obtained by signing in at `/admin`. Roles: superadmin > admin > operator > viewer. Viewer role cannot access most operator APIs.',
        },
      },
      schemas,
    },
  }
}
