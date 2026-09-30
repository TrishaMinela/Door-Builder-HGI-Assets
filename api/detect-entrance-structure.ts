import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { AI_MAX_REQUEST_BYTES, AiInputError, objectValue, prepareHouseAndMask } from '../server/aiDoorVisualization.js'
import { aiUsageEnvironment, estimateEntranceDetectionCost, normalizeResponseUsage, recordAiEntranceDetectionUsage } from '../server/aiUsage.js'
import type { EntranceDetection } from '../src/features/home-visualizer/entranceFitStrategy.js'

type ApiRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }
export const DETECTION_MODEL = process.env.OPENAI_ENTRANCE_DETECTION_MODEL || 'gpt-5.4-mini'
const SIDE_CONFIDENCE_THRESHOLD = .78
const BOTH_SIDE_CONFIRMATION_THRESHOLD = .86

const boxSchema = {
  type: ['object', 'null'], additionalProperties: false,
  properties: { xMin: { type: 'number', minimum: 0, maximum: 1 }, yMin: { type: 'number', minimum: 0, maximum: 1 }, xMax: { type: 'number', minimum: 0, maximum: 1 }, yMax: { type: 'number', minimum: 0, maximum: 1 }, confidence: { type: 'number', minimum: 0, maximum: 1 } },
  required: ['xMin', 'yMin', 'xMax', 'yMax', 'confidence'],
} as const
const sideSchema = {
  type: 'object', additionalProperties: false,
  properties: { present: { type: 'boolean' }, confidence: { type: 'number', minimum: 0, maximum: 1 }, evidence: { type: 'string', maxLength: 240 }, box: boxSchema },
  required: ['present', 'confidence', 'evidence', 'box'],
} as const

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    doorStructure: { type: 'string', enum: ['single', 'double', 'unknown'] },
    hasLeftSidelite: { type: ['boolean', 'null'] },
    hasRightSidelite: { type: ['boolean', 'null'] },
    leftSidelite: sideSchema,
    rightSidelite: sideSchema,
    hasTransom: { type: ['boolean', 'null'] },
    mainDoor: boxSchema,
    transom: boxSchema,
    widthClass: { type: 'string', enum: ['narrow', 'standard', 'wide', 'unknown'] },
    approximateWidthRatio: { type: ['number', 'null'], minimum: 0, maximum: 1 },
    structurallyWide: { type: 'boolean' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string', maxLength: 240 },
  },
  required: ['doorStructure', 'hasLeftSidelite', 'hasRightSidelite', 'leftSidelite', 'rightSidelite', 'hasTransom', 'mainDoor', 'transom', 'widthClass', 'approximateWidthRatio', 'structurallyWide', 'confidence', 'summary'],
} as const

export type ModelBox = { xMin: number; yMin: number; xMax: number; yMax: number; confidence: number }
export type ModelSide = { present: boolean; confidence: number; evidence: string; box: ModelBox | null }
export type ModelDetection = {
  doorStructure: EntranceDetection['doorStructure']
  hasLeftSidelite: boolean | null
  hasRightSidelite: boolean | null
  leftSidelite: ModelSide
  rightSidelite: ModelSide
  hasTransom: boolean | null
  mainDoor: ModelBox | null
  transom: ModelBox | null
  widthClass: EntranceDetection['widthClass']
  approximateWidthRatio: number | null
  structurallyWide: boolean
  confidence: number
  summary: string
}

export const entranceDetectionInstructions = `Analyze only the main exterior entrance, viewed from outside.
Identify one versus two main door slabs and evaluate the LEFT and RIGHT sides independently.
A sidelite counts only when it is a separate vertical glazed or solid panel beside and OUTSIDE the main door slab, with its own clearly visible frame or boundary, as part of the entrance system.
Do NOT count glass inside a door slab, divided-light or grid sections inside a door, trim, jamb, casing, brick edges, narrow framing lines, dark frame areas, reflections, nearby windows, plants, shadows, or decorative vertical elements as sidelites.
First return mainDoor as normalized xMin/yMin/xMax/yMax coordinates around the ACTUAL MOVABLE DOOR SLAB or two-slab pair—not the full framed entrance. Then answer hasLeftSidelite and hasRightSidelite independently; never infer one side from symmetry. Inspect immediately outside each slab edge for a separately bounded panel. Every claimed side must include its own normalized bounding box. A present sidelite must have a defensible box outside and beside mainDoor and visible independent framing; otherwise return false with box null. Return null only when that side is genuinely not visible enough to decide.
Identify a transom only when it is a separately framed glazed panel directly above the entrance system. Return its normalized box where visually reliable, otherwise null.
approximateWidthRatio is the entire entrance-system width divided by full photo width. Use unknown/null when not visually reliable. Do not infer symmetry: one real left sidelite does not imply a right sidelite.`

