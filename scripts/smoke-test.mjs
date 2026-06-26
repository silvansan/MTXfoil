/**
 * MTXfoil dashboard API smoke test.
 * Run against a live stack: node scripts/smoke-test.mjs
 * Override base URL: SMOKE_BASE_URL=http://host:3000 node scripts/smoke-test.mjs
 */

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

/** @typedef {'ok' | 'auth' | 'client' | 'error'} ResultKind */

/**
 * @param {string} method
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function request(method, path, init = {}) {
  const url = `${baseUrl}${path}`
  const res = await fetch(url, {
    method,
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const body = await res.text()
  return { status: res.status, body }
}

/**
 * @param {number} status
 * @param {number[]} allowed
 */
function classify(status, allowed) {
  if (allowed.includes(status)) return /** @type {const} */ ('ok')
  if (status === 401 || status === 403) return /** @type {const} */ ('auth')
  if (status === 400 || status === 422) return /** @type {const} */ ('client')
  return /** @type {const} */ ('error')
}

/** @type {Array<{ method: string, path: string, expect: number[], body?: unknown, note?: string }>} */
const endpoints = [
  { method: 'GET', path: '/api/health/mediamtx', expect: [200, 503], note: 'public health probe' },
  { method: 'GET', path: '/api/status', expect: [401, 403] },
  { method: 'GET', path: '/api/config/preview', expect: [401, 403] },
  { method: 'POST', path: '/api/config/apply', expect: [401, 403], body: {} },
  { method: 'GET', path: '/api/logs/mediamtx', expect: [401, 403] },
  { method: 'GET', path: '/api/playback/token', expect: [401, 403] },
  { method: 'POST', path: '/api/playback/token', expect: [401, 403], body: {} },
  { method: 'GET', path: '/api/playback/token?slug=test', expect: [401, 403] },
  {
    method: 'POST',
    path: '/api/mediamtx/auth',
    expect: [401],
    body: { action: 'read', path: 'nonexistent' },
    note: 'MediaMTX HTTP auth callback',
  },
  { method: 'POST', path: '/api/mediamtx/auth', expect: [401], body: {}, note: 'invalid body' },
  { method: 'POST', path: '/api/streams/create', expect: [401, 403], body: {} },
  { method: 'PATCH', path: '/api/streams/1', expect: [401, 403], body: {} },
  { method: 'DELETE', path: '/api/streams/1', expect: [401, 403] },
  { method: 'POST', path: '/api/events', expect: [401, 403], body: {} },
  { method: 'PATCH', path: '/api/events/1', expect: [401, 403], body: {} },
  { method: 'DELETE', path: '/api/events/1', expect: [401, 403] },
  { method: 'POST', path: '/api/forwarding', expect: [401, 403], body: {} },
  { method: 'PATCH', path: '/api/forwarding/1', expect: [401, 403], body: {} },
  { method: 'DELETE', path: '/api/forwarding/1', expect: [401, 403] },
  { method: 'PATCH', path: '/api/cors', expect: [401, 403], body: {} },
  { method: 'POST', path: '/api/cors/presets', expect: [401, 403], body: {} },
  { method: 'POST', path: '/api/cors/apply-preset', expect: [401, 403], body: {} },
  { method: 'PATCH', path: '/api/cors/presets/1', expect: [401, 403], body: {} },
  { method: 'DELETE', path: '/api/cors/presets/1', expect: [401, 403] },
  { method: 'PATCH', path: '/api/protocols', expect: [401, 403], body: {} },
  { method: 'POST', path: '/api/recordings/delete', expect: [401, 403], body: {} },
  { method: 'GET', path: '/api/docs', expect: [401] },
  { method: 'GET', path: '/api/docs/openapi.json', expect: [401] },
  { method: 'GET', path: '/api/this-route-does-not-exist', expect: [404] },
]

async function main() {
  /** @type {Array<{ method: string, path: string, status: number, kind: ResultKind, note?: string, snippet?: string }>} */
  const results = []

  for (const ep of endpoints) {
    const init = ep.body !== undefined ? { body: JSON.stringify(ep.body) } : {}
    const { status, body } = await request(ep.method, ep.path, init)
    const kind = classify(status, ep.expect)
    results.push({
      method: ep.method,
      path: ep.path,
      status,
      kind: kind === 'ok' ? 'ok' : kind === 'auth' && ep.expect.some((c) => c === 401 || c === 403) ? 'auth' : kind,
      note: ep.note,
      snippet: kind === 'error' ? body.slice(0, 200) : undefined,
    })
  }

  const health = results.find((r) => r.path === '/api/health/mediamtx')
  if (health) {
    try {
      const res = await request('GET', '/api/health/mediamtx')
      const json = JSON.parse(res.body)
      if (typeof json.ok !== 'boolean') {
        health.kind = 'error'
        health.snippet = 'response missing ok field'
      }
    } catch (err) {
      health.kind = 'error'
      health.snippet = err instanceof Error ? err.message : String(err)
    }
  }

  const errors = results.filter((r) => r.kind === 'error')
  const passed = results.filter((r) => r.kind === 'ok').length
  const authRequired = results.filter(
    (r) => r.kind === 'ok' && (r.status === 401 || r.status === 403),
  ).length

  console.log('API Smoke Test Results')
  console.log(`  Base URL: ${baseUrl}`)
  console.log(`  Tested: ${results.length}`)
  console.log(`  Passed: ${passed}`)
  console.log(`  Auth required: ${authRequired}`)
  console.log(`  Errors: ${errors.length}`)
  console.log('')

  console.log('| Method | Path | Status | Result |')
  console.log('|--------|------|--------|--------|')
  for (const r of results) {
    const label =
      r.kind === 'ok' ? 'OK' : r.kind === 'auth' ? 'Auth' : r.kind === 'client' ? 'Client' : 'ERROR'
    console.log(`| ${r.method} | ${r.path} | ${r.status} | ${label} |`)
  }

  if (errors.length > 0) {
    console.log('')
    console.log('Error details:')
    for (const r of errors) {
      console.log(`  ${r.method} ${r.path} -> ${r.status}${r.snippet ? `: ${r.snippet}` : ''}`)
    }
    process.exit(1)
  }

  console.log('')
  console.log('All smoke checks passed')
}

main().catch((err) => {
  console.error('FAIL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
