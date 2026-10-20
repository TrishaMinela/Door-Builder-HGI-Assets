import assert from 'node:assert/strict'
import sharp from 'sharp'
import handler from '../api/detect-entrance-structure'

// All upstream traffic is mocked. No environment files or live AI are used.
const originalFetch = globalThis.fetch
const originalKey = process.env.OPENAI_API_KEY
const originalError = console.error
const originalInfo = console.info
const secret = 'sk-proj-test-secret-never-log-this'
const photo = `data:image/png;base64,${(await sharp({ create: { width: 20, height: 30, channels: 3, background: '#888' } }).png().toBuffer()).toString('base64')}`
const detection = { doorStructure: 'single', sidelites: 'none', transom: false, widthClass: 'standard', approximateWidthRatio: .4, structurallyWide: false, confidence: .95, summary: 'Single door.' }
const logs: unknown[][] = []
let mockResponse: () => Response = () => Response.json({})
let calls = 0
process.env.OPENAI_API_KEY = secret
console.error = (...args) => { logs.push(args) }
console.info = (...args) => { logs.push(args) }
globalThis.fetch = (async (url, init) => {
  assert.equal(url, 'https://api.openai.com/v1/responses')
  assert.equal(init?.method, 'POST')
  assert.equal(JSON.parse(String(init?.body)).store, false)
  calls++
  return mockResponse()
}) as typeof fetch

async function invoke(expectedStatus: number, expectedCode?: string, expectedDetection = detection) {
  logs.length = 0
  let status = 0
  let body: Record<string, unknown> = {}
  const headers: Record<string, string> = {}
  await handler({ method: 'POST', body: { photo } }, {
    status(value) { status = value; return this }, json(value) { body = value as typeof body }, setHeader(name, value) { headers[name] = value },
  })
  assert.equal(status, expectedStatus)
  assert.equal(body.request_id, headers['X-Request-Id'])
  if (expectedCode) assert.equal(body.error_code, expectedCode)
  else assert.deepEqual(body.detection, expectedDetection)
  const serialized = JSON.stringify(logs)
  for (const forbidden of [secret, 'Bearer ', photo, photo.split(',')[1], 'PRIVATE_PHOTO_CONTENT', 'authorization', 'UNSAFE_RESPONSE_BODY']) assert.ok(!serialized.includes(forbidden), 'Diagnostics must not reflect sensitive content')
  assert.ok(!('openai_request_id' in body), 'Upstream diagnostics remain server-side')
  const upstream = logs.find(row => row[0] === '[ai-entrance-detection:upstream-failure]')?.[1] as Record<string, unknown> | undefined
  if (upstream) assert.equal(upstream.request_id, body.request_id)
  return upstream
}

try {
  for (const [status, code, type] of [[400, 'model_not_found', 'invalid_request_error'], [401, 'invalid_api_key', 'invalid_request_error'], [401, 'token_invalidated', 'authentication_error'], [403, 'permission_denied', 'permission_error'], [429, 'insufficient_quota', 'insufficient_quota'], [429, 'rate_limit_exceeded', 'rate_limit_error'], [500, null, 'server_error']] as const) {
    mockResponse = () => Response.json({ error: { code, type, message: `Bearer ${secret} ${photo} PRIVATE_PHOTO_CONTENT`, extra: 'UNSAFE_RESPONSE_BODY' } }, { status, headers: { 'x-request-id': 'req_mock-123' } })
    const diagnostic = (await invoke(status === 429 ? 429 : 502, 'OPENAI_REQUEST_REJECTED'))!
    assert.equal(diagnostic.upstream_status, status)
    assert.equal(diagnostic.openai_request_id, 'req_mock-123')
    assert.equal(diagnostic.stage, 'http_error')
    assert.equal(diagnostic.response_json_valid, true)
    assert.equal(diagnostic.error_code, code)
    assert.equal(diagnostic.error_type, type)
  }
  for (const status of [200, 502]) {
    mockResponse = () => new Response(`UNSAFE_RESPONSE_BODY ${secret} ${photo}`, { status })
    const diagnostic = (await invoke(502, 'OPENAI_REQUEST_REJECTED'))!
    assert.equal(diagnostic.stage, status === 200 ? 'invalid_json_response' : 'http_error')
    assert.equal(diagnostic.response_json_valid, false)
    assert.equal(diagnostic.upstream_status, status)
    assert.equal(diagnostic.openai_request_id, null)
  }
  mockResponse = () => Response.json({ error: { type: secret, code: photo, message: 'PRIVATE_PHOTO_CONTENT' } }, { status: 401, headers: { 'x-request-id': secret } })
  const unknown = (await invoke(502, 'OPENAI_REQUEST_REJECTED'))!
  assert.equal(unknown.error_code, '[unrecognized]')
  assert.equal(unknown.error_type, '[unrecognized]')
  assert.equal(unknown.openai_request_id, null)
  mockResponse = () => Response.json(null)
  assert.equal((await invoke(502, 'OPENAI_REQUEST_REJECTED'))!.stage, 'invalid_response_shape')
  mockResponse = () => Response.json({ output: [{ content: [{ text: `PRIVATE_PHOTO_CONTENT ${secret} ${photo}` }] }] })
  assert.equal((await invoke(500, 'UNKNOWN_ERROR'))!.stage, 'invalid_detection_json')
  mockResponse = () => { throw new TypeError(`Bearer ${secret} ${photo}`) }
  assert.equal(await invoke(500, 'UNKNOWN_ERROR'), undefined)
  mockResponse = () => { throw Object.assign(new Error(secret), { name: 'TimeoutError' }) }
  await invoke(504, 'AI_GENERATION_TIMEOUT')
  mockResponse = () => Response.json({ output: [{ content: [{ text: JSON.stringify(detection) }] }] })
  assert.equal(await invoke(200), undefined)
  assert.equal(logs.length, 1)
  assert.equal(logs[0][0], '[ai-entrance-detection:success]')
  const sensitiveDetection = { ...detection, summary: `PRIVATE_PHOTO_CONTENT ${secret} ${photo}` }
  mockResponse = () => Response.json({ output: [{ content: [{ text: JSON.stringify(sensitiveDetection) }] }], unused: 'UNSAFE_RESPONSE_BODY' })
  await invoke(200, undefined, sensitiveDetection)
  const beforeMissingKey = calls
  delete process.env.OPENAI_API_KEY
  await invoke(503, 'SERVER_CONFIGURATION_ERROR')
  assert.equal(calls, beforeMissingKey)
  originalInfo('PASS: 17 mocked detection scenarios; status/request-ID correlation, HTTP vs JSON failures, safe categories, redaction, timeout, missing credential and success. No live AI requests.')
} finally {
  globalThis.fetch = originalFetch
  console.error = originalError
  console.info = originalInfo
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey
}
