import assert from 'node:assert/strict'
import sharp from 'sharp'
import handler from '../api/detect-entrance-structure'
import { estimateEntranceDetectionCost, normalizeResponseUsage } from '../server/aiUsage'
import type { EntranceDetection } from '../src/features/home-visualizer/entranceFitStrategy'

const originalFetch = globalThis.fetch
const originalKey = process.env.OPENAI_API_KEY
const originalSupabaseUrl = process.env.SUPABASE_URL
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
process.env.OPENAI_API_KEY = 'mock-openai-key'
process.env.SUPABASE_URL = 'https://telemetry-test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'

const photo = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#9b8b79' } }).webp().toBuffer()
const usage = { input_tokens: 2000, input_tokens_details: { cached_tokens: 400 }, output_tokens: 300, output_tokens_details: { reasoning_tokens: 120 }, total_tokens: 2300 }
const modelDetection = (both = false): EntranceDetection => ({
  doorStructure: 'single', sidelites: both ? 'both' : 'none', transom: false,
  widthClass: both ? 'wide' : 'standard', approximateWidthRatio: both ? .7 : .4,
  structurallyWide: both, confidence: .95, summary: both ? 'Door with both sidelites.' : 'Single door.',
})

let modelResults: EntranceDetection[] = []
let telemetryFailure = false
const telemetryRows: Array<Record<string, unknown>> = []
const workflowStarts: Array<Record<string, unknown>> = []
const workflowOutcomes: Array<Record<string, unknown>> = []
let upstreamFailure: string | null = null
globalThis.fetch = (async (url, init) => {
  if (url === 'https://api.openai.com/v1/responses') {
    if (upstreamFailure) return Response.json({ error: { code: upstreamFailure, message: 'SECRET BILLING CREDENTIAL DETAILS' }, usage }, { status: upstreamFailure === 'token_invalidated' ? 401 : 429, headers: { 'x-request-id': 'req_responses_failure' } })
    const detection = modelResults.shift()
    assert.ok(detection, 'Unexpected extra GPT-5.4-mini call')
    return Response.json({ output: [{ content: [{ text: JSON.stringify(detection) }] }], usage }, { headers: { 'x-request-id': `req_responses_test_${telemetryRows.length + 1}` } })
  }
  if (url === 'https://telemetry-test.supabase.co/rest/v1/ai_visualization_workflows') {
    workflowStarts.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
    return new Response(null, { status: 201 })
  }
  if (url === 'https://telemetry-test.supabase.co/rest/v1/rpc/complete_ai_visualization_workflow') {
    workflowOutcomes.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
    return Response.json(true)
  }
  if (String(url).startsWith('https://telemetry-test.supabase.co/rest/v1/ai_entrance_detection_usage')) {
    assert.equal(init?.method, 'POST')
    telemetryRows.push(JSON.parse(String(init.body)) as Record<string, unknown>)
    return telemetryFailure ? new Response(null, { status: 500 }) : Response.json([{ id: `entrance-row-${telemetryRows.length}` }], { status: 201 })
  }
  throw new Error(`Unexpected fetch: ${url}`)
}) as typeof fetch

async function detect(expectedStatus = 200) {
  let status = 0, body: { detection?: unknown; workflow_completion_token?: string; error_code?: string } = {}
  await handler({ method: 'POST', body: { photo: `data:image/webp;base64,${photo.toString('base64')}` }, headers: {} }, {
    status(code) { status = code; return this }, json(value) { body = value as typeof body }, setHeader() {},
  })
  assert.equal(status, expectedStatus)
  if (expectedStatus === 200) { assert.ok(body.detection); assert.match(body.workflow_completion_token ?? '', /^[0-9a-f-]{36}$/i) }
  else assert.doesNotMatch(JSON.stringify(body), /SECRET|credit_balance|token_invalidated|spend_limit|Supabase|credential|billing/i)
  return body
}

try {
  const normalized = normalizeResponseUsage(usage)
  assert.deepEqual(normalized, { inputTokens: 2000, cachedInputTokens: 400, outputTokens: 300, reasoningTokens: 120, totalTokens: 2300 })
  assert.equal(estimateEntranceDetectionCost('gpt-5.4-mini', normalized), .00258)

  modelResults = [modelDetection(false)]
  await detect()
  assert.equal(workflowStarts.length, 1)
  assert.equal(workflowStarts[0].status, 'started')
  assert.equal(telemetryRows.length, 1)
  assert.deepEqual({ pass_type: telemetryRows[0].pass_type, input_tokens: telemetryRows[0].input_tokens, cached_input_tokens: telemetryRows[0].cached_input_tokens, output_tokens: telemetryRows[0].output_tokens, reasoning_tokens: telemetryRows[0].reasoning_tokens, total_tokens: telemetryRows[0].total_tokens, estimated_cost_usd: telemetryRows[0].estimated_cost_usd }, { pass_type: 'primary', input_tokens: 2000, cached_input_tokens: 400, output_tokens: 300, reasoning_tokens: 120, total_tokens: 2300, estimated_cost_usd: .00258 })

  modelResults = [modelDetection(true)]
  await detect()
  assert.deepEqual(telemetryRows.slice(1).map((row) => row.pass_type), ['primary'])
  assert.equal(telemetryRows[1].provider_request_id, 'req_responses_test_2')
  assert.notEqual(telemetryRows[0].request_id, telemetryRows[0].workflow_request_id)

  telemetryFailure = true
  modelResults = [modelDetection(false)]
  await detect()
  assert.equal(telemetryRows.length, 3, 'A real call is attempted exactly once even when telemetry storage fails')
  telemetryFailure = false
  upstreamFailure = 'rate_limit_exceeded'
  await detect(429)
  assert.equal(workflowOutcomes.at(-1)?.p_status, 'failed')
  assert.equal(workflowOutcomes.at(-1)?.p_failure_stage, 'entrance_analysis')
  assert.equal(workflowOutcomes.at(-1)?.p_failure_category, 'rate_limit_exceeded')
  for (const category of ['credit_balance_exhausted', 'project_spend_limit_exceeded', 'token_invalidated']) {
    upstreamFailure = category
    const body = await detect(503)
    assert.equal(body.error_code, 'AI_TEMPORARILY_UNAVAILABLE')
    assert.equal(workflowOutcomes.at(-1)?.p_failure_category, category)
    assert.equal(telemetryRows.at(-1)?.error_code, category)
  }
  console.log('AI entrance usage: workflow start, analysis failure, provider usage, pricing, request correlation, environment, and failure-isolation checks passed.')
} finally {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalSupabaseUrl
  if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
}
