import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { AI_MAX_REQUEST_BYTES, AiInputError, objectValue, prepareHouseAndMask } from '../server/aiDoorVisualization.js'
import type { EntranceDetection } from '../src/features/home-visualizer/entranceFitStrategy.js'

type ApiRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }
const DETECTION_MODEL = process.env.OPENAI_ENTRANCE_DETECTION_MODEL || 'gpt-4o-mini'
const SIDE_CONFIDENCE_THRESHOLD = .78

const regionSchema = {
  type: ['object', 'null'], additionalProperties: false,
  properties: { x: { type: 'number', minimum: 0, maximum: 1 }, y: { type: 'number', minimum: 0, maximum: 1 }, width: { type: 'number', minimum: 0, maximum: 1 }, height: { type: 'number', minimum: 0, maximum: 1 } },
  required: ['x', 'y', 'width', 'height'],
} as const
const sideSchema = {
  type: 'object', additionalProperties: false,
  properties: { present: { type: 'boolean' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, evidence: { type: 'string', maxLength: 240 }, region: regionSchema },
  required: ['present', 'confidence', 'evidence', 'region'],
} as const

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    doorStructure: { type: 'string', enum: ['single', 'double', 'unknown'] },
    leftSidelitePresent: { type: 'boolean' },
    rightSidelitePresent: { type: 'boolean' },
    leftSidelite: sideSchema,
    rightSidelite: sideSchema,
    transom: { type: ['boolean', 'null'] },
    mainDoorRegion: regionSchema,
    transomRegion: regionSchema,
    widthClass: { type: 'string', enum: ['narrow', 'standard', 'wide', 'unknown'] },
    approximateWidthRatio: { type: ['number', 'null'], minimum: 0, maximum: 1 },
    structurallyWide: { type: 'boolean' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string', maxLength: 240 },
  },
  required: ['doorStructure', 'leftSidelitePresent', 'rightSidelitePresent', 'leftSidelite', 'rightSidelite', 'transom', 'mainDoorRegion', 'transomRegion', 'widthClass', 'approximateWidthRatio', 'structurallyWide', 'confidence', 'summary'],
} as const

export type ModelDetection = Omit<EntranceDetection, 'sidelites'>

export const entranceDetectionInstructions = `Analyze only the main exterior entrance, viewed from outside.
Identify one versus two main door slabs and evaluate the LEFT and RIGHT sides independently.
A sidelite counts only when it is a separate narrow vertical glazed panel beside and outside the main door slab, independently framed as part of the entrance system.
Do NOT count glass inside a door slab, divided-light or grid sections inside a door, door-frame trim, dark jamb/frame areas, reflections, nearby windows, plants, shadows, or decorative glazing within the door itself as sidelites.
First locate the main door bounding region. Then inspect immediately outside its left and right slab edges for separately framed vertical panels. Return separate present, confidence, concise visual evidence, and normalized region for each side. A present sidelite must have a region outside and beside mainDoorRegion; otherwise mark it absent.
Identify a transom only when it is a separately framed glazed panel directly above the entrance system. Return normalized regions where visually reliable, otherwise null.
approximateWidthRatio is the entire entrance-system width divided by full photo width. Use unknown/null when not visually reliable. Do not infer symmetry: one real left sidelite does not imply a right sidelite.`

export function deriveSidelites(left: boolean, right: boolean): EntranceDetection['sidelites'] {
  return left && right ? 'both' : left ? 'left' : right ? 'right' : 'none'
}

export function normalizeEntranceDetection(modelDetection: ModelDetection): EntranceDetection {
  const leftSidelitePresent = modelDetection.leftSidelite.present
  const rightSidelitePresent = modelDetection.rightSidelite.present
  return { ...modelDetection, leftSidelitePresent, rightSidelitePresent, sidelites: deriveSidelites(leftSidelitePresent, rightSidelitePresent) }
}

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

