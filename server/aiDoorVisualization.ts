import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { doorStyles, finishes } from '../src/data/options.js'
import { productCatalog } from '../src/data/productCatalog.js'
import { resolveDoorPreviewCandidates } from '../src/data/doorPreviewAssets.js'
import { resolveHardwareOption, hardwarePreviewAssetUrl, hardwareAssetUrl } from '../src/data/hardware.js'
import { glassOptions } from '../src/data/glassOptions.js'
import { sideliteAssetFamilyForSlab, sideliteSlabAsset } from '../src/data/sideliteAssets.js'
import { sidelitePlacement } from '../src/data/sideliteConfigurations.js'
import { doorHardwarePlacements } from '../src/data/doorConfigurationRules.js'
import { fslGlassOptions } from '../src/data/fslGlass.js'
import { f48slGlassOptions } from '../src/data/f48slGlass.js'
import { sslGlassOptions } from '../src/data/sslGlass.js'
import { s2slGlassOptions } from '../src/data/s2slGlass.js'
import { cr14slGlassOptions } from '../src/data/cr14slGlass.js'
import { AI_CORNER_ORDER, AI_MASK_PADDING_PX, AI_MAX_PHOTO_BYTES, AI_MAX_PHOTO_EDGE, aiPixelCorners, aiWorkingSize, type AiCorners } from '../src/features/home-visualizer/aiImagePreparation.js'
import type { DoorConfiguration, SideliteConfiguration } from '../src/types.js'
import type { EntranceDetection, EntranceFitStrategy } from '../src/features/home-visualizer/entranceFitStrategy.js'

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

export class AiGenerationError extends Error {
  constructor(public readonly code: AiErrorCode, message: string, public readonly status = 502, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AiGenerationError'
  }
}
export const AI_MODEL = 'gpt-image-2.5-sunburst'
export const AI_QUALITY = 'xhigh' // Favor product detail; keep below the maximum cost tier.
export const AI_SINGLE_DOOR_WIDTH_BIAS = 0.94 // Small AI-only correction after estimating a normal slab from photo scale cues.
export const AI_MAX_REQUEST_BYTES = 3 * 1024 * 1024
export const AI_MAX_REFERENCE_EDGE = 1536
export const AI_MAX_ORIGINAL_PHOTO_BYTES = 30 * 1024 * 1024
export const AI_MAX_ORIGINAL_PIXELS = 40_000_000
export const AI_NORMALIZED_QUALITY = 90
export const AI_MAX_PRODUCT_REFERENCE_BYTES = 5 * 1024 * 1024
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

const fitStrategies = new Set<EntranceFitStrategy>(['use-selected-product', 'preserve-sidelites', 'preserve-sidelites-and-transom', 'single-with-matching-sidelites', 'matching-double-doors', 'convert-opening-to-double', 'rebuild-opening'])

export function entranceFitContext(detectionValue: unknown, strategyValue: unknown) {
  const strategy: EntranceFitStrategy = typeof strategyValue === 'string' && fitStrategies.has(strategyValue as EntranceFitStrategy) ? strategyValue as EntranceFitStrategy : 'use-selected-product'
  const source = objectValue(detectionValue)
  if (!source) return { detection: null, strategy }
  const sidelites = ['none', 'left', 'right', 'both', 'unknown'].includes(String(source.sidelites)) ? source.sidelites as EntranceDetection['sidelites'] : 'unknown'
  const leftSidelitePresent = typeof source.leftSidelitePresent === 'boolean' ? source.leftSidelitePresent : sidelites === 'left' || sidelites === 'both'
  const rightSidelitePresent = typeof source.rightSidelitePresent === 'boolean' ? source.rightSidelitePresent : sidelites === 'right' || sidelites === 'both'
  const region = (value: unknown): EntranceDetection['mainDoorRegion'] => {
    const item = objectValue(value)
    if (!item || typeof item.x !== 'number' || typeof item.y !== 'number' || typeof item.width !== 'number' || typeof item.height !== 'number') return null
    if (![item.x, item.y, item.width, item.height].every(Number.isFinite) || item.width <= 0 || item.height <= 0) return null
    const x = Math.max(0, Math.min(1, item.x)), y = Math.max(0, Math.min(1, item.y))
    const width = Math.max(0, Math.min(1 - x, item.width)), height = Math.max(0, Math.min(1 - y, item.height))
    return width > 0 && height > 0 ? { x, y, width, height } : null
  }
  const sideliteEvidence = (value: unknown, present: boolean): EntranceDetection['leftSidelite'] => {
    const item = objectValue(value)
    return { present, confidence: typeof item?.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0, evidence: typeof item?.evidence === 'string' ? item.evidence.slice(0, 240) : '', region: region(item?.region) }
  }
  const detection: EntranceDetection = {
    doorStructure: ['single', 'double', 'unknown'].includes(String(source.doorStructure)) ? source.doorStructure as EntranceDetection['doorStructure'] : 'unknown',
    leftSidelitePresent, rightSidelitePresent,
    leftSidelite: sideliteEvidence(source.leftSidelite, leftSidelitePresent), rightSidelite: sideliteEvidence(source.rightSidelite, rightSidelitePresent),
    sidelites,
    transom: typeof source.transom === 'boolean' ? source.transom : null,
    mainDoorRegion: region(source.mainDoorRegion), transomRegion: region(source.transomRegion),
    widthClass: ['narrow', 'standard', 'wide', 'unknown'].includes(String(source.widthClass)) ? source.widthClass as EntranceDetection['widthClass'] : 'unknown',
    approximateWidthRatio: typeof source.approximateWidthRatio === 'number' && Number.isFinite(source.approximateWidthRatio) ? Math.max(0, Math.min(1, source.approximateWidthRatio)) : null,
    structurallyWide: source.structurallyWide === true,
    confidence: typeof source.confidence === 'number' && Number.isFinite(source.confidence) ? Math.max(0, Math.min(1, source.confidence)) : 0,
    summary: typeof source.summary === 'string' ? source.summary.slice(0, 240) : '',
  }
  return { detection, strategy }
}

