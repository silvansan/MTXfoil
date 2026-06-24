const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000'
const healthUrl = `${baseUrl.replace(/\/$/, '')}/api/health/mediamtx`

async function main() {
  console.log(`Smoke test: GET ${healthUrl}`)
  const res = await fetch(healthUrl)
  const body = await res.text()

  if (res.status !== 200) {
    console.error(`FAIL: expected HTTP 200, got ${res.status}`)
    console.error(body)
    process.exit(1)
  }

  let parsed: { ok?: boolean }
  try {
    parsed = JSON.parse(body) as { ok?: boolean }
  } catch {
    console.error('FAIL: health response is not valid JSON')
    console.error(body)
    process.exit(1)
  }

  if (typeof parsed.ok !== 'boolean') {
    console.error('FAIL: health response missing ok field')
    console.error(body)
    process.exit(1)
  }

  console.log(`PASS: dashboard health endpoint responded with HTTP 200 (ok=${parsed.ok})`)
}

main().catch((err) => {
  console.error('FAIL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
