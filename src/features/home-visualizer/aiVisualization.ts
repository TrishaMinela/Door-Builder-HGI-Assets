import type { DoorConfiguration, Finish } from '../../types'
import type { EntranceCorners } from './EntranceSelector'
import { AI_MAX_PHOTO_BYTES, aiWorkingSize } from './aiImagePreparation'

export type AiVisualizationFailure = { userMessage: string; errorCode: string; requestId: string }

export class AiVisualizationError extends Error implements AiVisualizationFailure {
  constructor(public readonly userMessage: string, public readonly errorCode: string, public readonly requestId = '', options?: { cause?: unknown }) {
    super(userMessage)
    this.name = 'AiVisualizationError'
    if (options?.cause !== undefined) (this as Error & { cause?: unknown }).cause = options.cause
  }
}

export async function prepareAiHousePhoto(source: string) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Your house photo could not be prepared. Please choose it again.'))
    image.src = source
  })
  let size = aiWorkingSize(image.naturalWidth, image.naturalHeight)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your house photo could not be prepared.')
  for (let attempt = 0; attempt < 4; attempt += 1) {
    canvas.width = size.width
    canvas.height = size.height
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, size.width, size.height)
    const photo = canvas.toDataURL('image/webp', .92)
    if (Math.ceil((photo.length - photo.indexOf(',') - 1) * .75) <= AI_MAX_PHOTO_BYTES) return { photo, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }
    size = aiWorkingSize(size.width, size.height, Math.round(Math.max(size.width, size.height) * .8))
  }
  throw new Error('This photo is too detailed for AI generation. Please try a smaller photo.')
}

export async function generateAiVisualization(input: {
  photoUrl: string
  corners?: EntranceCorners
  configuration: DoorConfiguration
  jambFinish?: Finish | null
  glassFrameFinish?: Finish | null
  uploadMetadata?: { mimeType: string; format: string; byteSize: number }
  signal?: AbortSignal
}) {
  // Original asset IDs only. The server ignores browser asset paths and resolves its own catalog.
  const prepared = await prepareAiHousePhoto(input.photoUrl)
  let response: Response
  try {
    response = await fetch('/api/generate-door-visualization', {
      method: 'POST', signal: input.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo: prepared.photo, corners: input.corners, configuration: input.configuration,
        uploadMetadata: { ...input.uploadMetadata, width: prepared.naturalWidth, height: prepared.naturalHeight },
        jambFinishId: input.jambFinish?.id, glassFrameFinishId: input.glassFrameFinish?.id }),
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