export function detectedOuterEntranceCorners(detection: EntranceDetection | null): AiCorners | null {
  if (!detection?.mainDoorRegion) return null
  const regions = [
    detection.mainDoorRegion,
    detection.leftSidelite.present ? detection.leftSidelite.region : null,
    detection.rightSidelite.present ? detection.rightSidelite.region : null,
    detection.transom ? detection.transomRegion : null,
  ].filter((value): value is NonNullable<typeof value> => Boolean(value))
  const xMin = Math.min(...regions.map(value => value.x)), yMin = Math.min(...regions.map(value => value.y))
  const xMax = Math.max(...regions.map(value => value.x + value.width)), yMax = Math.max(...regions.map(value => value.y + value.height))
  // Detector boxes describe slab/sidelite faces. This very small expansion
  // includes the enclosing entrance frame without reaching porch or facade.
  const horizontalPadding = Math.min(.01, Math.max(.003, (xMax - xMin) * .018))
  const verticalPadding = Math.min(.006, Math.max(.002, (yMax - yMin) * .006))
  return {
    topLeft: { x: Math.max(0, xMin - horizontalPadding), y: Math.max(0, yMin - verticalPadding) },
    topRight: { x: Math.min(1, xMax + horizontalPadding), y: Math.max(0, yMin - verticalPadding) },
    bottomRight: { x: Math.min(1, xMax + horizontalPadding), y: Math.min(1, yMax + verticalPadding) },
    bottomLeft: { x: Math.max(0, xMin - horizontalPadding), y: Math.min(1, yMax + verticalPadding) },
  }
}

export function automaticEntranceMaskCorners(detection: EntranceDetection | null): AiCorners | null {
  const outer = detectedOuterEntranceCorners(detection)
  if (!outer) return null
  const width = outer.topRight.x - outer.topLeft.x, height = outer.bottomLeft.y - outer.topLeft.y
  // Separate blend allowance outside the fixed placement boundary. Sunburst
  // may soften this narrow ring, but product placement targets `outer` itself.
  const horizontalBlend = Math.min(.008, Math.max(.003, width * .018))
  const verticalBlend = Math.min(.006, Math.max(.002, height * .008))
  return {
    topLeft: { x: Math.max(0, outer.topLeft.x - horizontalBlend), y: Math.max(0, outer.topLeft.y - verticalBlend) },
    topRight: { x: Math.min(1, outer.topRight.x + horizontalBlend), y: Math.max(0, outer.topRight.y - verticalBlend) },
    bottomRight: { x: Math.min(1, outer.bottomRight.x + horizontalBlend), y: Math.min(1, outer.bottomRight.y + verticalBlend) },
    bottomLeft: { x: Math.max(0, outer.bottomLeft.x - horizontalBlend), y: Math.min(1, outer.bottomLeft.y + verticalBlend) },
  }
}

