import { createHash, randomUUID } from 'node:crypto'
import { AI_MAX_REQUEST_BYTES, AI_MODEL, AI_QUALITY, AiGenerationError, AiInputError, aiPrompt, entranceFitContext, loadAiReference, objectValue, optionalCorners, prepareConfiguredProductReferences, prepareHouseAndMask, resolveAiProduct, type AiErrorCode } from '../server/aiDoorVisualization.js'

type ApiRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }
type OpenAiResult = { data?: Array<{ b64_json?: string }>; error?: { code?: string; type?: string; message?: string } }
const inFlight = new Map<string, Promise<string>>()
const OPENAI_TIMEOUT_MS = 140_000
const SERVERLESS_BUDGET_MS = 165_000

const safeFailure = (errorCode: AiErrorCode, userMessage: string, requestId: string) => ({ error_code: errorCode, user_message: userMessage, request_id: requestId })

function technicalError(error: unknown) {
  if (!(error instanceof Error)) return { value: String(error) }
  const cause = error.cause instanceof Error ? { name: error.cause.name, message: error.cause.message, stack: error.cause.stack } : error.cause ? { value: String(error.cause) } : undefined
  return { name: error.name, message: error.message, stack: error.stack, cause }
}

function uploadMetadata(value: unknown) {
  const source = objectValue(value)
  if (!source) return undefined
  const mimeType = typeof source.mimeType === 'string' && /^image\/[a-z0-9.+-]{1,32}$/i.test(source.mimeType) ? source.mimeType : undefined
  const format = typeof source.format === 'string' && /^(jpeg|png|webp|avif|heif|unknown)$/.test(source.format) ? source.format : undefined
  const byteSize = typeof source.byteSize === 'number' && Number.isFinite(source.byteSize) && source.byteSize >= 0 ? Math.round(source.byteSize) : undefined
  const width = typeof source.width === 'number' && Number.isFinite(source.width) && source.width > 0 ? Math.round(source.width) : undefined
  const height = typeof source.height === 'number' && Number.isFinite(source.height) && source.height > 0 ? Math.round(source.height) : undefined
  return { mimeType, format, byteSize, width, height }
}

function originalImageDiagnostic(value: unknown, decoded: { declaredMimeType: string; format: string; width: number; height: number; orientation: number; byteSize: number }) {
  const browser = uploadMetadata(value)
  return {
    format: browser?.format && browser.format !== 'unknown' ? browser.format : decoded.format,
    width: browser?.width ?? decoded.width,
    height: browser?.height ?? decoded.height,
    byteSize: browser?.byteSize ?? decoded.byteSize,
    orientation: decoded.orientation,
    declaredMimeType: browser?.mimeType ?? decoded.declaredMimeType,
    serverDecodedWorkingFormat: decoded.format,
  }
}

function withServerlessDeadline<T>(operation: Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AiGenerationError('SERVERLESS_TIMEOUT', 'The server ran out of time while creating the visualization.', 504)), SERVERLESS_BUDGET_MS)
  })
  return Promise.race([operation, deadline]).finally(() => { if (timer) clearTimeout(timer) })
}

