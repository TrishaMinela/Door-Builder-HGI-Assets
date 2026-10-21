import { randomUUID } from 'node:crypto'
import { AI_MAX_REQUEST_BYTES, AiInputError, objectValue, prepareHouseAndMask } from '../server/aiImagePreprocessing.js'
import { aiUsageEnvironment, estimateEntranceDetectionCost, normalizeResponseUsage, recordAiEntranceDetectionUsage } from '../server/aiUsage.js'
import type { EntranceDetection } from '../src/features/home-visualizer/entranceFitStrategy.js'

type ApiRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }
const DETECTION_MODEL = process.env.OPENAI_ENTRANCE_DETECTION_MODEL || 'gpt-5.4-mini'

// Never echo upstream free text: even an error can contain a credential,
// reflected image data, or customer content. Emit known categories only.
const safeErrorTypes = new Set(['invalid_request_error', 'authentication_error', 'permission_error', 'rate_limit_error', 'server_error', 'insufficient_quota'])
const safeErrorCodes = new Set(['invalid_api_key', 'token_invalidated', 'account_deactivated', 'organization_deactivated', 'insufficient_quota', 'rate_limit_exceeded', 'model_not_found', 'permission_denied', 'invalid_request_error', 'invalid_json_schema', 'unsupported_parameter', 'invalid_value', 'missing_required_parameter', 'unsupported_value', 'billing_hard_limit_reached', 'unsupported_country_region_territory', 'invalid_project', 'project_not_found'])
function safeCategory(value: unknown, allowed: Set<string>) {
  return typeof value === 'string' ? allowed.has(value) ? value : '[unrecognized]' : null
}
function safeUpstreamMessage(status: number, code: string | null) {
  if (code === 'invalid_api_key' || code === 'token_invalidated' || status === 401) return 'Upstream authentication rejected; credential details omitted.'
  if (code === 'insufficient_quota' || code === 'billing_hard_limit_reached') return 'Upstream quota or billing limit rejected the request.'
  if (code === 'model_not_found') return 'Upstream model was not found or is not accessible.'
  if (status === 403) return 'Upstream access denied; account/project details omitted.'
  if (status === 429) return 'Upstream rate or usage limit rejected the request.'
  return 'Upstream rejected the request; free-text error message omitted.'
}

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    doorStructure: { type: 'string', enum: ['single', 'double', 'unknown'] },
    sidelites: { type: 'string', enum: ['none', 'left', 'right', 'both', 'unknown'] },
    transom: { type: ['boolean', 'null'] },
    widthClass: { type: 'string', enum: ['narrow', 'standard', 'wide', 'unknown'] },
    approximateWidthRatio: { type: ['number', 'null'], minimum: 0, maximum: 1 },
    structurallyWide: { type: 'boolean' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string', maxLength: 240 },
  },
  required: ['doorStructure', 'sidelites', 'transom', 'widthClass', 'approximateWidthRatio', 'structurallyWide', 'confidence', 'summary'],
} as const