export async function prepareHouseAndMask(value: unknown, corners: AiCorners | null, automaticMaskCorners: AiCorners | null = null) {
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
    const size = aiWorkingSize(orientedWidth, orientedHeight)
    const alreadyNormalized = metadata.format === 'webp' && (metadata.orientation ?? 1) === 1 && !metadata.hasAlpha && metadata.width === size.width && metadata.height === size.height && bytes.length <= AI_MAX_PHOTO_BYTES
    const photo = alreadyNormalized ? bytes : await sharp(bytes, { limitInputPixels: AI_MAX_ORIGINAL_PIXELS })
      .rotate()
      .resize(size.width, size.height, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .webp({ quality: AI_NORMALIZED_QUALITY, effort: 5, smartSubsample: true })
      .toBuffer()
    if (photo.length > AI_MAX_PHOTO_BYTES) throw new AiInputError('PAYLOAD_TOO_LARGE', 'This photo could not be compressed enough for AI generation. Please choose a less detailed photo.', 413)
    let mask: Buffer | undefined
    const maskCorners = corners ?? automaticMaskCorners
    if (maskCorners) {
      const padding = AI_MASK_PADDING_PX * Math.max(size.width, size.height) / AI_MAX_PHOTO_EDGE
      const polygon = aiPixelCorners(maskCorners, size.width, size.height).map(point => `${point.x},${point.y}`).join(' ')
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

export async function constrainGeneratedImageToMask(generated: Buffer, originalHouse: Buffer, protectionMask: Buffer, width: number, height: number) {
  try {
    const generatedMetadata = await sharp(generated).metadata()
    if (!generatedMetadata.width || !generatedMetadata.height) throw new Error('Generated image dimensions are unavailable.')
    // The request mask is opaque outside the entrance and transparent inside.
    // Feather only its immediate boundary, then restore the normalized original
    // house over every protected pixel so model drift cannot alter the facade.
    const featheredProtectionMask = await sharp(protectionMask).ensureAlpha().blur(.8).png().toBuffer()
    const protectedHouse = await sharp(originalHouse).resize(width, height, { fit: 'fill' }).ensureAlpha()
      .composite([{ input: featheredProtectionMask, blend: 'dest-in' }]).png().toBuffer()
    return await sharp(generated)
      .resize(width, height, { fit: 'fill' })
      .composite([{ input: protectedHouse, blend: 'over' }])
      .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
      .toBuffer()
  } catch (error) {
    throw new AiGenerationError('NO_GENERATED_IMAGE', 'The generated visualization could not be finalized. Please try again.', 502, { cause: error })
  }
}

export async function prepareConfiguredProductReferences(value: unknown) {
  if (typeof value !== 'string') throw new AiInputError('REFERENCE_IMAGE_FAILED', 'The configured product render is missing.')
  const match = /^data:image\/(png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value)
  if (!match) throw new AiInputError('REFERENCE_IMAGE_FAILED', 'The configured product render is invalid.')
  const bytes = Buffer.from(match[2], 'base64')
  if (!bytes.length || bytes.length > AI_MAX_PRODUCT_REFERENCE_BYTES) throw new AiInputError('REFERENCE_IMAGE_FAILED', 'The configured product render could not be prepared.')
  try {
    const metadata = await sharp(bytes, { limitInputPixels: 24_000_000 }).metadata()
    if (!metadata.width || !metadata.height || !['png', 'webp'].includes(metadata.format ?? '')) throw new Error('Unsupported configured-product image.')
    const primary = await sharp(bytes, { limitInputPixels: 24_000_000 })
      .rotate().ensureAlpha()
      .resize({ width: AI_MAX_REFERENCE_EDGE, height: AI_MAX_REFERENCE_EDGE, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer()
    const primaryMetadata = await sharp(primary).metadata()
    return [
      { label: 'authoritative flattened configured entrance', bytes: primary, width: primaryMetadata.width!, height: primaryMetadata.height! },
    ]
  } catch (error) {
    throw new AiInputError('REFERENCE_IMAGE_FAILED', 'The configured product render could not be decoded.', 400, { cause: error })
  }
}

const sideliteCatalogs = { fsl: fslGlassOptions, f48sl: f48slGlassOptions, ssl: sslGlassOptions, s2sl: s2slGlassOptions, cr14sl: cr14slGlassOptions }
const gridKeys = ['glassCoating', 'gridLocation', 'gridStyle', 'gridPattern', 'gridColor', 'gridWidth']
function gridValues(value: unknown) {
  const source = objectValue(value)
  if (!source) return null
  return Object.fromEntries(gridKeys.filter(key => source[key] !== undefined).map(key => {
    if (typeof source[key] !== 'string' || (source[key] as string).length > 100) throw new AiInputError('INVALID_REQUEST', 'Grid configuration is invalid.')
    return [key, source[key]]
  }))
}

const resolvedProductCache = new Map<string, ReturnType<typeof resolveAiProductUncached>>()
const MAX_RESOLVED_PRODUCT_CACHE_ENTRIES = 32

function resolveAiProductUncached(value: unknown, jambFinishId?: unknown, glassFrameFinishId?: unknown) {
  const source = objectValue(value)
  if (!source || JSON.stringify(source).length > 64 * 1024) throw new AiInputError('INVALID_REQUEST', 'Door configuration is missing or invalid.')
  const style = doorStyles.find(item => item.id === objectValue(source.style)?.id)
  const finish = finishes.find(item => item.id === objectValue(source.finish)?.id)
  const selectedHardware = objectValue(source.hardware)
  const hardware = selectedHardware && resolveHardwareOption(selectedHardware.manufacturer as DoorConfiguration['hardware']['manufacturer'], String(selectedHardware.style), String(selectedHardware.finish), selectedHardware.handing as DoorConfiguration['hardware']['handing'])
  const product = objectValue(source.product)
  const requestedLines = Array.isArray(product?.matchingVariants) ? product.matchingVariants.map(item => objectValue(item)?.lineId) : []
  const variants = style?.variants.filter(item => requestedLines.includes(item.lineId)) ?? []
  const type = source.doorConfigurationType ?? 'single'
  const swing = objectValue(source.doorSwing)?.id
  const sidelites = source.sidelites ?? 'none'
  if (!style || !finish || !hardware || variants.length !== requestedLines.length || !variants.length || !['single', 'french', 'savannah'].includes(String(type)) || !['LHI', 'LHO', 'RHI', 'RHO'].includes(String(swing)) || !['none', 'hinge-side', 'lock-side', 'both-sides'].includes(String(sidelites))) throw new AiInputError('INVALID_REQUEST', 'Please complete a valid door configuration.')
  if (source.grain !== null && source.grain !== undefined && (typeof source.grain !== 'string' || !variants.some(item => item.grains.includes(source.grain as string)))) throw new AiInputError('INVALID_REQUEST', 'Door grain is invalid.')
  const selectedProduct = { doorTypeLabel: 'Door Line' as const, doorType: variants.map(item => item.lineName).join(' / '), doorTypes: variants.map(item => item.lineId), matchingVariants: variants, styleCodes: variants.map(item => item.code) }
  const doorPaths = resolveDoorPreviewCandidates(style, finish.finishType, selectedProduct, source.grain as string | null)
  const selectedGlass = objectValue(source.mainDoorGlass ?? source.glass)
  const glass = selectedGlass ? glassOptions.find(item => item.id === selectedGlass.id) : null
  if (selectedGlass && !glass) throw new AiInputError('INVALID_REQUEST', 'Selected glass is invalid.')
  const glassPath = glass && (glass.overlaysByDoorStyle[style.code] ?? variants.map(item => glass.overlaysByDoorStyle[item.code]).find(Boolean) ?? glass.thumbnailPath)
  const line = productCatalog.find(item => item.id === variants[0].lineId)
  const family = sideliteAssetFamilyForSlab({ doorLineId: variants[0].lineId.startsWith('signature-') ? 'signature-series' : line?.id, grain: source.grain as string | null, doorStyleCode: style.code })
  const sideliteStyle = source.sideliteSlab as keyof typeof sideliteCatalogs
  const sidelitePath = sidelites !== 'none' ? sideliteSlabAsset(family, sideliteStyle) : undefined
  if (sidelites !== 'none' && !sidelitePath) throw new AiInputError('INVALID_REQUEST', 'Selected sidelite style is invalid.')
  const sideliteGlassSource = objectValue(source.sideliteGlass)
  const sideliteGlass = sidelitePath && sideliteGlassSource ? sideliteCatalogs[sideliteStyle]?.find(item => item.name === sideliteGlassSource.glass) : null
  if (sidelitePath && sideliteGlassSource && !sideliteGlass) throw new AiInputError('INVALID_REQUEST', 'Selected sidelite glass is invalid.')
  const jambFinish = finishes.find(item => item.id === jambFinishId) ?? finishes.find(item => item.name === source.jambFinishColor && item.finishType === source.jambFinishType) ?? (source.jambFinishOverridden ? null : finish)
  if (jambFinishId !== undefined && !finishes.some(item => item.id === jambFinishId)) throw new AiInputError('INVALID_REQUEST', 'Selected jamb finish is invalid.')
  if (!jambFinish || !['timber', 'clad'].includes(String(source.jambType ?? 'timber'))) throw new AiInputError('INVALID_REQUEST', 'Selected jamb finish is invalid.')
  const glassFrameFinish = finishes.find(item => item.id === glassFrameFinishId) ?? (source.glassFrameColorMode === 'match-door' ? finish : null)
  if (glassFrameFinishId !== undefined && !finishes.some(item => item.id === glassFrameFinishId)) throw new AiInputError('INVALID_REQUEST', 'Selected glass frame finish is invalid.')
  const doubleDoorLockPrep = ['DDLLBO', 'DDLLAC', 'DDLLKP'].includes(String(source.doubleDoorLockPrep)) ? source.doubleDoorLockPrep as DoorConfiguration['doubleDoorLockPrep'] : null
  const exteriorHardwareSide = ['LHI', 'RHO'].includes(String(swing)) ? 'right' : 'left'
  const hardwareCount = doorHardwarePlacements(type as DoorConfiguration['doorConfigurationType'], exteriorHardwareSide, exteriorHardwareSide, doubleDoorLockPrep).length
  const snapshot = {
    schemaVersion: 1, configurationType: type, doorLine: line?.name, product: selectedProduct.doorType,
    doorStyle: style.name, doorCode: style.code, grain: source.grain ?? line?.grains[0] ?? null,
    finish: { name: finish.name, type: finish.finishType, hex: finish.color },
    glass: glass?.name ?? 'No glass', grids: gridValues(source.grid),
    hardware: { manufacturer: hardware.manufacturer, style: hardware.style, finish: hardware.finish, handing: hardware.handing, count: hardwareCount },
    doorSwing: swing, jamb: { type: source.jambType ?? 'timber', finish: jambFinish.name, finishType: source.jambFinishType ?? jambFinish.finishType, hex: jambFinish.color },
    glassFrame: glassFrameFinish ? { finish: glassFrameFinish.name, hex: glassFrameFinish.color } : 'Original glass frame finish',
    sidelites: { placement: sidelites as SideliteConfiguration, count: sidelites === 'both-sides' ? 2 : sidelites === 'none' ? 0 : 1, style: sideliteStyle ?? null, glass: sideliteGlass?.name ?? null, grids: gridValues(sideliteGlassSource) },
    doubleDoorLockPrep,
    hingeOption: objectValue(source.doorConfigurationProductOption)?.code === 'HINGEOJ' ? 'HINGEOJ - Hinge off outer jamb' : null,
  }
  return { snapshot, references: [
    { label: 'original base door design', paths: doorPaths },
    ...(glassPath ? [{ label: 'selected glass design', paths: [glassPath] }] : []),
    { label: 'selected exterior hardware', paths: [hardwarePreviewAssetUrl(hardware), hardwareAssetUrl(hardware.asset)].filter(Boolean) },
    ...(sidelitePath ? [{ label: 'original sidelite slab', paths: [sidelitePath] }] : []),
    ...(sideliteGlass?.asset ? [{ label: 'selected sidelite glass', paths: [sideliteGlass.asset] }] : []),
  ] }
}

export function resolveAiProduct(value: unknown, jambFinishId?: unknown, glassFrameFinishId?: unknown) {
  const key = JSON.stringify([value, jambFinishId ?? null, glassFrameFinishId ?? null])
  const cached = resolvedProductCache.get(key)
  if (cached) return cached
  const resolved = resolveAiProductUncached(value, jambFinishId, glassFrameFinishId)
  resolvedProductCache.set(key, resolved)
  while (resolvedProductCache.size > MAX_RESOLVED_PRODUCT_CACHE_ENTRIES) resolvedProductCache.delete(resolvedProductCache.keys().next().value!)
  return resolved
}

export async function loadAiReference(paths: string[]) {
  for (const path of paths) {
    // Paths originate only from imported application catalogs, never the browser.
    const localPath = path.split('?')[0]
    if (!localPath.startsWith('/assets/') || localPath.includes('..') || localPath.includes('\\')) continue
    try {
      const bytes = await readFile(resolve(process.cwd(), 'public', localPath.slice(1)))
      return await sharp(bytes, { limitInputPixels: 24_000_000 }).resize({ width: AI_MAX_REFERENCE_EDGE, height: AI_MAX_REFERENCE_EDGE, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
    } catch { /* Try the next trusted original source candidate. */ }
  }
  throw new AiGenerationError('REFERENCE_IMAGE_FAILED', 'A configured product reference image could not be loaded.')
}

function structuralValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'none'
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export function aiStructuralInstructionBlock(snapshot: ReturnType<typeof resolveAiProduct>['snapshot']) {
  const doorStructure = snapshot.configurationType === 'single' ? 'single' : 'double'
  const sideliteStructure = sidelitePlacement(snapshot.sidelites.placement)
  const selectedHardware = `${snapshot.hardware.manufacturer}; ${snapshot.hardware.style}; ${snapshot.hardware.finish}; ${snapshot.hardware.handing}; exact visible hardware count: ${snapshot.hardware.count}`
  const selectedJambFrame = `${snapshot.jamb.type}; ${snapshot.jamb.finish} ${snapshot.jamb.hex}; glass frame: ${structuralValue(snapshot.glassFrame)}`
  const activeLeaf = snapshot.configurationType === 'single'
    ? `single active slab; swing ${snapshot.doorSwing}`
    : `double-door active-leaf/handing from swing ${snapshot.doorSwing}; lock preparation ${structuralValue(snapshot.doubleDoorLockPrep)}; hinge option ${structuralValue(snapshot.hingeOption)}`

  return [
    'AUTHORITATIVE TARGET ENTRANCE STRUCTURE',
    `door_structure: ${doorStructure}`,
    `sidelite_structure: ${sideliteStructure}`,
    `selected_configuration_type: ${snapshot.configurationType}`,
    `selected_material: ${snapshot.doorLine}; grain: ${structuralValue(snapshot.grain)}`,
    `selected_door_style: ${snapshot.doorStyle} (${snapshot.doorCode})`,
    `selected_finish: ${snapshot.finish.type}; ${snapshot.finish.name}; ${snapshot.finish.hex}`,
    `selected_glass: ${structuralValue(snapshot.glass)}`,
    `selected_grids: ${structuralValue(snapshot.grids)}`,
    `selected_sidelite_product_glass_grids: ${structuralValue(snapshot.sidelites.style)}; ${structuralValue(snapshot.sidelites.glass)}; ${structuralValue(snapshot.sidelites.grids)}`,
    `selected_hardware: ${selectedHardware}`,
    `selected_hardware_handing_active_leaf: ${activeLeaf}`,
    `selected_jamb_frame: ${selectedJambFrame}`,
    'STRUCTURAL CONVERSION RULES',
    '- First inspect the existing entrance in the house photo: determine single versus double main door, existing sidelites and their exterior-view sides, transom, storm/screen door, jamb/casing/trim/mullions, nearby windows that are not sidelites, arches or unusual openings, and recesses. Then replace only the masked entrance region with exactly the authoritative target above.',
    '- The target fields above are authoritative. Do not preserve an original door leaf or sidelite merely because it exists in the photo, and do not remove or add a sidelite unless the target structure requires that result.',
    '- Treat the original photo only as the source of entrance location, camera perspective, lighting, scale cues, and surrounding architecture. Treat the selected configuration and product references as the source of truth for door count, sidelite count and side, style, material, finish/color, glass, grids, hardware, and jamb/frame.',
    'PROPORTION ENFORCEMENT — DOOR SLABS, SIDELITES, AND SURROUNDING ARCHITECTURE ARE THREE SEPARATE WIDTH REGIONS.',
    '- Do not interpret the entire original framed opening as flexible product width. Preserve configured slab and sidelite proportions and limit any fit correction to the jamb/frame boundary inside the mask.',
    `- Use one normal residential door slab as the reference width. For a SINGLE target only, first estimate that normal slab from the photo's height and scale cues, then apply a subtle width bias of ${AI_SINGLE_DOOR_WIDTH_BIAS.toFixed(2)} (about 6% narrower) while keeping its height unchanged. This is a modest correction, not an undersized door. A sidelite remains a separate narrow region, approximately 0.35 of the adjusted single slab unless the supplied product reference establishes a more exact proportion. Jambs, casing, mullions, and reconstructed wall are separate from both slab and sidelite width.`,
    '- SINGLE-DOOR RULE: a target single entrance must remain exactly one normally proportioned residential door slab with the subtle single-only width correction above. The slab must not become oversized because the old composition was wide. Permit only a minimal jamb/frame transition inside the editable mask; never change porch, steps, columns, wall, masonry, siding, or other surrounding architecture.',
    '- DOUBLE-DOOR RULE: a target double entrance must remain exactly two normally proportioned residential door slabs. The entrance may use former sidelite space or widen only as needed, but never create two skinny slabs squeezed into a former single opening and never stretch two oversized slabs across the entire old composition.',
    '- Original single -> target double: construct a realistic two-slab opening at the same entrance location. Use available existing entrance composition first, including former sidelite space when the target omits those sidelites; modify adjacent entrance construction only if more width is genuinely needed.',
    '- Original double -> target single: this mismatch must be handled by compatibility rules before generation. Do not redesign the house or stretch a slab to force an incompatible fit.',
    '- Existing single with both sidelites -> target single with none: keep one normal-width single slab and its jamb/frame, remove both sidelites completely, and reconstruct both unused side regions as seamless matching architecture. Never widen the slab to consume those regions.',
    '- Existing single with both sidelites -> target double with none: remove both sidelites and let the realistically proportioned double-door system legitimately use their former entrance space; do not preserve them as windows or narrow the two slabs unnaturally.',
    '- Existing double with none -> target single with both: create one normal single slab plus one proportional sidelite on each side; do not stretch the slab across the old double-door width.',
    '- Existing double with both sidelites -> target single with left only: create one normal-width single slab plus exactly one proportional left sidelite, then seamlessly reconstruct every remaining former slab/sidelite region on the unselected side.',
    '- Existing both sidelites -> target left only: retain or create only the left sidelite and reconstruct the former right-sidelite region. Existing left only -> target right only: remove/reconstruct the left region and create only the right sidelite.',
    '- For every sidelite transition, the target sidelite_structure is the sole authority: none means no sidelites; left or right means exactly one on that exterior-view side; both means exactly one on each side. Never invent an extra sidelite. Do not mistake an adjacent house window for a sidelite or absorb it into the entrance.',
    '- Preserve the existing architecture outside the entrance opening. Modify only the minimum jamb/frame/opening boundary inside the mask. Do not alter porch steps, flooring, columns, walls, siding, stone, lighting, landscaping, or other surrounding structures.',
    'BAD RESULTS TO AVOID: one giant single slab filling a former single-plus-sidelite or double opening; two giant slabs spanning the entire former sidelite width; tiny double slabs squeezed into a former single opening; any faint outlines, glass traces, mullion traces, color bands, or ghost seams left by removed sidelites.',
    '- Preserve an existing transom by default because the Door Builder does not configure transoms. Alter it only if required for a physically plausible conversion; never invent a new transom.',
    '- A storm or screen door is not the configured primary entry door. Ignore or visually remove it as necessary so the selected entry door and hardware are shown clearly.',
    '- Preserve arches, recessed construction, close columns, unusual casing, masonry constraints, porch, steps, ceiling, and the house style wherever possible. If a constraint prevents an exact fit, make the smallest believable architectural adjustment rather than flattening or redesigning the whole entrance.',
    '- Preserve the full photograph and everything outside the minimum entrance-conversion area, including walls, siding, brick/stone, columns, genuine windows, landscaping, lighting, shadows, camera perspective, pets, furniture, vehicles, and unrelated objects. The result must look structurally plausible, normally scaled, and physically installed.',
  ].join('\n')
}

export function aiProductFidelityInstructionBlock(snapshot: ReturnType<typeof resolveAiProduct>['snapshot']) {
  return [
    'AUTHORITATIVE PRODUCT FIDELITY RULES',
    '- The single flattened configured/rendered entrance in Image 2 is the authoritative reference for the final door design. It contains the completed configured door, glass, grids, hardware, sidelites, finish and frame. The resolved DoorConfiguration confirms its specifications. This is the exact target, NOT an inspiration image.',
    '- Preserve the exact configured product design. Do not redesign the door. Do not reinterpret the style. Do not simplify the design. Do not embellish the design. Do not create a similar door. Match the configured door as exactly as possible.',
    `- Preserve exactly: ${snapshot.configurationType === 'single' ? 'one slab' : 'two slabs'}; the selected single/double structure; slab proportions; panel layout; panel count; panel shapes; top-panel shapes; glass-lite count, size, placement and proportions; mullion/grid layout; target sidelite presence and side; sidelite glass; hardware type, exact hardware count (${snapshot.hardware.count}), placement and handing; active/inactive leaf behavior; finish/color; material appearance; and jamb/frame appearance.`,
    '- Do not redesign the door. Do not reinterpret the style. Do not create a new panel layout. Do not change the panel layout. Do not change panel count, panel shapes, or top-panel shapes.',
    '- Do not change the glass layout. Do not widen or narrow glass lites arbitrarily. Do not change the number, size, proportions, or placement of glass lites. Do not alter or simplify the configured mullion/grid layout.',
    `- Do not change hardware count. The final entrance must show exactly ${snapshot.hardware.count} configured visible hardware placement${snapshot.hardware.count === 1 ? '' : 's'}. Do not replace the selected hardware with a different type or layout, move it, or remove one handle when two are configured.`,
    '- Do not redesign, embellish, or simplify the selected product. Do not add optional features that were not selected. Do not invent decorative details that are absent from the configured product. Do not simplify the configured product into a generic door. Do not substitute a visually similar door style.',
    '- HOUSE VERSUS PRODUCT SEPARATION: the house photo supplies location, perspective, lighting, shadows and surrounding facade. The configured product references and DoorConfiguration supply the exact door design and product details.',
    '- Change only the tiny jamb/casing transition directly touching the configured frame when necessary for blending. Do not change brick, stone, siding, opening height, porch, steps, flooring, columns, landscaping, or other architecture.',
  ].join('\n')
}

export function aiSideliteProductFidelityInstructionBlock(snapshot: ReturnType<typeof resolveAiProduct>['snapshot']) {
  const placement = sidelitePlacement(snapshot.sidelites.placement)
  const selectedDescription = snapshot.sidelites.count === 0
    ? 'no sidelites'
    : `${snapshot.sidelites.count} sidelite${snapshot.sidelites.count === 1 ? '' : 's'} in the configured ${placement} arrangement, using sidelite slab ${snapshot.sidelites.style ?? 'shown in Image 2'} and sidelite glass ${snapshot.sidelites.glass ?? 'shown in Image 2'}`
  return [
    'AUTHORITATIVE COMPLETE ENTRANCE AND SIDELITE RULES',
    '- The configured entrance reference in Image 2 is the authoritative product specification for the ENTIRE replacement entrance assembly—not only the main door. Its door, sidelites, glass, grids, panels, finish, hardware, proportions, and internal frame relationships must all be reproduced.',
    '- The house photo is authoritative only for installation context: entrance location, perspective, camera angle, lighting, shadows, surrounding wall/brick/siding, porch/floor, and realistic architectural blending. The photographed old door and sidelites are replaceable product details, not design references.',
    '- If any photographed door or sidelite product detail conflicts with Image 2, Image 2 ALWAYS wins for the product itself. Do not borrow, preserve, blend, trace, or reinterpret the old door or sidelite design from the house photo.',
    `- Selected sidelite specification: ${selectedDescription}. Sidelites shown in Image 2 are mandatory selected product components, not optional visual suggestions.`,
    '- Preserve the exact configured sidelite count, selected side/placement, relative width, panel geometry, glass location, glass height, glass width, lite shape, lite count, grid design, frame borders, and relative proportions shown in Image 2. Do not independently redesign either sidelite.',
    '- Do not preserve or copy the photographed entrance’s original sidelite glass shape, height, lite pattern, grids, panel design, decorative glass, color, door glass, door panels, or hardware when those conflict with Image 2.',
    '- SPECIFIC CONFLICT RULE: If the house photo contains full-height glass sidelites but Image 2 contains sidelites with small square glass lites, the final visualization must use the small square glass lites from Image 2. Do not retain, blend with, or recreate the full-height sidelite glass from the house photo.',
    '- Never solve fit by stretching sidelite glass, turning small square lites into tall rectangles, changing lite count, removing selected sidelites, inventing glass, copying old sidelite geometry, or making matching configured sidelites use different designs.',
    '- Preserve the project’s configured hinge-side/lock-side mapping as rendered in Image 2. Do not mirror or relocate a configured one-sided sidelite merely because the photographed old entrance places a sidelite elsewhere.',
    '- Adjust only the immediate jamb/frame boundary inside the mask. Do not redesign either the configured entrance or surrounding house.',
  ].join('\n')
}

export function aiDoorGeometryInstructionBlock(snapshot: ReturnType<typeof resolveAiProduct>['snapshot']) {
  return [
    'AUTHORITATIVE DOOR GEOMETRY RULES',
    '- Geometry must come from the authoritative flattened configured render, not from free reinterpretation, the old photographed entrance, or assumptions about a generic residential door.',
    `- Preserve the configured ${snapshot.configurationType === 'single' ? 'single-slab' : 'two-slab'} structure, exact overall slab proportions, rail/stile relationships, panel count, panel layout, panel shapes, center seam/active-leaf relationship, and jamb/frame relationship shown in the configured render.`,
    '- Preserve the exact number of glass lites. Preserve every lite’s aspect ratio, width-to-height relationship, width, height, relative position on the slab, spacing from every other lite, and the thickness of frames/borders around the lites.',
    '- Preserve the exact mullion/grid presence or absence and exact grid layout when selected. Preserve exact sidelite count, side, width relationship, glass geometry, borders and spacing.',
    `- Preserve the exact hardware type, exact count (${snapshot.hardware.count}), position, orientation and spacing shown in the configured render.`,
    '- Do not elongate, widen, narrow, shrink, crop, merge, divide, rotate, or reposition glass lites arbitrarily. Do not stretch the slab, panels, sidelites, glass, grids, hardware or frame to make them fit the photographed opening.',
    '- Make the result photorealistic, but keep the same geometry and proportions from the configured render.',
    '- Adjust realism using lighting, texture, perspective, contact shadows, and architectural blending—not by changing the configured door geometry.',
    '- Preserve architecture outside the masked entrance. Allow only a tiny jamb/frame transition directly adjacent to the configured product.',
  ].join('\n')
}

export function aiHousePreservationInstructionBlock(corners: AiCorners | null, hasAutomaticMask: boolean) {
  const maskRule = corners
    ? 'The supplied edit mask is the only editable entrance region, with a very small edge-blending allowance.'
    : hasAutomaticMask
      ? 'The supplied automatically detected edit mask tightly encloses the entrance assembly and its minimal jamb/casing transition. Do not modify pixels outside it.'
      : 'Locate the entrance conservatively and modify only the smallest entrance region required.'
  return [
    'IMMUTABLE HOUSE ENVIRONMENT RULES',
    `- ${maskRule}`,
    '- The uploaded house photo is the immutable environment reference. Preserve the surrounding photograph, architecture, camera perspective, framing, exposure, lighting, shadows, materials, siding, brick, stone, columns, porch, flooring, roof/overhang, lights, landscaping, and trim outside the entrance assembly as closely as possible.',
    '- Modify only the minimum entrance region necessary to install the configured entrance. Do not beautify, redesign, simplify, rebuild, reinterpret, relight, recolor, sharpen, blur, or regenerate unrelated parts of the house.',
    '- Photorealism must come from locally blending the configured entrance into the existing photograph, not from regenerating the facade. Major pixels outside the entrance must remain aligned for the before/after slider.',
    '- THRESHOLD AND SILL LOCK: preserve the photographed threshold, porch floor, landing, and every step exactly. Do not add or remove a step, change step height/depth, create a landing, raise/lower the doorway, or shift the entrance vertically.',
    '- The original photographed door and entrance product details are replaceable. Preserve the surrounding house, but do not preserve old door, sidelite, glass, grid, panel, hardware, or finish details when they conflict with Image 2.',
  ].join('\n')
}

export function aiGlassGeometryInstructionBlock() {
  return [
    'FIXED GLASS AND PRODUCT GEOMETRY RULES',
    '- The configured entrance reference is authoritative geometry, not flexible visual material. Match its door slabs, panels, glass, grids, sidelites, frame relationships, finish, and hardware without geometric reinterpretation.',
    '- Preserve every configured glass/lite width-to-height aspect ratio exactly as shown in Image 2. Square or near-square glass must remain square or near-square; short horizontal glass must remain short and horizontal; tall glass may remain tall.',
    '- Do not stretch square glass vertically or horizontally, elongate decorative lites, compress glass panels, alter glass position, change lite shapes/count, or distort glass to resemble the photographed opening.',
    '- Do not widen or narrow slabs or panels unnaturally, alter panel proportions/count, change sidelite width or glass geometry, invent or remove grids, or invent decorative glass.',
    '- Compatibility is resolved before generation. Allow only the minimum jamb/frame transition inside the mask. Never distort or redesign the configured product, and never compensate by changing unrelated architecture.',
  ].join('\n')
}

export function aiFixedOuterEntranceInstructionBlock(bounds: AiCorners | null, imageSize?: { width: number; height: number }) {
  if (!bounds) return 'FIXED OUTER ENTRANCE BOUNDARY\n- No reliable automatic outer boundary is available. Do not generate until the doorway locator supplies one.'
  const normalizedWidth = bounds.topRight.x - bounds.topLeft.x
  const normalizedHeight = bounds.bottomLeft.y - bounds.topLeft.y
  const pixelWidth = imageSize ? normalizedWidth * imageSize.width : null
  const pixelHeight = imageSize ? normalizedHeight * imageSize.height : null
  const pixelAspectRatio = pixelWidth && pixelHeight ? pixelWidth / pixelHeight : null
  return [
    'FIXED OUTER ENTRANCE BOUNDARY — AUTHORITATIVE PLACEMENT TARGET',
    `- Fixed normalized boundary: ${JSON.stringify(bounds)}.`,
    pixelAspectRatio ? `- Fixed opening dimensions at AI working resolution: approximately ${Math.round(pixelWidth!)} × ${Math.round(pixelHeight!)} pixels; outer width-to-height ratio ${pixelAspectRatio.toFixed(4)}.` : '',
    '- This boundary represents the complete existing framed entrance assembly: main door plus validated sidelites/transom and enclosing entrance frame. It is not the porch or surrounding facade.',
    '- For a compatible replacement, the complete configured entrance must occupy essentially this same outer boundary. Keep its left, right, top, and threshold edges aligned with this target.',
    '- Do not make the complete entrance narrower or wider, shift it, raise or lower the threshold, crop it, compress it, shrink sidelites, or enlarge jamb/frame areas to consume product width.',
    '- Scale and perspective-place the COMPLETE configured entrance assembly as one unit into this boundary. Preserve its internal slab-to-sidelite ratios, panels, glass, grids, hardware, and frame relationships. Never resize individual product pieces independently.',
    '- The narrow extra area exposed by the edit mask is only for edge blending. It does not enlarge or redefine this fixed placement boundary.',
  ].filter(Boolean).join('\n')
}

function hasConfiguredGrid(value: ReturnType<typeof gridValues>) {
  return Boolean(value && Object.values(value).some(item => item.trim() !== '' && !/^(none|no grids?|not selected)$/i.test(item.trim())))
}

export function aiDoNotInventInstructionBlock(snapshot: ReturnType<typeof resolveAiProduct>['snapshot']) {
  const hasMainGrid = hasConfiguredGrid(snapshot.grids)
  const hasSideliteGrid = hasConfiguredGrid(snapshot.sidelites.grids)
  const noGlass = snapshot.glass === 'No glass'
  const plainGlass = /\b(clear|plain)\b/i.test(snapshot.glass) && !/decorative/i.test(snapshot.glass)
  const sideliteRule = snapshot.sidelites.count === 0
    ? '- No sidelites are selected. Do not add, retain, imply, or fabricate sidelites; reconstruct former sidelite space as matching surrounding architecture under the structural-conversion rules.'
    : `- Preserve exactly ${snapshot.sidelites.count} selected sidelite${snapshot.sidelites.count === 1 ? '' : 's'} in the configured ${sidelitePlacement(snapshot.sidelites.placement)} arrangement. Do not add another sidelite, a fake sidelite, or a nearby window that reads as a sidelite.`
  const glassRule = noGlass
    ? '- No door glass is selected. Do not create glass panes, lites, glazing, divided-light patterns, grille bars, or reflections that imply glass.'
    : plainGlass
      ? `- The selected door glass is plain/clear (${snapshot.glass}). Keep it plain/clear; do not add decorative glass, bevel patterns, textures, extra panes, divided lites, muntins, or grille bars.`
      : `- Use only the selected door glass (${snapshot.glass}) with its exact lite count, shape, size, placement, proportions and decorative pattern. Do not add panes, lites, bevels, patterns, or glass trim.`
  return [
    'DO NOT ADD OR INVENT DETAILS',
    '- Use only product features explicitly present in the resolved DoorConfiguration and supplied product references. Absence is an instruction: an unselected feature must remain absent.',
    '- Do not add grids or muntins, extra glass panes or lites, decorative glass, sidelites, panels, different panel shapes, decorative moulding, extra trim around glass, bevels, raised moulding, embossing, fake texture, or product details not present in the selected configuration.',
    '- Do not add wood grain to a material/finish that should not show wood grain. Do not introduce color variation, highlights, reflections, shadows, edge lines, or texture that changes the selected product design or makes one panel or lite appear to be multiple panels or lites.',
    '- Do not add or substitute hardware. Do not add knockers, kickplates, mail slots, peepholes, clavos, straps, decorative hinges, or other decorative metal details unless they are explicitly present in the configured product.',
    '- Do not add shutters, fake windows, fake sidelites, a new transom, unexpected arch-top styling, unexpected divided-lite patterns, grille bars, or surrounding door components that are not present in the selected system or existing architecture that must remain unchanged.',
    '- Do not alter the active/inactive leaf arrangement, double-door center seam, jamb/frame proportions, glass-frame geometry, panel count, panel layout, glass count, glass layout, hardware type, hardware count, or hardware placement.',
    'UNSELECTED FEATURES MUST NOT APPEAR',
    hasMainGrid
      ? `- Use only the configured door grid specification (${structuralValue(snapshot.grids)}). Do not add, remove, multiply, or reinterpret grille bars.`
      : '- No door grids are selected. Do not show grids, muntins, grille bars, divided-light lines, or reflections/edge lines that resemble them.',
    hasSideliteGrid
      ? `- Use only the configured sidelite grid specification (${structuralValue(snapshot.sidelites.grids)}). Do not add, remove, multiply, or reinterpret grille bars.`
      : '- No sidelite grids are selected. Do not show grids, muntins, grille bars, divided-light lines, or reflections/edge lines on sidelite glass.',
    sideliteRule,
    glassRule,
    '- Do not invent decorative glass when clear/plain glass is selected, and do not replace selected decorative glass with a different pattern.',
    '- No transom is configured by Door Builder. Preserve a real existing transom only when the existing-architecture rules require it; never invent a transom where none exists.',
    `- Show exactly ${snapshot.hardware.count} configured visible hardware placement${snapshot.hardware.count === 1 ? '' : 's'}—no more and no fewer. Use the selected hardware type, finish, handing and placement only.`,
    '- Show the exact selected panel count, panel layout and panel shapes, with no added panels, grooves, moulding, embossing or edge lines that change the composition.',
    '- Show the exact selected glass-lite count and layout, with no added, removed, divided, merged, widened or narrowed lites.',
    '- Preserve architecture outside the entrance mask; never add product features or redesign the house to fill the available opening.',
  ].join('\n')
}

export function aiEntranceFitInstructionBlock(context?: ReturnType<typeof entranceFitContext>) {
  if (!context) return 'ENTRANCE FIT STRATEGY\n- No separate fit strategy was supplied. Use the configured product structure.'
  const detected = context.detection ? JSON.stringify(context.detection) : 'not available'
  const rules: Record<EntranceFitStrategy, string> = {
    'use-selected-product': 'Treat the selected Door Builder configuration as authoritative. Install that exact selected entrance at normal proportions, and widen, narrow, remove, add, or reconstruct only the surrounding opening architecture as needed for a realistic fit. Do not substitute a different door or sidelite structure.',
    'preserve-sidelites': 'Keep or accurately rebuild the existing sidelites around the configured door. They are architectural fit elements; do not stretch the selected slab or change its product details.',
    'preserve-sidelites-and-transom': 'Keep or accurately rebuild both the existing sidelites and existing transom around the configured door. Preserve their location and architectural character while keeping the configured door exact.',
    'single-with-matching-sidelites': 'Install one normally proportioned selected door slab and create matching sidelites to fill the former double-width opening. Never stretch the single slab across that opening.',
    'matching-double-doors': 'Create two normally proportioned matching door leaves using the selected configured product design. Preserve any detected transom or surrounding sidelites indicated by the existing entrance structure.',
    'convert-opening-to-double': 'Convert the opening to two normally proportioned matching door leaves using the selected configured product design. Expand only the minimum surrounding architecture required.',
    'rebuild-opening': 'Keep the selected configured product structure exact and rebuild the minimum surrounding opening architecture needed for a natural fit.',
  }
  return ['ENTRANCE FIT STRATEGY — AUTHORITATIVE FOR ARCHITECTURAL FIT', `Detected existing entrance: ${detected}`, `Selected strategy: ${context.strategy}`, `- ${rules[context.strategy]}`, '- Product configuration remains authoritative for each slab’s style, panels, glass, grids, finish, material and hardware details. Fit strategy controls the architectural arrangement: effective slab count, retained existing sidelites/transom, and reconstruction of unused opening space.', '- If a configured door_structure or sidelite_structure statement conflicts with this explicitly selected fit strategy, the FIT STRATEGY wins for structure only. Never use that exception to redesign the product details.', '- Do not silently choose a different fit strategy. Do not stretch door slabs to consume leftover opening width.'].join('\n')
}

export function aiPrompt(snapshot: ReturnType<typeof resolveAiProduct>['snapshot'], corners: AiCorners | null, labels: string[], fitContext?: ReturnType<typeof entranceFitContext>, hasAutomaticMask = false, fixedOuterBounds: AiCorners | null = corners, imageSize?: { width: number; height: number }) {
  const roles: Record<string, string> = {
    'authoritative flattened configured entrance': 'the PRIMARY AND AUTHORITATIVE product reference; copy its complete configured entrance design, geometry, proportions, finish, glass, grids, hardware, sidelites and frame as exactly as possible',
    'original base door design': 'defines the exact slab design, panel geometry, panel depth, grooves, glass opening and underlying material/grain; its original color is not the selected finish',
    'selected glass design': 'defines the exact selected glass shape, decorative detail, pattern and visible glass construction; do not substitute plain glass',
    'selected exterior hardware': 'defines the exact hardware silhouette, proportions, knob/lever/handle/lockset components and finish; preserve its relative placement on the slab',
    'original sidelite slab': 'defines the exact sidelite structure, panel details, opening and material; preserve the configured count and placement',
    'selected sidelite glass': 'defines the exact sidelite glass design and decorative detail, separately from the main-door glass',
  }
  return [
    corners
      ? 'PRIORITY 1 — PRESERVE THE HOUSE. The FIRST image is the original customer house and the base scene. The transparent PNG mask indicates the only editable entrance region, including a small blending allowance. Preserve architecture, siding, windows, roof, porch, masonry, landscaping, steps and surroundings. Do not redesign unrelated pixels.'
      : 'PRIORITY 1 — PRESERVE THE HOUSE. The FIRST image is the full original customer house and the base scene. Identify the existing main exterior entrance in that photograph and replace only that entrance. Preserve the full photo framing and all unrelated architecture, siding, windows, roof, porch, masonry, landscaping, steps and surroundings. Do not crop or redesign unrelated pixels.',
    aiHousePreservationInstructionBlock(corners, hasAutomaticMask),
    aiFixedOuterEntranceInstructionBlock(fixedOuterBounds, imageSize),
    aiStructuralInstructionBlock(snapshot),
    aiEntranceFitInstructionBlock(fitContext),
    aiProductFidelityInstructionBlock(snapshot),
    aiSideliteProductFidelityInstructionBlock(snapshot),
    aiDoorGeometryInstructionBlock(snapshot),
    aiGlassGeometryInstructionBlock(),
    aiDoNotInventInstructionBlock(snapshot),
    'PRIORITY 2 — PRODUCT FIDELITY. Image 1 is environmental context only. Image 2 is the single primary authoritative configured-product target containing the completed door, glass, grids, hardware, sidelites, finish and frame. Product geometry must come from Image 2, never from free reinterpretation or the existing photographed door or sidelites. If Image 1 and Image 2 conflict about any product detail, Image 2 ALWAYS wins. Adapt only perspective, scene lighting and the surrounding architectural transition; never redesign, generalize, simplify, embellish, stretch or distort the configured product.',
    ...labels.map((label, index) => `Image ${index + 2} — ${label}: ${roles[label] ?? 'defines the selected product detail'}.`),
    'DETAILS TO PRESERVE. Preserve selected hardware style, silhouette, proportions, finish, handing/active-leaf logic and physical placement. Preserve selected glass style and all visible decorative detail. Preserve configured grid pattern, grid count implied by the selected layout/reference, grid placement, visible grid thickness and color; do not invent an unspecified count. Preserve the TARGET sidelite glass and structure, exact panel geometry, visible panel grooves and depth, and crisp jamb/frame edge definition. Keep the configured single/French/Savannah arrangement and target sidelite count/placement.',
    'PRIORITY 3 — SELECTED FINISHES. Ignore original reference door/sidelite colors. Refinish the slab and sidelites with the SAME specified customer finish/hex while retaining panel geometry and material/grain. Paint must be opaque, not a translucent pale tint. Stain retains natural grain. Respect configured glass coating, grid color/location, jamb finish and hardware finish.',
    'MATERIAL FIDELITY. The configured door line and grain define the underlying material. Smooth steel must remain smooth steel; brushed/smooth fiberglass must remain that fiberglass surface; textured or oak-grain fiberglass must retain its texture/oak grain. Preserve any configured visible woodgrain, its direction and relief while applying paint or stain naturally. Do not turn steel into wood or textured fiberglass into a generic flat surface. The selected finish changes color, not material type.',
    `PRIORITY 4 — NATURAL INSTALLATION. ${corners ? 'Fit to the selected perspective' : 'Use the perspective and exact opening of the detected existing main exterior entrance'}; match scene lighting, exposure, color temperature, highlights, glass reflections/transparency and believable contact shadows. The result must look physically installed, not pasted. Preserve photo framing/aspect ratio. Do not invent decorative architecture, plants, lights, windows, columns, transoms or extra trim.`,
    'AVOID. Do not substitute a different or generic knob, lever, lockset or pull handle. Do not add, remove, simplify or flatten configured glass details. Do not add, remove, reduce or reinterpret configured grids. Do not replace configured glass with plain generic glass. Do not change material type or flatten panel depth. Do not oversoften, blur away or smooth out product-defining details. Preserve fine edges without artificial sharpening halos. Do not invent unrelated architecture or redesign the house.',
    aiEntranceFitInstructionBlock(fitContext),
    corners ? `Optional user-provided doorway corners, normalized 0–1: ${JSON.stringify(corners)}` : 'No doorway corners were provided. Locate the existing main exterior entrance from the complete house photograph.',
    `DoorConfiguration schemaVersion 1: ${JSON.stringify(snapshot)}`,
  ].join('\n')
}