async function analyzeEntrance(apiKey: string, image: Buffer, instructions: string) {
  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: DETECTION_MODEL, store: false,
      input: [{ role: 'user', content: [
        { type: 'input_text', text: instructions },
        { type: 'input_image', image_url: `data:image/webp;base64,${image.toString('base64')}`, detail: 'high' },
      ] }],
      text: { format: { type: 'json_schema', name: 'entrance_structure', strict: true, schema } },
    }),
  })
  const result = await upstream.json().catch(() => null) as Record<string, unknown> | null
  if (!upstream.ok || !result) throw new AiInputError('OPENAI_REQUEST_REJECTED', 'We could not analyze this entrance. Retry or choose the fit manually.', upstream.status === 429 ? 429 : 502)
  return JSON.parse(outputText(result)) as ModelDetection
}

async function entranceCrop(photo: Buffer, detection: ModelDetection) {
  const metadata = await sharp(photo).metadata()
  if (!metadata.width || !metadata.height) return null
  const regions = [detection.mainDoorRegion, detection.leftSidelite.region, detection.rightSidelite.region, detection.transomRegion].filter((region): region is NonNullable<typeof region> => Boolean(region))
  if (!regions.length) return null
  const x1 = Math.max(0, Math.min(...regions.map(region => region.x)) - .08)
  const y1 = Math.max(0, Math.min(...regions.map(region => region.y)) - .08)
  const x2 = Math.min(1, Math.max(...regions.map(region => region.x + region.width)) + .08)
  const y2 = Math.min(1, Math.max(...regions.map(region => region.y + region.height)) + .08)
  const left = Math.floor(x1 * metadata.width), top = Math.floor(y1 * metadata.height)
  const width = Math.max(1, Math.ceil(x2 * metadata.width) - left), height = Math.max(1, Math.ceil(y2 * metadata.height) - top)
  return sharp(photo).extract({ left, top, width: Math.min(width, metadata.width - left), height: Math.min(height, metadata.height - top) }).webp({ quality: 92, effort: 4 }).toBuffer()
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
    let modelDetection = await analyzeEntrance(apiKey, prepared.photo, entranceDetectionInstructions)
    const asymmetric = modelDetection.leftSidelite.present !== modelDetection.rightSidelite.present
    const uncertainSides = modelDetection.leftSidelite.confidence < SIDE_CONFIDENCE_THRESHOLD || modelDetection.rightSidelite.confidence < SIDE_CONFIDENCE_THRESHOLD
    let verificationPass = false
    if (asymmetric || uncertainSides) {
      const crop = await entranceCrop(prepared.photo, modelDetection)
      if (crop) {
        verificationPass = true
        const verified = await analyzeEntrance(apiKey, crop, `${entranceDetectionInstructions}\nThis is a tighter crop from a first-pass analysis. Perform an independent verification. Pay special attention to false symmetry and confirm each side only from visible separate framing outside the slab.`)
        modelDetection = {
          ...modelDetection,
          leftSidelitePresent: verified.leftSidelite.present,
          rightSidelitePresent: verified.rightSidelite.present,
          leftSidelite: { ...verified.leftSidelite, region: modelDetection.leftSidelite.region },
          rightSidelite: { ...verified.rightSidelite, region: modelDetection.rightSidelite.region },
          confidence: Math.min(modelDetection.confidence, verified.confidence),
          summary: verified.summary,
        }
      }
    }
    openAiDurationMs = Math.round(performance.now() - openAiStartedAt)
    const detection = normalizeEntranceDetection(modelDetection)
    console.info('[ai-entrance-detection:success]', { request_id: requestId, model: DETECTION_MODEL, normalized_image: prepared.normalized, verification_pass: verificationPass, detection, confidence: detection.confidence, durations_ms: { preprocessing: preprocessingDurationMs, openai: openAiDurationMs, total: Math.round(performance.now() - totalStartedAt) } })
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
