import type { DoorConfiguration, Finish } from '../../types'
import type { EntranceCorners } from './EntranceSelector'
import { AI_MAX_PHOTO_BYTES, aiWorkingSize } from './aiImagePreparation'

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
    const photo = canvas.toDataURL('image/jpeg', .9)
    if (Math.ceil((photo.length - photo.indexOf(',') - 1) * .75) <= AI_MAX_PHOTO_BYTES) return photo
    size = aiWorkingSize(size.width, size.height, Math.round(Math.max(size.width, size.height) * .8))
  }
  throw new Error('This photo is too detailed for AI generation. Please try a smaller photo.')
}

export async function generateAiVisualization(input: {
  photoUrl: string
  corners: EntranceCorners
  configuration: DoorConfiguration
  jambFinish?: Finish | null
  glassFrameFinish?: Finish | null
  signal?: AbortSignal
}) {
  // Original asset IDs only. The server ignores browser asset paths and resolves its own catalog.
  const photo = await prepareAiHousePhoto(input.photoUrl)
  const response = await fetch('/api/generate-door-visualization', {
    method: 'POST', signal: input.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo, corners: input.corners, configuration: input.configuration,
      jambFinishId: input.jambFinish?.id, glassFrameFinishId: input.glassFrameFinish?.id }),
  })
  const result = await response.json().catch(() => null) as { image?: string; error?: string } | null
  if (!response.ok || !result?.image?.startsWith('data:image/jpeg;base64,')) throw new Error(result?.error || 'The AI visualization could not be created. Please try again.')
  return result.image
}