async function generate(source: Record<string, unknown>, apiKey: string, requestId: string) {
  const startedAt = Date.now()
  const corners = optionalCorners(source.corners)
  const fitContext = entranceFitContext(source.entranceDetection, source.fitStrategy)
  const product = resolveAiProduct(source.configuration, source.jambFinishId, source.glassFrameFinishId)
  const prepared = await prepareHouseAndMask(source.photo, corners)
  const configuredReferences = source.productReference ? await prepareConfiguredProductReferences(source.productReference) : null
  const intendedReferenceCount = configuredReferences?.length ?? product.references.length
  console.info('[ai-visualizer:image-prepared]', { request_id: requestId, original_image: originalImageDiagnostic(source.uploadMetadata, prepared.original), normalized_ai_input: prepared.normalized, placement_mode: corners ? 'user-corners' : 'automatic', product_reference_mode: configuredReferences ? 'flattened-configured-render' : 'catalog-fallback', product_reference_count: intendedReferenceCount })
  const form = new FormData()
  form.append('model', AI_MODEL)
  form.append('image[]', new Blob([new Uint8Array(prepared.photo)], { type: 'image/webp' }), 'house.webp')
  if (prepared.mask) form.append('mask', new Blob([new Uint8Array(prepared.mask)], { type: 'image/webp' }), 'doorway-mask.webp')
  const labels: string[] = []
  const referenceSizes: number[] = []
  if (configuredReferences) {
    for (const reference of configuredReferences) {
      labels.push(reference.label)
      referenceSizes.push(reference.bytes.length)
      form.append('image[]', new Blob([new Uint8Array(reference.bytes)], { type: 'image/png' }), `reference-${labels.length}.png`)
    }
  } else for (const reference of product.references) {
    try {
      const bytes = await loadAiReference(reference.paths)
      labels.push(reference.label)
      referenceSizes.push(bytes.length)
      form.append('image[]', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), `reference-${labels.length}.png`)
    } catch (error) {
      throw new AiGenerationError('REFERENCE_IMAGE_FAILED', `Product reference failed to load: ${reference.label}`, 500, { cause: error })
    }
  }
  const prompt = aiPrompt(product.snapshot, corners, labels, fitContext)
  form.append('prompt', prompt)
  form.append('n', '1')
  form.append('size', 'auto')
  form.append('quality', AI_QUALITY)
  form.append('output_format', 'jpeg')
  form.append('output_compression', '100')
  const approximateRequestBytes = prepared.photo.length + (prepared.mask?.length ?? 0) + referenceSizes.reduce((sum, size) => sum + size, 0) + Buffer.byteLength(prompt)
  console.info('[ai-visualizer:request]', { request_id: requestId, original_image: originalImageDiagnostic(source.uploadMetadata, prepared.original), normalized_ai_input: prepared.normalized, placement_mode: corners ? 'user-corners' : 'automatic', product_reference_mode: configuredReferences ? 'flattened-configured-render' : 'catalog-fallback', product_reference_count: labels.length, product_reference_bytes: referenceSizes, approximate_request_bytes: approximateRequestBytes })

  let upstream: Response
  try {
    upstream = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) })
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) throw new AiGenerationError('AI_GENERATION_TIMEOUT', 'AI generation took too long. Please try again.', 504, { cause: error })
    throw new AiGenerationError('OPENAI_REQUEST_REJECTED', 'The AI service could not be reached. Please try again.', 502, { cause: error })
  }
  const upstreamRequestId = upstream.headers.get('x-request-id') ?? undefined
  const result = await upstream.json().catch(() => null) as OpenAiResult | null
  const upstreamError = result?.error
  if (!upstream.ok) {
    console.error('[ai-visualizer:openai]', { request_id: requestId, openai_request_id: upstreamRequestId, status: upstream.status, code: upstreamError?.code, type: upstreamError?.type, message: upstreamError?.message, duration_ms: Date.now() - startedAt })
    if (upstream.status === 429) throw new AiGenerationError('OPENAI_RATE_LIMITED', 'AI visualization is busy right now. Please wait a moment and try again.', 429)
    if (upstream.status === 401 || upstream.status === 403) throw new AiGenerationError('SERVER_CONFIGURATION_ERROR', 'AI visualization is temporarily unavailable. Manual mode is still available.', 503)
    throw new AiGenerationError('OPENAI_REQUEST_REJECTED', 'OpenAI could not process this photo. Try another photo or use the doorway locator.', upstream.status >= 500 ? 502 : 422)
  }
  const image = result?.data?.[0]?.b64_json
  if (!image) throw new AiGenerationError('NO_GENERATED_IMAGE', 'The AI service completed without returning an image. Please try again.', 502)
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image)) throw new AiGenerationError('NO_GENERATED_IMAGE', 'The generated image could not be read. Please try again.', 502)
  if (image.length > 4 * 1024 * 1024) throw new AiGenerationError('PAYLOAD_TOO_LARGE', 'The generated visualization was too large to deliver. Please try a less detailed photo.', 502)
  console.info('[ai-visualizer:success]', { request_id: requestId, openai_request_id: upstreamRequestId, generation_duration_ms: Date.now() - startedAt, output_base64_bytes: image.length })
  return `data:image/jpeg;base64,${image}`
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const requestId = randomUUID()
  const startedAt = Date.now()
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Request-Id', requestId)
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json(safeFailure('INVALID_REQUEST', 'Method not allowed.', requestId))
    return
  }
  try {
    if (Number(request.headers?.['content-length'] ?? 0) > AI_MAX_REQUEST_BYTES) throw new AiInputError('PAYLOAD_TOO_LARGE', 'The AI request is too large. Please choose a smaller photo.', 413)
    const serialized = typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? null)
    if (Buffer.byteLength(serialized) > AI_MAX_REQUEST_BYTES) throw new AiInputError('PAYLOAD_TOO_LARGE', 'The AI request is too large. Please choose a smaller photo.', 413)
    let source: Record<string, unknown> | null
    try { source = objectValue(JSON.parse(serialized)) } catch { source = null }
    if (!source) throw new AiInputError('INVALID_REQUEST', 'The visualization request is invalid.')
    const suppliedCorners = optionalCorners(source.corners)
    const product = resolveAiProduct(source.configuration, source.jambFinishId, source.glassFrameFinishId)
    console.info('[ai-visualizer:received]', { request_id: requestId, uploaded_image: uploadMetadata(source.uploadMetadata), placement_mode: suppliedCorners ? 'user-corners' : 'automatic', product_reference_count: product.references.length, browser_request_bytes: Buffer.byteLength(serialized) })
    if (!source.photo) throw new AiInputError('INVALID_IMAGE_INPUT', 'Your house photo is missing.')
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new AiGenerationError('SERVER_CONFIGURATION_ERROR', 'AI visualization is temporarily unavailable. Manual mode is still available.', 503)
    const key = createHash('sha256').update(serialized).digest('hex')
    let pending = inFlight.get(key)
    if (!pending) {
      pending = generate(source, apiKey, requestId)
      inFlight.set(key, pending)
      void pending.finally(() => { if (inFlight.get(key) === pending) inFlight.delete(key) }).catch(() => {})
    }
    const image = await withServerlessDeadline(pending)
    response.status(200).json({ image, request_id: requestId })
  } catch (error) {
    const duration = Date.now() - startedAt
    if (error instanceof AiInputError || error instanceof AiGenerationError) {
      console.error('[ai-visualizer:failure]', { request_id: requestId, error_code: error.code, duration_ms: duration, technical_error: technicalError(error) })
      const publicMessage = error.code === 'REFERENCE_IMAGE_FAILED' ? 'A product reference image could not be loaded. Please try again.' : error.message
      response.status(error.status).json(safeFailure(error.code, publicMessage, requestId))
      return
    }
    console.error('[ai-visualizer:failure]', { request_id: requestId, error_code: 'UNKNOWN_ERROR', duration_ms: duration, technical_error: technicalError(error) })
    response.status(500).json(safeFailure('UNKNOWN_ERROR', 'The AI visualization could not be created. Please try again.', requestId))
  }
}
