import { randomUUID } from 'node:crypto'
import { AI_MAX_REQUEST_BYTES, AiInputError, objectValue, prepareHouseAndMask } from '../server/aiDoorVisualization.js'
import type { EntranceDetection } from '../src/features/home-visualizer/entranceFitStrategy.js'

type ApiRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }
const DETECTION_MODEL = process.env.OPENAI_ENTRANCE_DETECTION_MODEL || 'gpt-4o-mini'

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
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: DETECTION_MODEL, store: false,
        input: [{ role: 'user', content: [
          { type: 'input_text', text: 'Analyze only the main exterior entrance. Identify whether it has one or two door slabs, sidelites immediately beside the door (left/right from exterior view), a transom directly above, and whether the overall entrance composition is structurally wide. approximateWidthRatio is the entrance composition width divided by full photo width. Use unknown/null when not visually reliable. Do not confuse nearby windows with sidelites.' },
          { type: 'input_image', image_url: `data:image/webp;base64,${prepared.photo.toString('base64')}`, detail: 'high' },
        ] }],
        text: { format: { type: 'json_schema', name: 'entrance_structure', strict: true, schema } },
      }),
    })
    openAiDurationMs = Math.round(performance.now() - openAiStartedAt)
    const result = await upstream.json().catch(() => null) as Record<string, unknown> | null
    if (!upstream.ok || !result) throw new AiInputError('OPENAI_REQUEST_REJECTED', 'We could not analyze this entrance. Retry or choose the fit manually.', upstream.status === 429 ? 429 : 502)
    const detection = JSON.parse(outputText(result)) as EntranceDetection
    console.info('[ai-entrance-detection:success]', { request_id: requestId, model: DETECTION_MODEL, normalized_image: prepared.normalized, detection, confidence: detection.confidence, durations_ms: { preprocessing: preprocessingDurationMs, openai: openAiDurationMs, total: Math.round(performance.now() - totalStartedAt) } })
    response.status(200).json({ detection, request_id: requestId })
  } catch (error) {
    if (!preprocessingDurationMs && preprocessingStartedAt) preprocessingDurationMs = Math.round(performance.now() - preprocessingStartedAt)
    if (!openAiDurationMs && openAiStartedAt) openAiDurationMs = Math.round(performance.now() - openAiStartedAt)
    const status = error instanceof AiInputError ? error.status : error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 504 : 500
    const errorCode = error instanceof AiInputError ? error.code : status === 504 ? 'AI_GENERATION_TIMEOUT' : 'UNKNOWN_ERROR'
    const message = error instanceof AiInputError ? error.message : status === 504 ? 'Entrance detection took too long. Retry or choose the fit manually.' : 'We could not detect the entrance. Retry or choose the fit manually.'
    console.error('[ai-entrance-detection:failure]', { request_id: requestId, model: DETECTION_MODEL, error_code: errorCode, normalized_image: normalizedImage, durations_ms: { preprocessing: preprocessingDurationMs, openai: openAiDurationMs, total: Math.round(performance.now() - totalStartedAt) }, technical_error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error) })
    response.status(status).json({ error_code: errorCode, user_message: message, request_id: requestId })
  }
}