export function deriveSidelites(left: boolean, right: boolean): EntranceDetection['sidelites'] {
  return left && right ? 'both' : left ? 'left' : right ? 'right' : 'none'
}

const toRegion = (box: ModelBox | null): EntranceDetection['mainDoorRegion'] => box && box.xMax > box.xMin && box.yMax > box.yMin ? { x: box.xMin, y: box.yMin, width: box.xMax - box.xMin, height: box.yMax - box.yMin } : null

export type SideValidation = { accepted: boolean; reason: string }
export type GeometricValidation = { left: SideValidation; right: SideValidation; sidelites: EntranceDetection['sidelites'] }

function validateCandidate(mainDoor: ModelBox | null, candidate: ModelSide, side: 'left' | 'right'): SideValidation {
  if (!candidate.present) return { accepted: false, reason: 'model marked side absent' }
  if (!mainDoor) return { accepted: false, reason: 'main door slab bounding box is unavailable' }
  if (!candidate.box) return { accepted: false, reason: 'claimed sidelite has no bounding box' }
  const doorWidth = mainDoor.xMax - mainDoor.xMin, doorHeight = mainDoor.yMax - mainDoor.yMin
  const width = candidate.box.xMax - candidate.box.xMin, height = candidate.box.yMax - candidate.box.yMin
  if (doorWidth <= 0 || doorHeight <= 0 || width <= 0 || height <= 0) return { accepted: false, reason: 'invalid bounding-box dimensions' }
  if (width < Math.max(.018, doorWidth * .1)) return { accepted: false, reason: 'region is trim / insufficient width' }
  const centerX = (candidate.box.xMin + candidate.box.xMax) / 2
  const directionalGap = doorWidth * .01
  if (side === 'left' && centerX >= mainDoor.xMin - directionalGap) return { accepted: false, reason: 'region center is not clearly left of the door slab' }
  if (side === 'right' && centerX <= mainDoor.xMax + directionalGap) return { accepted: false, reason: 'region center is not clearly right of the door slab' }
  const outsideWidth = side === 'left' ? Math.max(0, Math.min(candidate.box.xMax, mainDoor.xMin) - candidate.box.xMin) : Math.max(0, candidate.box.xMax - Math.max(candidate.box.xMin, mainDoor.xMax))
  if (outsideWidth / width < .75) return { accepted: false, reason: 'region overlaps too much of the main door slab' }
  const overlapY = Math.max(0, Math.min(candidate.box.yMax, mainDoor.yMax) - Math.max(candidate.box.yMin, mainDoor.yMin))
  if (overlapY / Math.min(height, doorHeight) < .55) return { accepted: false, reason: 'region is not vertically aligned with enough of the door' }
  if (candidate.confidence < .65 || candidate.box.confidence < .65) return { accepted: false, reason: 'candidate or box confidence is too low' }
  return { accepted: true, reason: 'separate meaningful-width region outside slab with substantial vertical alignment' }
}

export function validateSideliteGeometry(modelDetection: ModelDetection): GeometricValidation {
  const left = validateCandidate(modelDetection.mainDoor, modelDetection.leftSidelite, 'left')
  const right = validateCandidate(modelDetection.mainDoor, modelDetection.rightSidelite, 'right')
  return { left, right, sidelites: deriveSidelites(left.accepted, right.accepted) }
}

export function normalizeEntranceDetection(modelDetection: ModelDetection): EntranceDetection {
  const validation = validateSideliteGeometry(modelDetection)
  const leftSidelitePresent = validation.left.accepted
  const rightSidelitePresent = validation.right.accepted
  const sideliteConfidenceLow = modelDetection.hasLeftSidelite === null || modelDetection.hasRightSidelite === null || (modelDetection.leftSidelite.present && !leftSidelitePresent) || (modelDetection.rightSidelite.present && !rightSidelitePresent) || modelDetection.leftSidelite.confidence < SIDE_CONFIDENCE_THRESHOLD || modelDetection.rightSidelite.confidence < SIDE_CONFIDENCE_THRESHOLD
  return {
    doorStructure: modelDetection.doorStructure, leftSidelitePresent, rightSidelitePresent,
    leftSidelite: { present: leftSidelitePresent, confidence: modelDetection.leftSidelite.confidence, evidence: modelDetection.leftSidelite.evidence, region: toRegion(modelDetection.leftSidelite.box) },
    rightSidelite: { present: rightSidelitePresent, confidence: modelDetection.rightSidelite.confidence, evidence: modelDetection.rightSidelite.evidence, region: toRegion(modelDetection.rightSidelite.box) },
    sidelites: validation.sidelites, transom: modelDetection.hasTransom, mainDoorRegion: toRegion(modelDetection.mainDoor), transomRegion: toRegion(modelDetection.transom),
    widthClass: modelDetection.widthClass, approximateWidthRatio: modelDetection.approximateWidthRatio, structurallyWide: modelDetection.structurallyWide, confidence: modelDetection.confidence, summary: modelDetection.summary, sideliteConfidenceLow,
  }
}

