import assert from 'node:assert/strict'
import sharp from 'sharp'
import handler from '../api/generate-door-visualization'
import completeHandler from '../api/complete-ai-visualization'
import { aiTestConfiguration } from './aiVisualizerFixture'

for (const name of ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`${name} is required for the live AI usage acceptance test.`)
}

const houseSvg = Buffer.from(`
  <svg width="1536" height="1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1536" height="1024" fill="#b8d4e8"/>
    <rect y="430" width="1536" height="594" fill="#d6cfbd"/>
    <polygon points="80,430 768,80 1456,430" fill="#4a4a4a"/>
    <rect x="590" y="430" width="356" height="594" fill="#f0ece2"/>
    <rect x="650" y="500" width="236" height="524" fill="#714b32"/>
    <circle cx="840" cy="770" r="12" fill="#d2ad55"/>
    <rect x="180" y="560" width="260" height="220" fill="#8fb4c8" stroke="#f7f4ec" stroke-width="26"/>
    <rect x="1096" y="560" width="260" height="220" fill="#8fb4c8" stroke="#f7f4ec" stroke-width="26"/>
    <rect y="940" width="1536" height="84" fill="#617b43"/>
  </svg>
`)
const house = await sharp(houseSvg).jpeg({ quality: 92 }).toBuffer()
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
let responseBody: { image?: string; request_id?: string; completion_token?: string; error_code?: string; user_message?: string } = {}
await handler({
  method: 'POST',
  body: {
    photo: `data:image/jpeg;base64,${house.toString('base64')}`,
    productReference: `data:image/png;base64,${product.toString('base64')}`,
    configuration: aiTestConfiguration,
    uploadMetadata: { mimeType: 'image/jpeg', format: 'jpeg', byteSize: house.length, width: 1536, height: 1024 },
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
  await completeHandler({ method: 'POST', body: { request_id: responseBody.request_id, completion_token: responseBody.completion_token, total_visualization_duration_ms: stopwatchDurationMs } }, {
    status(code) { completionStatus = code; return this },
    json() {}, setHeader() {},
  })
  assert.equal(completionStatus, 200)
  const supabaseUrl = process.env.SUPABASE_URL!.replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const storedResponse = await fetch(`${supabaseUrl}/rest/v1/ai_generation_usage?request_id=eq.${responseBody.request_id}&select=environment,openai_generation_duration_ms,total_visualization_duration_ms`, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } })
  assert.equal(storedResponse.status, 200)
  const stored = await storedResponse.json() as Array<{ environment: string; openai_generation_duration_ms: number; total_visualization_duration_ms: number }>
  assert.equal(stored.length, 1)
  assert.equal(stored[0].environment, 'development')
  assert.ok(Math.abs(stored[0].total_visualization_duration_ms - stopwatchDurationMs) < 1_500)
  console.log(JSON.stringify({ ok: true, request_id: responseBody.request_id, stopwatch_duration_ms: stopwatchDurationMs, ...stored[0] }))
}
