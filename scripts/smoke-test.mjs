const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000'

async function check(name, url, expectStatus = 200) {
  const res = await fetch(url)
  const body = await res.text()
  if (res.status !== expectStatus) {
    throw new Error(`${name}: expected HTTP ${expectStatus}, got ${res.status}: ${body}`)
  }
  console.log(`PASS: ${name}`)
  return body
}

async function main() {
  const root = baseUrl.replace(/\/$/, '')

  const healthBody = await check('health', `${root}/api/health/mediamtx`)
  const health = JSON.parse(healthBody)
  if (typeof health.ok !== 'boolean') {
    throw new Error('health response missing ok field')
  }

  // Unauthenticated status should be rejected
  const statusRes = await fetch(`${root}/api/status`)
  if (statusRes.status !== 401 && statusRes.status !== 403) {
    throw new Error(`status without auth: expected 401/403, got ${statusRes.status}`)
  }
  console.log('PASS: status API requires auth')

  // Auth endpoint should respond (deny without body is fine)
  const authRes = await fetch(`${root}/api/mediamtx/auth`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'read', path: 'nonexistent' }),
  })
  if (authRes.status !== 401) {
    throw new Error(`mediamtx auth: expected 401 for unknown path, got ${authRes.status}`)
  }
  console.log('PASS: mediamtx auth endpoint reachable')

  const unknownRes = await fetch(`${root}/api/this-route-does-not-exist`)
  if (unknownRes.status !== 404) {
    throw new Error(`unknown API route: expected 404, got ${unknownRes.status}`)
  }
  console.log('PASS: unknown API route returns 404')

  console.log('All smoke checks passed')
}

main().catch((err) => {
  console.error('FAIL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
