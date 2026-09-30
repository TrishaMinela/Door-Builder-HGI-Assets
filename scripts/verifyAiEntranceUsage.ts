import assert from 'node:assert/strict'
import sharp from 'sharp'
import handler, { type ModelDetection } from '../api/detect-entrance-structure'
import { estimateEntranceDetectionCost, normalizeResponseUsage } from '../server/aiUsage'

const originalFetch = globalThis.fetch
const originalKey = process.env.OPENAI_API_KEY
const originalSupabaseUrl = process.env.SUPABASE_URL
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
process.env.OPENAI_API_KEY = 'mock-openai-key'
process.env.SUPABASE_URL = 'https://telemetry-test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'

const photo = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#9b8b79' } }).webp().toBuffer()
const usage = { input_tokens: 2000, input_tokens_details: { cached_tokens: 400 }, output_tokens: 300, output_tokens_details: { reasoning_tokens: 120 }, total_tokens: 2300 }
const modelDetection = (both = false): ModelDetection => ({
  doorStructure: 'single', hasLeftSidelite: both, hasRightSidelite: both, hasTransom: false,
  leftSidelite: { present: both, confidence: .96, evidence: both ? 'Separate framed left panel.' : 'No separate left panel.', box: both ? { xMin: .15, yMin: .2, xMax: .25, yMax: .85, confidence: .96 } : null },
  rightSidelite: { present: both, confidence: .96, evidence: both ? 'Separate framed right panel.' : 'No separate right panel.', box: both ? { xMin: .75, yMin: .2, xMax: .85, yMax: .85, confidence: .96 } : null },
  mainDoor: { xMin: .3, yMin: .15, xMax: .7, yMax: .9, confidence: .98 }, transom: null,
  widthClass: both ? 'wide' : 'standard', approximateWidthRatio: both ? .7 : .4, structurallyWide: both, confidence: .95, summary: both ? 'Door with both sidelites.' : 'Single door.',
})

let modelResults: ModelDetection[] = []
let telemetryFailure = false
const telemetryRows: Array<Record<string, unknown>> = []
globalThis.fetch = (async (url, init) => {
  if (url === 'https://api.openai.com/v1/responses') {
    const detection = modelResults.shift()
    assert.ok(detection, 'Unexpected extra GPT-5.4-mini call')
    return Response.json({ output: [{ content: [{ text: JSON.stringify(detection) }] }], usage }, { headers: { 'x-request-id': 'responses-test' } })
  }
  if (String(url).startsWith('https://telemetry-test.supabase.co/rest/v1/ai_entrance_detection_usage')) {
    assert.equal(init?.method, 'POST')
    telemetryRows.push(JSON.parse(String(init.body)) as Record<string, unknown>)
    return new Response(null, { status: telemetryFailure ? 500 : 201 })
  }
  throw new Error(`Unexpected fetch: ${url}`)
}) as typeof fetch

async function detect() {
  let status = 0, body: { detection?: unknown } = {}
  await handler({ method: 'POST', body: { photo: `data:image/webp;base64,${photo.toString('base64')}` }, headers: {} }, {
    status(code) { status = code; return this }, json(value) { body = value as typeof body }, setHeader() {},
  })
  assert.equal(status, 200)
  assert.ok(body.detection)
}

try {
  const normalized = normalizeResponseUsage(usage)
  assert.deepEqual(normalized, { inputTokens: 2000, cachedInputTokens: 400, outputTokens: 300, reasoningTokens: 120, totalTokens: 2300 })
  assert.equal(estimateEntranceDetectionCost('gpt-5.4-mini', normalized), .00258)

  modelResults = [modelDetection(false)]
  await detect()
  assert.equal(telemetryRows.length, 1)
  assert.deepEqual({ pass_type: telemetryRows[0].pass_type, input_tokens: telemetryRows[0].input_tokens, cached_input_tokens: telemetryRows[0].cached_input_tokens, output_tokens: telemetryRows[0].output_tokens, reasoning_tokens: telemetryRows[0].reasoning_tokens, total_tokens: telemetryRows[0].total_tokens, estimated_cost_usd: telemetryRows[0].estimated_cost_usd }, { pass_type: 'primary', input_tokens: 2000, cached_input_tokens: 400, output_tokens: 300, reasoning_tokens: 120, total_tokens: 2300, estimated_cost_usd: .00258 })

  modelResults = [modelDetection(true), modelDetection(true)]
  await detect()
  assert.deepEqual(telemetryRows.slice(1).map((row) => row.pass_type), ['primary', 'verification'])
  assert.equal(telemetryRows[1].workflow_request_id, telemetryRows[2].workflow_request_id)

  telemetryFailure = true
  modelResults = [modelDetection(false)]
  await detect()
  assert.equal(telemetryRows.length, 4, 'A real call is attempted exactly once even when telemetry storage fails')
  console.log('AI entrance usage: 12 usage, pricing, verification-pass, and failure-isolation checks passed.')
} finally {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalSupabaseUrl
  if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
}
