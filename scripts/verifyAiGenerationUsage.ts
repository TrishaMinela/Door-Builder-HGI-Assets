import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
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
let upstreamFailure: string | null = null
let upstreamTimeout = false
let providerSequence = 0
let workflowCompletionAccepted = true
let workflowValidationAccepted = true

globalThis.fetch = (async (url, init) => {
  if (url === 'https://api.openai.com/v1/images/edits') {
    providerSequence += 1
    if (upstreamTimeout) throw Object.assign(new Error('SECRET PROVIDER TIMEOUT DETAIL'), { name: 'TimeoutError' })
    if (upstreamFailure) return Response.json({ error: { code: upstreamFailure, message: 'SECRET PROVIDER BILLING DETAIL' }, usage }, { status: upstreamFailure === 'invalid_api_key' ? 401 : 429, headers: { 'x-request-id': `req_image_${providerSequence}` } })
    return Response.json({ data: [{ b64_json: generated.toString('base64') }], usage }, { headers: { 'x-request-id': `req_image_${providerSequence}` } })
  }
  if (String(url).startsWith('https://telemetry-test.supabase.co/rest/v1/ai_generation_usage')) {
    assert.equal(init?.method, 'POST')
    telemetryRows.push(JSON.parse(String(init.body)) as Record<string, unknown>)
    return telemetryFailure ? new Response(null, { status: 500 }) : Response.json([{ id: `generation-row-${telemetryRows.length}` }], { status: 201 })
  }
  if (String(url).startsWith('https://telemetry-test.supabase.co/rest/v1/ai_visualization_workflows?')) {
    const workflowId = new URL(String(url)).searchParams.get('workflow_request_id')?.replace(/^eq\./, '') ?? ''
    return Response.json(workflowValidationAccepted ? [{ workflow_request_id: workflowId }] : [])
  }
  if (url === 'https://telemetry-test.supabase.co/rest/v1/rpc/complete_ai_visualization_workflow') {
    workflowOutcomes.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
    return Response.json(workflowCompletionAccepted)
  }
  throw new Error(`Unexpected fetch: ${url}`)
}) as typeof fetch

async function generate(marker: string, correlation = true) {
  const suffix = createHash('sha256').update(marker).digest('hex').slice(0, 12)
  const workflowId = `11111111-1111-4111-8111-${suffix}`
  const workflowToken = `22222222-2222-4222-8222-${suffix}`
  let status = 0
  let body: { image?: string; request_id?: string; completion_token?: string; error_code?: string; user_message?: string } = {}
  await handler({ method: 'POST', headers: {}, body: {
    photo: `data:image/jpeg;base64,${house.toString('base64')}`,
    productReference: `data:image/png;base64,${product.toString('base64')}`,
    configuration: { ...aiTestConfiguration, telemetryTestMarker: marker },
    entranceDetection: { doorStructure: 'single', sidelites: 'none', transom: false, widthClass: 'standard', approximateWidthRatio: .35, structurallyWide: false, confidence: .98, summary: 'Single door.', ...(correlation ? { telemetryRequestId: workflowId, telemetryCompletionToken: workflowToken } : {}) },
    ...(correlation ? { workflow_request_id: workflowId, workflow_completion_token: workflowToken } : {}),
    fitStrategy: 'use-selected-product',
  } }, {
    status(code) { status = code; return this }, json(value) { body = value as typeof body }, setHeader() {},
  })
  return { status, body, workflowId }
}