function outputText(result: Record<string, unknown>) {
  const output = Array.isArray(result.output) ? result.output : []
  for (const item of output) {
    const contents = objectValue(item)?.content
    if (!Array.isArray(contents)) continue
    for (const content of contents) {
      const text = objectValue(content)?.text
      if (typeof text === 'string') return text
    }
  }
  return ''
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const totalStartedAt = performance.now()
  let preprocessingDurationMs = 0
  let preprocessingStartedAt = 0
  let openAiDurationMs = 0
  let openAiStartedAt = 0
  let normalizedImage: unknown = null
  const requestId = randomUUID()
  const modelRequestId = randomUUID()
  response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Request-Id', requestId)
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); response.status(405).json({ error_code: 'INVALID_REQUEST', user_message: 'Method not allowed.', request_id: requestId }); return }
  try {
    const serialized = typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? null)
    if (Buffer.byteLength(serialized) > AI_MAX_REQUEST_BYTES) throw new AiInputError('PAYLOAD_TOO_LARGE', 'The entrance photo is too large to analyze.', 413)
    const source = objectValue(JSON.parse(serialized))
    if (!source) throw new AiInputError('INVALID_REQUEST', 'The entrance detection request is invalid.')
    preprocessingStartedAt = performance.now()
    const prepared = await prepareHouseAndMask(source.photo, null)
    preprocessingDurationMs = Math.round(performance.now() - preprocessingStartedAt)
    normalizedImage = prepared.normalized
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new AiInputError('SERVER_CONFIGURATION_ERROR', 'Entrance detection is temporarily unavailable. You can choose the fit manually.', 503)
    openAiStartedAt = performance.now()
    let upstream: Response
    try {
      upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: DETECTION_MODEL, store: false,
        input: [{ role: 'user', content: [
          { type: 'input_text', text: 'Analyze only the main exterior entrance. Identify whether it has one or two door slabs, sidelites immediately beside the door (left/right from exterior view), a transom directly above, and whether the overall entrance composition is structurally wide. approximateWidthRatio is the entrance composition width divided by full photo width. Use unknown/null when not visually reliable. A sidelite must belong to the SAME PHYSICAL ENTRANCE ASSEMBLY as the door, not merely be tall, narrow, glazed, or nearby. Count a panel only when visual evidence shows that it directly adjoins the door or entrance mullion, shares the entrance frame/head jamb, begins and ends approximately with that assembly, and is structurally integrated into the door opening with little or no intervening wall or siding. Independently inspect each side for physical attachment; do not infer a second sidelite from symmetry. Do NOT count separate house windows with their own window frames or with wall, siding, independent casing, or a structural gap separating them from the door jamb. Windows in a larger wall/window grouping, outside the entrance frame, or with clearly different top/bottom alignment are not sidelites. Shared decorative exterior trim alone does not prove a shared entrance assembly. Do not count glass inside the door slab as a sidelite. If both nearby windows are independent of the entrance, return sidelites: none even if they flank the door. Do not use a rigid pixel-distance rule. Use unknown when physical attachment cannot be established reliably.' },
          { type: 'input_image', image_url: `data:image/webp;base64,${prepared.photo.toString('base64')}`, detail: 'high' },
        ] }],
        text: { format: { type: 'json_schema', name: 'entrance_structure', strict: true, schema } },
      }),
      })
    } catch (error) {
      openAiDurationMs = Math.round(performance.now() - openAiStartedAt)
      const usage = normalizeResponseUsage(null)
      await recordAiEntranceDetectionUsage({ completedAt: new Date().toISOString(), status: 'failed', environment: aiUsageEnvironment(), model: DETECTION_MODEL, passType: 'primary', usage, estimatedCostUsd: null, detectionDurationMs: openAiDurationMs, requestId: modelRequestId, providerRequestId: null, workflowRequestId: requestId, errorCode: error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 'AI_GENERATION_TIMEOUT' : 'OPENAI_REQUEST_REJECTED' })
      throw error
    }
    openAiDurationMs = Math.round(performance.now() - openAiStartedAt)
    // Only the response's known request-ID header is eligible for logging.
    const rawUpstreamId = upstream.headers.get('x-request-id')
    const upstreamRequestId = rawUpstreamId && /^req_[a-zA-Z0-9_-]{1,120}$/.test(rawUpstreamId) ? rawUpstreamId : null
    let jsonValid = true
    const result = await upstream.json().catch(() => { jsonValid = false; return null }) as unknown
    const resultObject = objectValue(result)
    const usage = normalizeResponseUsage(resultObject?.usage)
    const estimatedCostUsd = estimateEntranceDetectionCost(DETECTION_MODEL, usage)
    const logUpstreamFailure = (stage: 'http_error' | 'invalid_json_response' | 'invalid_response_shape' | 'invalid_detection_json') => {
      const error = objectValue(resultObject?.error)
      const code = safeCategory(error?.code, safeErrorCodes)
      console.error('[ai-entrance-detection:upstream-failure]', {
        request_id: requestId, openai_request_id: upstreamRequestId,
        upstream_status: upstream.status, stage, response_json_valid: jsonValid,
        error_type: safeCategory(error?.type, safeErrorTypes), error_code: code,
        message: stage === 'http_error' ? safeUpstreamMessage(upstream.status, code) : 'Upstream returned an unusable detection response; response content omitted.',
      })
    }
    if (!upstream.ok || !result) {
      logUpstreamFailure(!upstream.ok ? 'http_error' : !jsonValid ? 'invalid_json_response' : 'invalid_response_shape')
      await recordAiEntranceDetectionUsage({ completedAt: new Date().toISOString(), status: 'failed', environment: aiUsageEnvironment(), model: DETECTION_MODEL, passType: 'primary', usage, estimatedCostUsd, detectionDurationMs: openAiDurationMs, requestId: modelRequestId, providerRequestId: upstreamRequestId, workflowRequestId: requestId, errorCode: upstream.status === 429 ? 'OPENAI_RATE_LIMITED' : 'OPENAI_REQUEST_REJECTED' })
      throw new AiInputError('OPENAI_REQUEST_REJECTED', 'We could not analyze this entrance. Retry or choose the fit manually.', upstream.status === 429 ? 429 : 502)
    }
    if (!resultObject) logUpstreamFailure('invalid_response_shape')
    let detection: EntranceDetection
    try { detection = JSON.parse(outputText(result as Record<string, unknown>)) as EntranceDetection }
    catch (error) {
      logUpstreamFailure('invalid_detection_json')
      await recordAiEntranceDetectionUsage({ completedAt: new Date().toISOString(), status: 'failed', environment: aiUsageEnvironment(), model: DETECTION_MODEL, passType: 'primary', usage, estimatedCostUsd, detectionDurationMs: openAiDurationMs, requestId: modelRequestId, providerRequestId: upstreamRequestId, workflowRequestId: requestId, errorCode: 'INVALID_MODEL_RESPONSE' })
      throw error
    }
    await recordAiEntranceDetectionUsage({ completedAt: new Date().toISOString(), status: 'succeeded', environment: aiUsageEnvironment(), model: DETECTION_MODEL, passType: 'primary', usage, estimatedCostUsd, detectionDurationMs: openAiDurationMs, requestId: modelRequestId, providerRequestId: upstreamRequestId, workflowRequestId: requestId, errorCode: null })
    console.info('[ai-entrance-detection:success]', { request_id: requestId, model: DETECTION_MODEL, normalized_image: prepared.normalized, confidence: typeof detection.confidence === 'number' && Number.isFinite(detection.confidence) ? detection.confidence : null, durations_ms: { preprocessing: preprocessingDurationMs, openai: openAiDurationMs, total: Math.round(performance.now() - totalStartedAt) } })
    response.status(200).json({ detection, request_id: requestId })
  } catch (error) {
    if (!preprocessingDurationMs && preprocessingStartedAt) preprocessingDurationMs = Math.round(performance.now() - preprocessingStartedAt)
    if (!openAiDurationMs && openAiStartedAt) openAiDurationMs = Math.round(performance.now() - openAiStartedAt)
    const status = error instanceof AiInputError ? error.status : error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 504 : 500
    const errorCode = error instanceof AiInputError ? error.code : status === 504 ? 'AI_GENERATION_TIMEOUT' : 'UNKNOWN_ERROR'
    const message = error instanceof AiInputError ? error.message : status === 504 ? 'Entrance detection took too long. Retry or choose the fit manually.' : 'We could not detect the entrance. Retry or choose the fit manually.'
    // Native parse/fetch errors may quote response text. Do not log their raw
    // message, stack or cause; known input errors contain our static messages.
    console.error('[ai-entrance-detection:failure]', { request_id: requestId, model: DETECTION_MODEL, error_code: errorCode, normalized_image: normalizedImage, durations_ms: { preprocessing: preprocessingDurationMs, openai: openAiDurationMs, total: Math.round(performance.now() - totalStartedAt) }, technical_error: { name: error instanceof AiInputError ? 'AiInputError' : status === 504 ? 'TimeoutError' : 'Error', message: error instanceof AiInputError ? error.message : 'Detection did not complete; technical content omitted.' } })
    response.status(status).json({ error_code: errorCode, user_message: message, request_id: requestId })
  }
}
