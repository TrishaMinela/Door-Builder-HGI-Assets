// Shared normalization only: keep product catalogs and filesystem asset loading
// in aiDoorVisualization so entrance detection does not bundle that library.
import sharp from 'sharp'
import { AI_CORNER_ORDER, AI_MASK_PADDING_PX, AI_MAX_PHOTO_BYTES, AI_MAX_PHOTO_EDGE, aiPixelCorners, aiWorkingSize, type AiCorners } from '../src/features/home-visualizer/aiImagePreparation.js'

export type AiErrorCode =
  | 'INVALID_IMAGE_INPUT'
  | 'IMAGE_DECODE_FAILED'
  | 'PAYLOAD_TOO_LARGE'
  | 'INVALID_REQUEST'
  | 'REFERENCE_IMAGE_FAILED'
  | 'OPENAI_REQUEST_REJECTED'
  | 'OPENAI_RATE_LIMITED'
  | 'AI_GENERATION_TIMEOUT'
  | 'SERVERLESS_TIMEOUT'
  | 'NO_GENERATED_IMAGE'
  | 'SERVER_CONFIGURATION_ERROR'
  | 'UNKNOWN_ERROR'

export class AiInputError extends Error {
  constructor(public readonly code: AiErrorCode, message: string, public readonly status = 400, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AiInputError'
  }
}

export { AI_MAX_REQUEST_BYTES } from '../src/features/home-visualizer/aiImagePreparation.js'
export const AI_MAX_ORIGINAL_PHOTO_BYTES = 30 * 1024 * 1024
export const AI_MAX_ORIGINAL_PIXELS = 40_000_000
export const AI_NORMALIZED_QUALITY = 90
type ObjectValue = Record<string, unknown>
export const objectValue = (value: unknown): ObjectValue | null => value && typeof value === 'object' && !Array.isArray(value) ? value as ObjectValue : null

export function validateCorners(value: unknown): AiCorners {
  const source = objectValue(value)
  if (!source || Object.keys(source).length !== 4) throw new AiInputError('INVALID_REQUEST', 'Select all four doorway corners before generating.')
  const points = AI_CORNER_ORDER.map(name => {
    const point = objectValue(source[name])
    if (!point || Object.keys(point).length !== 2 || typeof point.x !== 'number' || typeof point.y !== 'number' || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) throw new AiInputError('INVALID_REQUEST', 'Doorway corners must be inside the photo.')
    return { x: point.x, y: point.y }
  })
  const turns = points.map((a, i) => { const b = points[(i + 1) % 4], c = points[(i + 2) % 4]; return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) })
  if (!turns.every(turn => turn > .0001)) throw new AiInputError('INVALID_REQUEST', 'Please select a valid, non-crossing doorway outline.')
  return Object.fromEntries(AI_CORNER_ORDER.map((name, i) => [name, points[i]])) as AiCorners
}

export function optionalCorners(value: unknown): AiCorners | null {
  return value === undefined || value === null ? null : validateCorners(value)
}

export async function prepareHouseAndMask(value: unknown, corners: AiCorners | null) {
  if (typeof value !== 'string') throw new AiInputError('INVALID_IMAGE_INPUT', 'Your house photo is missing.')
  const match = /^data:image\/([a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value)
  if (!match) throw new AiInputError('INVALID_IMAGE_INPUT', 'Please use a valid JPG, PNG, WebP, AVIF, HEIC, or HEIF photo.')
  if (match[2].length > Math.ceil(AI_MAX_ORIGINAL_PHOTO_BYTES * 4 / 3) + 4) throw new AiInputError('PAYLOAD_TOO_LARGE', 'Your photo is too large to process safely. Please choose a smaller photo.', 413)
  const bytes = Buffer.from(match[2], 'base64')
  if (!bytes.length) throw new AiInputError('INVALID_IMAGE_INPUT', 'The uploaded photo is empty. Please choose another photo.')
  if (bytes.length > AI_MAX_ORIGINAL_PHOTO_BYTES) throw new AiInputError('PAYLOAD_TOO_LARGE', 'Your photo is too large to process safely. Please choose a smaller photo.', 413)
  try {
    const metadata = await sharp(bytes, { limitInputPixels: AI_MAX_ORIGINAL_PIXELS }).metadata()
    if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1 || !['jpeg', 'png', 'webp', 'avif', 'heif'].includes(metadata.format ?? '')) throw new AiInputError('INVALID_IMAGE_INPUT', 'This image format is not supported. Please use JPG, PNG, WebP, AVIF, HEIC, or HEIF.')
    const swapsAxes = [5, 6, 7, 8].includes(metadata.orientation ?? 1)
    const orientedWidth = swapsAxes ? metadata.height : metadata.width
    const orientedHeight = swapsAxes ? metadata.width : metadata.height
    let size = aiWorkingSize(orientedWidth, orientedHeight)
    const alreadyNormalized = metadata.format === 'webp' && (metadata.orientation ?? 1) === 1 && !metadata.hasAlpha && metadata.width === size.width && metadata.height === size.height && bytes.length <= AI_MAX_PHOTO_BYTES
    let photo = alreadyNormalized ? bytes : await sharp(bytes, { limitInputPixels: AI_MAX_ORIGINAL_PIXELS })
      .rotate()
      .resize(size.width, size.height, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .webp({ quality: AI_NORMALIZED_QUALITY, effort: 5, smartSubsample: true })
      .toBuffer()
    for (const edge of [1280, 1024]) {
      if (photo.length <= AI_MAX_PHOTO_BYTES) break
      size = aiWorkingSize(orientedWidth, orientedHeight, edge)
      photo = await sharp(bytes, { limitInputPixels: AI_MAX_ORIGINAL_PIXELS }).rotate().resize(size.width, size.height, { fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).webp({ quality: AI_NORMALIZED_QUALITY, effort: 5, smartSubsample: true }).toBuffer()
    }
    if (photo.length > AI_MAX_PHOTO_BYTES) throw new AiInputError('PAYLOAD_TOO_LARGE', 'This photo could not be compressed enough for AI generation. Please choose a less detailed photo.', 413)
    let mask: Buffer | undefined
    if (corners) {
      const padding = AI_MASK_PADDING_PX * Math.max(size.width, size.height) / AI_MAX_PHOTO_EDGE
      const polygon = aiPixelCorners(corners, size.width, size.height).map(point => `${point.x},${point.y}`).join(' ')
      const cutout = Buffer.from(`<svg width="${size.width}" height="${size.height}"><polygon points="${polygon}" fill="black" stroke="black" stroke-width="${padding * 2}" stroke-linejoin="round"/></svg>`)
      mask = await sharp({ create: { ...size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).composite([{ input: cutout, blend: 'dest-out' }]).webp({ lossless: true, effort: 5 }).toBuffer()
    }
    return {
      photo, mask, width: size.width, height: size.height,
      original: { declaredMimeType: `image/${match[1].toLowerCase()}`, format: metadata.format, width: metadata.width, height: metadata.height, orientation: metadata.orientation ?? 1, byteSize: bytes.length },
      normalized: { format: 'webp', width: size.width, height: size.height, byteSize: photo.length },
    }
  } catch (error) {
    if (error instanceof AiInputError) throw error
    throw new AiInputError('IMAGE_DECODE_FAILED', 'Your house photo could not be decoded. Please choose another photo.', 400, { cause: error })
  }
}
