import type { DoorConfiguration, Finish } from '../../types'
import type { EntranceCorners } from './EntranceSelector'
import { AI_MAX_PHOTO_BYTES, AI_MAX_REQUEST_BYTES, aiWorkingSize } from './aiImagePreparation'
import type { EntranceDetection, EntranceFitStrategy } from './entranceFitStrategy'

export type AiVisualizationFailure = { userMessage: string; errorCode: string; requestId: string }

export class AiVisualizationError extends Error implements AiVisualizationFailure {
  constructor(public readonly userMessage: string, public readonly errorCode: string, public readonly requestId = '', options?: { cause?: unknown }) {
    super(userMessage)
    this.name = 'AiVisualizationError'
    if (options?.cause !== undefined) (this as Error & { cause?: unknown }).cause = options.cause
  }
}

const preparedPhotos = new Map<string, ReturnType<typeof normalizeAiHousePhoto>>()
const byteSize = (value: string) => new TextEncoder().encode(value).byteLength
export const imageDataDiagnostic = (value: string) => ({ mime: value.slice(5, value.indexOf(';')), data_url_bytes: byteSize(value), encoded_image_bytes: Math.floor((value.length - value.indexOf(',') - 1) * .75) - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0) })

export function prepareAiHousePhoto(source: string, maxEdge = 1536, quality = .92) {
  const key = `${source}:${maxEdge}:${quality}`
  const cached = preparedPhotos.get(key)
  if (cached) {
    if (import.meta.env.DEV) console.debug('[ai-visualizer:normalization-cache]', { cache_hit: true, max_edge: maxEdge, quality })
    return cached
  }
  const pending = normalizeAiHousePhoto(source, maxEdge, quality)
  preparedPhotos.set(key, pending)
  while (preparedPhotos.size > 6) preparedPhotos.delete(preparedPhotos.keys().next().value!)
  void pending.catch(() => preparedPhotos.delete(key))
  return pending
}

async function normalizeAiHousePhoto(source: string, maxEdge: number, quality: number) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Your house photo could not be prepared. Please choose it again.'))
    image.src = source
  })
  if (image.naturalWidth * image.naturalHeight > 100_000_000) throw new Error('This image is too large to decode safely. Please choose another photo.')
  let size = aiWorkingSize(image.naturalWidth, image.naturalHeight, maxEdge)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your house photo could not be prepared.')
  for (let attempt = 0; attempt < 4; attempt += 1) {
    canvas.width = size.width
    canvas.height = size.height
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, size.width, size.height)
    // Older Safari can silently return PNG when WebP encoding is unavailable.
    // JPEG is a compact transport fallback; the server normalizes it to WebP.
    let photo = canvas.toDataURL('image/webp', quality)
    if (!photo.startsWith('data:image/webp;')) photo = canvas.toDataURL('image/jpeg', quality)
    if (imageDataDiagnostic(photo).encoded_image_bytes <= AI_MAX_PHOTO_BYTES) return { photo, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, width: size.width, height: size.height }
    size = aiWorkingSize(size.width, size.height, Math.round(Math.max(size.width, size.height) * .8))
  }
  throw new Error('This photo is too detailed for AI generation. Please try a smaller photo.')
}

export async function prepareAiConfiguredProductReference(source: string) {
  const response = await fetch(source)
  if (!response.ok) throw new Error('The configured door render could not be loaded.')
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('The configured door render could not be prepared.'))
      image.src = objectUrl
    })
    const scale = Math.min(1, 1536 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('The configured door render could not be prepared.')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/webp', .98)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function generateAiVisualization(input: {
  photoUrl: string
  productReferenceUrl: string
  corners?: EntranceCorners
  configuration: DoorConfiguration
  jambFinish?: Finish | null
  glassFrameFinish?: Finish | null
  entranceDetection?: EntranceDetection | null
  fitStrategy: EntranceFitStrategy
  uploadMetadata?: { mimeType: string; format: string; byteSize: number }
  signal?: AbortSignal
}) {
  // The completed configured render is the authoritative product image. The
  // server still validates the configuration and normalizes this image before
  // forwarding it; browser-provided catalog paths remain ignored.
  const [prepared, productReference] = await Promise.all([
    prepareAiHousePhoto(input.photoUrl),
    prepareAiConfiguredProductReference(input.productReferenceUrl),
  ])
  const bodyFor = (photo: string) => JSON.stringify({ photo, productReference, corners: input.corners, configuration: input.configuration,
    entranceDetection: input.entranceDetection, fitStrategy: input.fitStrategy,
    uploadMetadata: { ...input.uploadMetadata, width: prepared.naturalWidth, height: prepared.naturalHeight },
    jambFinishId: input.jambFinish?.id, glassFrameFinishId: input.glassFrameFinish?.id })
  let normalized = prepared
  let body = bodyFor(normalized.photo)
  const initialBodyBytes = byteSize(body)
  for (const [edge, quality] of [[1280, .92], [1024, .92], [1024, .85], [1024, .75]] as const) {
    if (byteSize(body) <= AI_MAX_REQUEST_BYTES) break
    normalized = await prepareAiHousePhoto(input.photoUrl, edge, quality)
    body = bodyFor(normalized.photo)
  }
  if (import.meta.env.DEV) console.debug('[ai-visualizer:browser-payload]', { original: input.uploadMetadata, source_dimensions: [prepared.naturalWidth, prepared.naturalHeight], normalized_dimensions: [normalized.width, normalized.height], house: imageDataDiagnostic(normalized.photo), product_reference: imageDataDiagnostic(productReference), configuration_bytes: byteSize(JSON.stringify(input.configuration)), mask_bytes: 0, customer_image_count: 1, initial_body_bytes: initialBodyBytes, final_body_bytes: byteSize(body), limit_bytes: AI_MAX_REQUEST_BYTES })
  if (byteSize(body) > AI_MAX_REQUEST_BYTES) throw new AiVisualizationError('The AI request is too large. Please choose a smaller photo.', 'PAYLOAD_TOO_LARGE')
  let response: Response
  try {
    response = await fetch('/api/generate-door-visualization', {
      method: 'POST', signal: input.signal,
      headers: { 'Content-Type': 'application/json' },
      body,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new AiVisualizationError('The AI service could not be reached. Please confirm the local API runtime is running and try again.', 'API_ROUTE_UNAVAILABLE', '', { cause: error })
  }
  const rawBody = await response.text()
  let result: { image?: string; error_code?: string; user_message?: string; request_id?: string } | null = null
  try { result = JSON.parse(rawBody) } catch { result = null }
  const responseRequestId = result?.request_id || response.headers.get('x-request-id') || ''
  if (!response.ok) {
    if (result?.user_message && result.error_code) throw new AiVisualizationError(result.user_message, result.error_code, responseRequestId)
    throw new AiVisualizationError('The AI API route did not return a valid response. Run the app with the Vercel development runtime and try again.', 'API_ROUTE_UNAVAILABLE', responseRequestId)
  }
  if (!result?.image?.startsWith('data:image/jpeg;base64,')) throw new AiVisualizationError(result?.user_message || 'The AI service completed without returning a usable image.', result?.error_code || 'NO_GENERATED_IMAGE', responseRequestId)
  return result.image
}
