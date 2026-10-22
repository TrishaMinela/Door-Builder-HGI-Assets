import assert from 'node:assert/strict'
import failWorkflowHandler from '../api/fail-ai-visualization-workflow'
import { recordAiVisualizationWorkflowStarted } from '../server/aiUsage'

const originalFetch = globalThis.fetch
const originalSupabaseUrl = process.env.SUPABASE_URL
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
process.env.SUPABASE_URL = 'https://telemetry-test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'

const workflowRequestId = '11111111-1111-4111-8111-111111111111'
const completionToken = '22222222-2222-4222-8222-222222222222'
const requests: Array<{ url: string; body: Record<string, unknown> }> = []
let startCalls = 0

globalThis.fetch = (async (url, init) => {
  const parsedBody = JSON.parse(String(init?.body)) as Record<string, unknown>
  requests.push({ url: String(url), body: parsedBody })
  if (url === 'https://telemetry-test.supabase.co/rest/v1/ai_visualization_workflows') {
    startCalls += 1
    return new Response(null, { status: startCalls === 1 ? 201 : 409 })
  }
  if (url === 'https://telemetry-test.supabase.co/rest/v1/rpc/complete_ai_visualization_workflow') return Response.json(true)
  throw new Error(`Unexpected fetch: ${url}`)
}) as typeof fetch

try {
  const first = await recordAiVisualizationWorkflowStarted({ workflowRequestId, environment: 'production', completionTokenHash: 'stored-hash' })
  const duplicate = await recordAiVisualizationWorkflowStarted({ workflowRequestId, environment: 'production', completionTokenHash: 'stored-hash' })
  assert.equal(first, true)
  assert.equal(duplicate, true, 'Duplicate workflow IDs are idempotent')
  assert.equal(startCalls, 2)

  let responseStatus = 0
  await failWorkflowHandler({ method: 'POST', body: { workflow_request_id: workflowRequestId, workflow_completion_token: completionToken, failure_category: 'ENTRANCE_INCOMPATIBLE' } }, {
    status(code) { responseStatus = code; return this },
    json() {}, setHeader() {},
  })
  assert.equal(responseStatus, 200)
  const completion = requests.at(-1)!.body
  assert.equal(completion.p_workflow_request_id, workflowRequestId)
  assert.equal(completion.p_status, 'failed')
  assert.equal(completion.p_failure_stage, 'application_infrastructure')
  assert.equal(completion.p_failure_category, 'ENTRANCE_INCOMPATIBLE')
  assert.match(String(completion.p_completion_token_hash), /^[a-f0-9]{64}$/)
  assert.notEqual(completion.p_completion_token_hash, completionToken)

  console.log('AI workflow usage: durable start, duplicate protection, and token-protected application failure checks passed.')
} finally {
  globalThis.fetch = originalFetch
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalSupabaseUrl
  if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
}