export function conservativeVerifiedSidelites(first: ModelDetection, verified: ModelDetection): ModelDetection {
  const verifiedGeometry = validateSideliteGeometry(verified)
  const confirmed = (side: 'leftSidelite' | 'rightSidelite', flag: 'hasLeftSidelite' | 'hasRightSidelite', accepted: boolean) => accepted && verified[flag] === true && verified[side].present && verified[side].confidence >= BOTH_SIDE_CONFIRMATION_THRESHOLD
  let left = confirmed('leftSidelite', 'hasLeftSidelite', verifiedGeometry.left.accepted)
  let right = confirmed('rightSidelite', 'hasRightSidelite', verifiedGeometry.right.accepted)
  if (!left && !right && first.hasLeftSidelite === true && first.hasRightSidelite === true) {
    const candidates = [
      { side: 'left' as const, present: verifiedGeometry.left.accepted, confidence: verified.leftSidelite.confidence },
      { side: 'right' as const, present: verifiedGeometry.right.accepted, confidence: verified.rightSidelite.confidence },
    ].filter(candidate => candidate.present && candidate.confidence >= .65).sort((a, b) => b.confidence - a.confidence)
    if (candidates[0]?.side === 'left') left = true
    if (candidates[0]?.side === 'right') right = true
  }
  return {
    ...first,
    hasLeftSidelite: left,
    hasRightSidelite: right,
    hasTransom: verified.hasTransom,
    leftSidelite: { ...first.leftSidelite, present: left },
    rightSidelite: { ...first.rightSidelite, present: right },
    confidence: Math.min(first.confidence, verified.confidence),
    summary: verified.summary,
  }
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

async function analyzeEntrance(apiKey: string, image: Buffer, instructions: string, workflowRequestId: string, passType: 'primary' | 'verification') {
  const requestId = randomUUID()
  const startedAt = performance.now()
  let upstream: Response
  let result: Record<string, unknown> | null = null
  try {
    upstream = await fetch('https://api.openai.com/v1/responses', {
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
    result = await upstream.json().catch(() => null) as Record<string, unknown> | null
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt)
    const usage = normalizeResponseUsage(null)
    await recordAiEntranceDetectionUsage({ completedAt: new Date().toISOString(), status: 'failed', environment: aiUsageEnvironment(), model: DETECTION_MODEL, passType, usage, estimatedCostUsd: null, detectionDurationMs: durationMs, requestId, workflowRequestId, errorCode: error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 'AI_GENERATION_TIMEOUT' : 'OPENAI_REQUEST_REJECTED' })
    throw error
  }
  const durationMs = Math.round(performance.now() - startedAt)
  const usage = normalizeResponseUsage(result?.usage)
  const estimatedCostUsd = estimateEntranceDetectionCost(DETECTION_MODEL, usage)
  const upstreamRequestId = upstream.headers.get('x-request-id') ?? undefined
  if (!upstream.ok || !result) {
    const errorCode = upstream.status === 429 ? 'OPENAI_RATE_LIMITED' : 'OPENAI_REQUEST_REJECTED'
    await recordAiEntranceDetectionUsage({ completedAt: new Date().toISOString(), status: 'failed', environment: aiUsageEnvironment(), model: DETECTION_MODEL, passType, usage, estimatedCostUsd, detectionDurationMs: durationMs, requestId, workflowRequestId, errorCode })
    throw new AiInputError('OPENAI_REQUEST_REJECTED', 'We could not analyze this entrance. Retry or choose the fit manually.', upstream.status === 429 ? 429 : 502)
  }
  let detection: ModelDetection
  try {
    detection = JSON.parse(outputText(result)) as ModelDetection
  } catch {
    await recordAiEntranceDetectionUsage({ completedAt: new Date().toISOString(), status: 'failed', environment: aiUsageEnvironment(), model: DETECTION_MODEL, passType, usage, estimatedCostUsd, detectionDurationMs: durationMs, requestId, workflowRequestId, errorCode: 'INVALID_MODEL_RESPONSE' })
    throw new AiInputError('OPENAI_REQUEST_REJECTED', 'We could not analyze this entrance. Retry or choose the fit manually.', 502)
  }
  await recordAiEntranceDetectionUsage({ completedAt: new Date().toISOString(), status: 'succeeded', environment: aiUsageEnvironment(), model: DETECTION_MODEL, passType, usage, estimatedCostUsd, detectionDurationMs: durationMs, requestId, workflowRequestId, errorCode: null })
  console.info('[ai-entrance-detection:model-call]', { request_id: requestId, workflow_request_id: workflowRequestId, openai_request_id: upstreamRequestId, pass_type: passType, model: DETECTION_MODEL, usage, estimated_cost_usd: estimatedCostUsd, duration_ms: durationMs })
  return detection
}

async function entranceCrop(photo: Buffer, detection: ModelDetection) {
  const metadata = await sharp(photo).metadata()
  if (!metadata.width || !metadata.height) return null
  if (!detection.mainDoor) return null
  const doorWidth = detection.mainDoor.xMax - detection.mainDoor.xMin
  const verticalBoxes = [detection.mainDoor, detection.transom].filter((box): box is ModelBox => Boolean(box))
  const x1 = Math.max(0, detection.mainDoor.xMin - doorWidth * .75 - .03)
  const y1 = Math.max(0, Math.min(...verticalBoxes.map(box => box.yMin)) - .06)
  const x2 = Math.min(1, detection.mainDoor.xMax + doorWidth * .75 + .03)
  const y2 = Math.min(1, Math.max(...verticalBoxes.map(box => box.yMax)) + .06)
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
    let modelDetection = await analyzeEntrance(apiKey, prepared.photo, entranceDetectionInstructions, requestId, 'primary')
    const rawValidation = validateSideliteGeometry(modelDetection)
    const bothDetected = modelDetection.hasLeftSidelite === true && modelDetection.hasRightSidelite === true
    const asymmetric = modelDetection.hasLeftSidelite !== modelDetection.hasRightSidelite
    const uncertainSides = modelDetection.leftSidelite.confidence < SIDE_CONFIDENCE_THRESHOLD || modelDetection.rightSidelite.confidence < SIDE_CONFIDENCE_THRESHOLD
    let verificationPass = false
    if (bothDetected || asymmetric || uncertainSides || modelDetection.hasLeftSidelite === null || modelDetection.hasRightSidelite === null) {
      const crop = await entranceCrop(prepared.photo, modelDetection)
      verificationPass = true
      const verified = await analyzeEntrance(apiKey, crop ?? prepared.photo, `${entranceDetectionInstructions}\nThis is an independent confirmation pass focused on the entrance. Answer these separately from visible evidence: (1) Is there a separate, independently framed sidelite OUTSIDE the left edge of the main door slab? (2) Is there a separate, independently framed sidelite OUTSIDE the right edge? Glass within the slab, trim, jamb, casing, brick edges, reflections, shadows, and narrow framing lines are NO. Both is valid only when both separate panels are clearly visible with high confidence. When uncertain between one and both, report only the evidenced one-sided result.`, requestId, 'verification')
      modelDetection = conservativeVerifiedSidelites(modelDetection, verified)
    }
    openAiDurationMs = Math.round(performance.now() - openAiStartedAt)
    const detection = normalizeEntranceDetection(modelDetection)
    const finalValidation = validateSideliteGeometry(modelDetection)
    console.info('[ai-entrance-detection:success]', { request_id: requestId, model: DETECTION_MODEL, normalized_image: prepared.normalized, verification_pass: verificationPass, raw: { mainDoor: modelDetection.mainDoor, hasLeftSidelite: modelDetection.hasLeftSidelite, leftRegion: modelDetection.leftSidelite.box, leftConfidence: modelDetection.leftSidelite.confidence, hasRightSidelite: modelDetection.hasRightSidelite, rightRegion: modelDetection.rightSidelite.box, rightConfidence: modelDetection.rightSidelite.confidence, hasTransom: modelDetection.hasTransom, confidence: modelDetection.confidence, summary: modelDetection.summary }, initial_validation: rawValidation, final_validation: finalValidation, final: detection.sidelites, durations_ms: { preprocessing: preprocessingDurationMs, openai: openAiDurationMs, total: Math.round(performance.now() - totalStartedAt) } })
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
