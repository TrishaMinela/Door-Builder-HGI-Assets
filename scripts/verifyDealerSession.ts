import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import handler from '../api/dealer-session'

const originalFetch = globalThis.fetch
const originalNow = Date.now
let now = originalNow()
Date.now = () => now
const env = { ...process.env }
process.env.DEALER_MODE_PASSWORD = randomBytes(24).toString('hex')
process.env.DEALER_MODE_ORIGIN = 'https://builder.example.invalid'
process.env.DEALER_MODE_SESSION_SECRET = randomBytes(32).toString('hex')
let networkCalls = 0
globalThis.fetch = async () => { networkCalls++; throw new Error('Authentication must not access any external service') }
const invoke = async (method = 'GET', body?: unknown, cookie = '', origin = process.env.DEALER_MODE_ORIGIN!) => {
  let status = 0, data: unknown
  const headers: Record<string, string> = {}
  const res = { status(code: number) { status = code; return res }, json(value: unknown) { data = value }, setHeader(name: string, value: string) { headers[name] = value } }
  await handler({ method, body, headers: { origin, cookie, 'x-vercel-forwarded-for': '192.0.2.1' } }, res)
  assert.equal(headers['Cache-Control'], 'no-store')
  assert.ok(!JSON.stringify(data).includes(process.env.DEALER_MODE_PASSWORD!))
  return { status, data, headers }
}
try {
  assert.deepEqual((await invoke()).data, { authenticated: false })
  assert.deepEqual((await invoke('GET', undefined, '__Host-hgi-dealer=' + 'a'.repeat(64))).data, { authenticated: false })
  assert.equal((await invoke('POST', { password: 'wrong' })).status, 401)
  assert.equal((await invoke('POST', { password: process.env.DEALER_MODE_PASSWORD }, '', 'https://other.invalid')).status, 403)
  const login = await invoke('POST', { password: process.env.DEALER_MODE_PASSWORD })
  assert.equal(login.status, 200)
  const cookie = login.headers['Set-Cookie'].split(';')[0]
  assert.match(login.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Strict/)
  assert.doesNotMatch(login.headers['Set-Cookie'], /Max-Age|Expires/i, 'Login uses a nonpersistent browser-session cookie')
  assert.equal((await invoke('GET', undefined, cookie)).status, 200)
  assert.deepEqual((await invoke('GET', undefined, cookie)).data, login.data)
  assert.equal((await invoke('GET', undefined, cookie)).headers['Set-Cookie'], undefined, 'Checks do not extend cookie lifetime')
  now += 31 * 60 * 1000
  assert.deepEqual((await invoke('GET', undefined, cookie)).data, login.data, 'Session remains authenticated beyond 30 minutes')
  const tampered = cookie.slice(0, -1) + (cookie.endsWith('a') ? 'b' : 'a')
  assert.deepEqual((await invoke('GET', undefined, tampered)).data, { authenticated: false })
  assert.match((await invoke('DELETE', undefined, cookie)).headers['Set-Cookie'], /Max-Age=0/)
  assert.deepEqual((await invoke()).data, { authenticated: false })
  assert.deepEqual((await invoke('GET', undefined, cookie)).data, login.data, 'Documented stateless limitation: copied token survives browser logout until expiry')
  const password = process.env.DEALER_MODE_PASSWORD
  process.env.DEALER_MODE_PASSWORD = randomBytes(24).toString('hex')
  assert.deepEqual((await invoke('GET', undefined, cookie)).data, { authenticated: false }, 'Password rotation invalidates signatures')
  process.env.DEALER_MODE_PASSWORD = password
  const secret = process.env.DEALER_MODE_SESSION_SECRET
  process.env.DEALER_MODE_SESSION_SECRET = randomBytes(32).toString('hex')
  assert.deepEqual((await invoke('GET', undefined, cookie)).data, { authenticated: false }, 'Secret rotation invalidates signatures')
  process.env.DEALER_MODE_SESSION_SECRET = secret
  for (let i = 0; i < 5; i++) await invoke('POST', { password: 'wrong' })
  assert.equal((await invoke('POST', { password: process.env.DEALER_MODE_PASSWORD })).status, 429)
  now += 24 * 60 * 60 * 1000
  assert.deepEqual((await invoke('GET', undefined, cookie)).data, { authenticated: false }, 'Absolute expiry is enforced by server clock')
  assert.equal((await invoke('POST', { password })).status, 200, 'Rate window expires')
  process.env.DEALER_MODE_SESSION_SECRET = 'weak'
  assert.equal((await invoke()).status, 503)
  process.env.DEALER_MODE_SESSION_SECRET = secret
  delete process.env.DEALER_MODE_PASSWORD
  assert.equal((await invoke()).status, 503)
  assert.equal(networkCalls, 0)
  console.log('PASS stateless Dealer session: password rejection, CSRF, signed cookie, tamper rejection, expiry, logout, rotation, local rate limit, missing/weak secrets; zero external calls. Copied-token logout limitation explicitly verified.')
} finally { globalThis.fetch = originalFetch; Date.now = originalNow; process.env = env }
