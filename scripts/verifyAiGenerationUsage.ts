import assert from 'node:assert/strict'
import sharp from 'sharp'
import handler from '../api/generate-door-visualization'
import { aiTestConfiguration } from './aiVisualizerFixture'

const originalFetch = globalThis.fetch
const originalKey = process.env.OPENAI_API_KEY
const originalSupabaseUrl = process.env.SUPABASE_URL
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const originalVercelEnv = process.env.VERCEL_ENV
process.env.OPENAI_API_KEY = 'mock-openai-key'
process.env.SUPABASE_URL = 'https://telemetry-test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'
process.env.VERCEL_ENV = 'production'

const house = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#98765c' } }).jpeg().toBuffer()
const product = await sharp({ create: { width: 500, height: 1000, channels: 4, background: '#303030' } }).png().toBuffer()
const generated = await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#876543' } }).jpeg().toBuffer()
const usage = { input_tokens: 5000, input_tokens_details: { text_tokens: 800, image_tokens: 4200 }, output_tokens: 4000, output_tokens_details: { image_tokens: 4000 }, total_tokens: 9000 }
const telemetryRows: Array<Record<string, unknown>> = []
const workflowOutcomes: Array<Record<string, unknown>> = []
let telemetryFailure = false
let upstreamFailure = false
let providerSequence = 0

globalThis.fetch = (async (url, init) => {
  if (url === 'https://api.openai.com/v1/images/edits') {
    providerSequence += 1
    if (upstreamFailure) return Response.json({ error: { code: 'rate_limit_exceeded' }, usage }, { status: 429, headers: { 'x-request-id': `req_image_${providerSequence}` } })
    return Response.json({ data: [{ b64_json: generated.toString('base64') }], usage }, { headers: { 'x-request-id': `req_image_${providerSequence}` } })
  }
  if (String(url).startsWith('https://telemetry-test.supabase.co/rest/v1/ai_generation_usage')) {
    assert.equal(init?.method, 'POST')
    telemetryRows.push(JSON.parse(String(init.body)) as Record<string, unknown>)
    return telemetryFailure ? new Response(null, { status: 500 }) : Response.json([{ id: `generation-row-${telemetryRows.length}` }], { status: 201 })
  }
  if (url === 'https://telemetry-test.supabase.co/rest/v1/rpc/complete_ai_visualization_workflow') {
    workflowOutcomes.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
    return Response.json(true)
  }
  throw new Error(`Unexpected fetch: ${url}`)
}) as typeof fetch

async function generate(marker: string) {
  let status = 0
  let body: { image?: string; request_id?: string; completion_token?: string; error_code?: string } = {}
  await handler({ method: 'POST', headers: {}, body: {
    photo: `data:image/jpeg;base64,${house.toString('base64')}`,
    productReference: `data:image/png;base64,${product.toString('base64')}`,
    configuration: { ...aiTestConfiguration, telemetryTestMarker: marker },
    entranceDetection: { doorStructure: 'single', sidelites: 'none', transom: false, widthClass: 'standard', approximateWidthRatio: .35, structurallyWide: false, confidence: .98, summary: 'Single door.', telemetryRequestId: `detection-workflow-${marker}` },
    fitStrategy: 'use-selected-product',
  } }, {
    status(code) { status = code; return this }, json(value) { body = value as typeof body }, setHeader() {},
  })
  return { status, body }
}

try {
  const success = await generate('success')
  assert.equal(success.status, 200)
  assert.ok(success.body.image?.startsWith('data:image/jpeg;base64,'))
  assert.ok(success.body.request_id)
  assert.ok(success.body.completion_token)
  assert.equal(telemetryRows[0].status, 'succeeded')
  assert.equal(telemetryRows[0].provider_request_id, 'req_image_1')
  assert.equal(telemetryRows[0].workflow_request_id, 'detection-workflow-success')
  assert.equal(telemetryRows[0].environment, 'production')
  assert.equal(telemetryRows[0].estimated_cost_usd, .1576)
  assert.deepEqual({ status: workflowOutcomes[0].p_status, workflow: workflowOutcomes[0].p_workflow_request_id }, { status: 'succeeded', workflow: 'detection-workflow-success' })

  telemetryFailure = true
  const isolated = await generate('telemetry-failure')
  assert.equal(isolated.status, 200, 'Telemetry failure must not fail a successful generation')
  assert.equal(telemetryRows.length, 2)
  assert.equal(workflowOutcomes[1].p_status, 'succeeded', 'Workflow completion remains best-effort and independent of provider-call telemetry')

  telemetryFailure = false
  upstreamFailure = true
  const failed = await generate('provider-failure')
  assert.equal(failed.status, 429)
  assert.equal(failed.body.error_code, 'OPENAI_RATE_LIMITED')
  assert.equal(telemetryRows[2].status, 'failed')
  assert.equal(telemetryRows[2].provider_request_id, 'req_image_3')
  assert.equal(telemetryRows[2].estimated_cost_usd, .1576)
  assert.equal(workflowOutcomes[2].p_status, 'failed')
  assert.equal(workflowOutcomes[2].p_failure_stage, 'image_generation')
  assert.equal(workflowOutcomes[2].p_failure_category, 'OPENAI_RATE_LIMITED')
  console.log('AI generation usage: workflow success/failure, provider failure, production environment, correlation, cost, and telemetry failure isolation checks passed.')
} finally {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalSupabaseUrl
  if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalVercelEnv
}