try {
  const success = await generate('success')
  assert.equal(success.status, 200)
  assert.ok(success.body.image?.startsWith('data:image/jpeg;base64,'))
  assert.ok(success.body.request_id)
  assert.ok(success.body.completion_token)
  assert.equal(telemetryRows[0].status, 'succeeded')
  assert.equal(telemetryRows[0].provider_request_id, 'req_image_1')
  assert.equal(telemetryRows[0].workflow_request_id, success.workflowId)
  assert.equal(telemetryRows[0].environment, 'production')
  assert.equal(telemetryRows[0].estimated_cost_usd, .1576)
  assert.deepEqual({ status: workflowOutcomes[0].p_status, workflow: workflowOutcomes[0].p_workflow_request_id }, { status: 'succeeded', workflow: success.workflowId })

  telemetryFailure = true
  const isolated = await generate('telemetry-failure')
  assert.equal(isolated.status, 200, 'Telemetry failure must not fail a successful generation')
  assert.equal(telemetryRows.length, 2)
  assert.equal(workflowOutcomes[1].p_status, 'succeeded', 'Workflow completion remains best-effort and independent of provider-call telemetry')

  telemetryFailure = false
  upstreamFailure = 'rate_limit_exceeded'
  const failed = await generate('provider-failure')
  assert.equal(failed.status, 429)
  assert.equal(failed.body.error_code, 'AI_BUSY')
  assert.equal(telemetryRows[2].status, 'failed')
  assert.equal(telemetryRows[2].provider_request_id, 'req_image_3')
  assert.equal(telemetryRows[2].estimated_cost_usd, .1576)
  assert.equal(workflowOutcomes[2].p_status, 'failed')
  assert.equal(workflowOutcomes[2].p_failure_stage, 'image_generation')
  assert.equal(workflowOutcomes[2].p_failure_category, 'rate_limit_exceeded')
  assert.doesNotMatch(JSON.stringify(failed.body), /rate_limit_exceeded|SECRET|provider|billing/i)

  upstreamFailure = 'project_spend_limit_exceeded'
  const spendFailure = await generate('spend-failure')
  assert.equal(spendFailure.status, 503)
  assert.equal(spendFailure.body.error_code, 'AI_TEMPORARILY_UNAVAILABLE')
  assert.equal(telemetryRows[3].error_code, 'project_spend_limit_exceeded')
  assert.equal(workflowOutcomes[3].p_failure_category, 'project_spend_limit_exceeded')
  assert.doesNotMatch(JSON.stringify(spendFailure.body), /spend|credit|SECRET|provider|billing/i)

  upstreamFailure = 'invalid_api_key'
  const credentialFailure = await generate('credential-failure')
  assert.equal(credentialFailure.status, 503)
  assert.equal(credentialFailure.body.error_code, 'AI_TEMPORARILY_UNAVAILABLE')
  assert.equal(telemetryRows[4].error_code, 'invalid_api_key')
  assert.equal(workflowOutcomes[4].p_failure_category, 'invalid_api_key')
  assert.doesNotMatch(JSON.stringify(credentialFailure.body), /api.key|invalid|SECRET|provider|credential/i)

  upstreamFailure = 'invalid_image'
  const genericFailure = await generate('generic-failure')
  assert.equal(genericFailure.status, 422)
  assert.equal(genericFailure.body.error_code, 'AI_GENERATION_FAILED')
  assert.equal(genericFailure.body.user_message, 'We couldn’t create your visualization right now. Please try again.')
  assert.equal(telemetryRows[5].error_code, 'invalid_image')
  assert.equal(workflowOutcomes[5].p_failure_category, 'invalid_image')
  assert.doesNotMatch(JSON.stringify(genericFailure.body), /invalid_image|SECRET|provider/i)

  upstreamFailure = null
  upstreamTimeout = true
  const timeoutFailure = await generate('timeout-failure')
  assert.equal(timeoutFailure.status, 504)
  assert.equal(timeoutFailure.body.error_code, 'AI_TIMEOUT')
  assert.equal(timeoutFailure.body.user_message, 'Your visualization took too long to complete. Please try again.')
  assert.equal(telemetryRows[6].error_code, 'provider_timeout')
  assert.equal(workflowOutcomes[6].p_failure_category, 'provider_timeout')
  assert.doesNotMatch(JSON.stringify(timeoutFailure.body), /SECRET|provider/i)

  upstreamTimeout = false
  const workflowCountBeforeMissing = workflowOutcomes.length
  const missingCorrelation = await generate('missing', false)
  assert.equal(missingCorrelation.status, 200)
  assert.equal(telemetryRows.at(-1)?.workflow_request_id, null)
  assert.equal(workflowOutcomes.length, workflowCountBeforeMissing, 'Missing workflow metadata must not complete an unrelated workflow')

  workflowValidationAccepted = false
  const rejectedCorrelation = await generate('rejected')
  assert.equal(rejectedCorrelation.status, 200, 'Correlation validation is best-effort and must not break generation')
  assert.equal(telemetryRows.at(-1)?.workflow_request_id, null)
  workflowValidationAccepted = true

  workflowCompletionAccepted = false
  const rejectedCompletion = await generate('completefail')
  assert.equal(rejectedCompletion.status, 200, 'Workflow RPC rejection must not break generation')
  assert.equal(telemetryRows.at(-1)?.workflow_request_id, rejectedCompletion.workflowId)
  workflowCompletionAccepted = true

  const [concurrentA, concurrentB] = await Promise.all([generate('concurrenta'), generate('concurrentb')])
  assert.equal(concurrentA.status, 200)
  assert.equal(concurrentB.status, 200)
  const concurrentRows = telemetryRows.slice(-2)
  assert.deepEqual(new Set(concurrentRows.map(row => row.workflow_request_id)), new Set([concurrentA.workflowId, concurrentB.workflowId]), 'Concurrent requests retain isolated workflow correlation')

  const retryFirst = await generate('retry')
  workflowCompletionAccepted = false
  const retrySecond = await generate('retry')
  workflowCompletionAccepted = true
  assert.equal(retryFirst.status, 200)
  assert.equal(retrySecond.status, 200)
  assert.equal(telemetryRows.at(-2)?.workflow_request_id, retryFirst.workflowId)
  assert.equal(telemetryRows.at(-1)?.workflow_request_id, retryFirst.workflowId)
  console.log('AI generation usage: workflow success/failure, safe public failures, internal diagnostics, production environment, correlation, cost, and telemetry failure isolation checks passed.')
} finally {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalSupabaseUrl
  if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalVercelEnv
}
