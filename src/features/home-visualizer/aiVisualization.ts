import type { DoorConfiguration } from '../../types'
import type { EntranceCorners } from './EntranceSelector'

const MAX_PHOTO_EDGE = 1536
const MAX_REFERENCE_EDGE = 768
const MAX_REFERENCES = 5

export type AiReferenceAsset = { label: string; path: string }

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('A required visualization image could not be loaded.'))
    image.src = source
  })
}

function scaledSize(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

async function imageDataUrl(source: string, maxEdge: number, format: 'image/jpeg' | 'image/png') {
  const image = await loadImage(source)
  const size = scaledSize(image.naturalWidth, image.naturalHeight, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The visualization image could not be prepared.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, size.width, size.height)
  return { dataUrl: canvas.toDataURL(format, format === 'image/jpeg' ? .9 : undefined), size }
}

async function photoAndMask(photoUrl: string, corners: EntranceCorners) {
  const photo = await imageDataUrl(photoUrl, MAX_PHOTO_EDGE, 'image/jpeg')
  const canvas = document.createElement('canvas')
  canvas.width = photo.size.width
  canvas.height = photo.size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The doorway selection could not be prepared.')

  context.fillStyle = '#000'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.globalCompositeOperation = 'destination-out'
  context.beginPath()
  context.moveTo(corners.topLeft.x * canvas.width, corners.topLeft.y * canvas.height)
  context.lineTo(corners.topRight.x * canvas.width, corners.topRight.y * canvas.height)
  context.lineTo(corners.bottomRight.x * canvas.width, corners.bottomRight.y * canvas.height)
  context.lineTo(corners.bottomLeft.x * canvas.width, corners.bottomLeft.y * canvas.height)
  context.closePath()
  context.fill()

  return { photo: photo.dataUrl, mask: canvas.toDataURL('image/png') }
}

export function aiReferenceAssets(configuration: DoorConfiguration, sideliteAsset?: string, sideliteGlassAsset?: string): AiReferenceAsset[] {
  const selectedGlass = configuration.mainDoorGlass ?? configuration.glass
  const glassOverlay = selectedGlass
    ? selectedGlass.overlaysByDoorStyle[configuration.style.code] ?? Object.values(selectedGlass.overlaysByDoorStyle)[0] ?? selectedGlass.thumbnailPath
    : ''
  const candidates: AiReferenceAsset[] = [
    { label: 'base door style', path: configuration.style.image },
    { label: 'selected glass', path: glassOverlay },
    { label: 'selected hardware', path: configuration.hardware.exteriorPreviewImage ?? configuration.hardware.asset },
    { label: 'sidelite slab', path: sideliteAsset ?? '' },
    { label: 'sidelite glass', path: sideliteGlassAsset ?? configuration.sideliteGlass?.glassAsset ?? '' },
  ]
  const seen = new Set<string>()
  return candidates.filter(({ path }) => {
    if (!path.startsWith('/assets/') || seen.has(path)) return false
    seen.add(path)
    return true
  }).slice(0, MAX_REFERENCES)
}

export async function generateAiVisualization(input: {
  photoUrl: string
  corners: EntranceCorners
  configuration: DoorConfiguration
  referenceAssets: AiReferenceAsset[]
}) {
  const prepared = await photoAndMask(input.photoUrl, input.corners)
  const references = await Promise.all(input.referenceAssets.map(async ({ label, path }) => ({
    label,
    dataUrl: (await imageDataUrl(path, MAX_REFERENCE_EDGE, 'image/png')).dataUrl,
  })))
  const response = await fetch('/api/generate-ai-visualization', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      photo: prepared.photo,
      mask: prepared.mask,
      corners: input.corners,
      configuration: input.configuration,
      references,
    }),
  })
  const result = await response.json().catch(() => null) as { image?: string; error?: string } | null
  if (!response.ok || !result?.image) throw new Error(result?.error || 'The AI visualization could not be created. Please try again.')
  return result.image
}
