import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import handler from '../api/generate-door-visualization'
import completeHandler from '../api/complete-ai-visualization'
import detectHandler from '../api/detect-entrance-structure'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { evaluateEntranceCompatibility, type EntranceDetection } from '../src/features/home-visualizer/entranceFitStrategy'

for (const name of ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`${name} is required for the live AI usage acceptance test.`)
}

const house = await readFile(new URL('../public/assets/hero/hero-entryway.webp', import.meta.url))
const productSvg = Buffer.from(`
  <svg width="600" height="1200" xmlns="http://www.w3.org/2000/svg">
    <rect width="600" height="1200" fill="none"/>
    <rect x="70" y="30" width="460" height="1140" rx="6" fill="#242424"/>
    <rect x="225" y="170" width="150" height="390" fill="#aecbd6"/>
    <circle cx="465" cy="720" r="18" fill="#b89c62"/>
  </svg>
`)
const product = await sharp(productSvg).png().toBuffer()

let status = 0
const stopwatchStartedAt = performance.now()
const detectionStartedAt = performance.now()
let detectionStatus = 0
let detectionBody: { detection?: unknown; error_code?: string; user_message?: string; request_id?: string } = {}
await detectHandler({ method: 'POST', body: { photo: `data:image/webp;base64,${house.toString('base64')}` }, headers: {} }, {
  status(code) { detectionStatus = code; return this },
  json(body) { detectionBody = body as typeof detectionBody },
  setHeader() {},
})
const entranceDetectionDurationMs = Math.round(performance.now() - detectionStartedAt)
assert.equal(detectionStatus, 200, detectionBody.user_message ?? detectionBody.error_code ?? 'Entrance detection failed.')
assert.ok(detectionBody.detection)
const compatibility = evaluateEntranceCompatibility(detectionBody.detection as EntranceDetection, aiTestConfiguration)
assert.equal(compatibility.status, 'good-fit', 'Controlled fixture must pass compatibility before Sunburst generation.')
const entranceStageDurationMs = Math.round(performance.now() - detectionStartedAt)
let responseBody: { image?: string; request_id?: string; completion_token?: string; error_code?: string; user_message?: string } = {}
await handler({
  method: 'POST',
  body: {
    photo: `data:image/webp;base64,${house.toString('base64')}`,
    productReference: `data:image/png;base64,${product.toString('base64')}`,
    configuration: aiTestConfiguration,
    entranceDetection: detectionBody.detection,
    fitStrategy: 'use-selected-product',
    uploadMetadata: { mimeType: 'image/webp', format: 'webp', byteSize: house.length },
  },
  headers: {},
}, {
  status(code) { status = code; return this },
  json(body) { responseBody = body as typeof responseBody },
  setHeader() {},
})

assert.ok(responseBody.request_id)
if (process.env.AI_USAGE_EXPECT_FAILURE === '1') {
  assert.equal(status, 503)
  assert.equal(responseBody.error_code, 'SERVER_CONFIGURATION_ERROR')
  assert.equal(responseBody.image, undefined)
  console.log(JSON.stringify({ ok: true, expected_failure: responseBody.error_code, request_id: responseBody.request_id }))
} else {
  assert.equal(status, 200, responseBody.user_message ?? responseBody.error_code ?? 'Live AI generation failed.')
  assert.ok(responseBody.image?.startsWith('data:image/jpeg;base64,'))
  assert.ok(responseBody.completion_token)
  await sharp(Buffer.from(responseBody.image!.split(',')[1], 'base64')).metadata()
  const stopwatchDurationMs = Math.round(performance.now() - stopwatchStartedAt)
  let completionStatus = 0
  await completeHandler({ method: 'POST', body: { request_id: responseBody.request_id, completion_token: responseBody.completion_token, total_visualization_duration_ms: stopwatchDurationMs, entrance_stage_duration_ms: entranceStageDurationMs } }, {
    status(code) { completionStatus = code; return this },
    json() {}, setHeader() {},
  })
  assert.equal(completionStatus, 200)
  const supabaseUrl = process.env.SUPABASE_URL!.replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const storedResponse = await fetch(`${supabaseUrl}/rest/v1/ai_generation_usage?request_id=eq.${responseBody.request_id}&select=environment,text_input_tokens,image_input_tokens,image_output_tokens,total_tokens,estimated_cost_usd,openai_generation_duration_ms,total_visualization_duration_ms,entrance_stage_duration_ms`, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } })
  assert.equal(storedResponse.status, 200)
  const stored = await storedResponse.json() as Array<{ environment: string; text_input_tokens: number; image_input_tokens: number; image_output_tokens: number; total_tokens: number; estimated_cost_usd: number; openai_generation_duration_ms: number; total_visualization_duration_ms: number; entrance_stage_duration_ms: number }>
  assert.equal(stored.length, 1)
  assert.equal(stored[0].environment, 'development')
  assert.ok(Math.abs(stored[0].total_visualization_duration_ms - stopwatchDurationMs) < 1_500)
  assert.ok(Math.abs(stored[0].entrance_stage_duration_ms - entranceStageDurationMs) < 1_500)
  const detectionResponse = await fetch(`${supabaseUrl}/rest/v1/ai_entrance_detection_usage?workflow_request_id=eq.${detectionBody.request_id}&select=pass_type,input_tokens,cached_input_tokens,output_tokens,reasoning_tokens,total_tokens,estimated_cost_usd,detection_duration_ms&order=created_at.asc`, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } })
  assert.equal(detectionResponse.status, 200)
  const detectionRows = await detectionResponse.json() as Array<{ pass_type: string; input_tokens: number; cached_input_tokens: number; output_tokens: number; reasoning_tokens: number; total_tokens: number; estimated_cost_usd: number; detection_duration_ms: number }>
  assert.ok(detectionRows.length >= 1)
  const detectionTotalTokens = detectionRows.reduce((sum, row) => sum + row.total_tokens, 0)
  const detectionCost = detectionRows.reduce((sum, row) => sum + Number(row.estimated_cost_usd), 0)
  console.log(JSON.stringify({ ok: true, request_id: responseBody.request_id, detection_workflow_request_id: detectionBody.request_id, entrance_detection_occurred: true, compatibility: compatibility.status, entrance_detection_stopwatch_ms: entranceDetectionDurationMs, entrance_stage_stopwatch_ms: entranceStageDurationMs, stopwatch_duration_ms: stopwatchDurationMs, detection_calls: detectionRows, detection_total_tokens: detectionTotalTokens, detection_estimated_cost_usd: detectionCost, sunburst: stored[0], combined_total_tokens: detectionTotalTokens + stored[0].total_tokens, combined_estimated_cost_usd: detectionCost + Number(stored[0].estimated_cost_usd) }))
}
