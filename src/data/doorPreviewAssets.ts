import type { DoorStyle, Finish, ResolvedDoorProduct } from '../types'
import { doorStyleThumbnailAssets } from './doorStyleThumbnailAssets'

// Preview slabs are separate from door-style thumbnails and are loaded by URL.
const slabUrl = (folder: string, fileName: string) => `/assets/hgi-assets/Preview Slabs/${folder}/${fileName}`

const smoothPaintDoorPreviewAssets: Record<string, string> = {
  // The supplied smooth 2PHD file is an opaque-black export rather than usable
  // neutral slab artwork. Use the matching neutral 2PHD source so the default
  // first style renders correctly for single, French, and Savannah assemblies.
  '2PHD': slabUrl('Textured', '2P HD Flat Top - Textured.webp'),
  '3LT': slabUrl('Smooth', 'Stacked 3 Lite - Smooth.webp'),
  '3PNG': slabUrl('Smooth', '3 Panel No Glass - Smooth.webp'),
  '3PNGSS': slabUrl('Smooth', '3 Panel No Glass - Smooth.webp'),
  '3STEP': slabUrl('Smooth', 'Three Lite Stepping Down From Lock Side - Smooth.webp'),
  '4LT': slabUrl('Smooth', 'Stacked 4 Lite - Smooth.webp'),
  '5LT': slabUrl('Smooth', 'Five Lite Stack - Smooth.webp'),
  CR14: slabUrl('Smooth', 'Craftsman 14 Rectangle - Smooth.webp'),
  CR14PL: slabUrl('Smooth', 'CR14PL - Smooth.webp'),
  E1: slabUrl('Smooth', 'Eight Panel No Glass - Smooth.webp'),
  F: slabUrl('Smooth', 'Full Lite - Smooth.webp'),
  F1: slabUrl('Smooth', 'Flush No Glass - Smooth.webp'),
  F2: slabUrl('Smooth', 'Diamond - Smooth.webp'),
  F3: slabUrl('Smooth', 'Square - Smooth.webp'),
  F4: slabUrl('Smooth', 'Three Lites Stepping Up From Lock Side - Smooth.webp'),
  F48: slabUrl('Smooth', '34 Lite - Smooth.webp'),
  F482: slabUrl('Smooth', '3_4 Lite 2 Panel - Smooth.webp'),
  F764: slabUrl('Smooth', 'Full Twin Lite - Smooth.webp'),
  F848: slabUrl('Smooth', 'Two 8_ x 48_ Lites, 3_4 Lite - Smooth.webp'),
  FRT: slabUrl('Smooth', 'Full Round Top - Smooth.webp'),
  FO: slabUrl('Smooth', 'Full Oval - Smooth.webp'),
  HDAT1: slabUrl('Smooth', 'HD Arch Top - Smooth.webp'),
  HRT: slabUrl('Smooth', 'Half Round Top Glass - Smooth.webp'),
  N: slabUrl('Smooth', 'N Panel - Smooth.webp'),
  N1: slabUrl('Smooth', 'Nine Panel No Glass - Smooth.webp'),
  QA: slabUrl('Smooth', '648 Quarter Height Eye Brow - Smooth.webp'),
  S: slabUrl('Smooth', 'Half Lite - Smooth.webp'),
  S1: slabUrl('Smooth', 'S1 6-Panel No Glass - Smooth.webp'),
  SAT: slabUrl('Smooth', 'Half Arch Top - Smooth.webp'),
  S1NGSS: slabUrl('Smooth', 'S1 6-Panel No Glass - Smooth.webp'),
  S2: slabUrl('Smooth', 'Two Lights Top of 6 Panel Door - Smooth.webp'),
  S3: slabUrl('Smooth', 'Four Lite Rectangle - Smooth.webp'),
  S4: slabUrl('Smooth', 'Four Lites Together Each With An Arch At Top - Smooth.webp'),
  S836: slabUrl('Smooth', 'Two 8_ x 36_ Lites - Smooth.webp'),
  SHAK1: slabUrl('Smooth', '1 Panel Shaker - Smooth.webp'),
  SHAK2: slabUrl('Smooth', '2 Panel Shaker - Smooth.webp'),
  SHAK3: slabUrl('Smooth', '3 Panel Shaker - Smooth.webp'),
  SO: slabUrl('Smooth', 'Small Oval 3 Panel - Smooth.webp'),
  SW: slabUrl('Smooth', 'Wagon Wheel - Smooth.webp'),
}

// F3 uses the supplied textured square slab for both of these product lines.
// Keep this line-specific so the other smooth preview mappings stay unchanged.
const exactDoorLinePreviewAssets: Record<string, Record<string, string>> = {
  '22-gauge-steel': {
    F3: slabUrl('Textured', 'F3 - Textured.webp'),
  },
  'brushed-smooth-fiberglass': {
    F3: slabUrl('Textured', 'F3 - Textured.webp'),
  },
}

export const doorPreviewAssets: Record<string, string> = smoothPaintDoorPreviewAssets

const texturedPaintDoorPreviewAssets: Record<string, string> = {
  '2PHD': slabUrl('Textured', '2P HD Flat Top - Textured.webp'),
  '3LT': slabUrl('Textured', '3LT - Textured.webp'),
  '3PNG': slabUrl('Textured', '3 Panel No Glass - Textured.webp'),
  '3PNGSS': slabUrl('Textured', '3 Panel No Glass - Textured.webp'),
  '3STEP': slabUrl('Textured', '3STEP - Textured.webp'),
  '4LT': slabUrl('Textured', '4LT - Textured.webp'),
  '5LT': slabUrl('Textured', '5LT - Textured.webp'),
  CR14: slabUrl('Textured', 'CR14 - Textured.webp'),
  F: slabUrl('Textured', 'Full Lite - Textured.webp'),
  F4: slabUrl('Textured', 'Three Lite Stepping Down From Lock Side - Textured.webp'),
  F48: slabUrl('Textured', '3_4 Lite - Textured.webp'),
  F848: slabUrl('Textured', '34 Lite - Textured.webp'),
  F764: slabUrl('Textured', 'Full Twin Lite - Textured.webp'),
  FRT: slabUrl('Textured', 'FRT - Textured.webp'),
  FO: slabUrl('Textured', 'FO - Textured.webp'),
  HDAT1: slabUrl('Textured', 'HD Arch Top - Textured.webp'),
  HRT: slabUrl('Textured', 'Half Round Top Glass - Textured.webp'),
  N: slabUrl('Textured', 'N Panel - Textured.webp'),
  N1: slabUrl('Textured', 'Nine Panel - Textured.webp'),
  QA: slabUrl('Textured', '648 Quarter Height Eye Brow - Textured.webp'),
  S: slabUrl('Textured', 'S - Textured.webp'),
  S1NGSS: slabUrl('Textured', 'S1 6-Panel No Glass - Textured.webp'),
  S2: slabUrl('Textured', 'Two Lights Top of 6 Panel Door - Textured.webp'),
  S3: slabUrl('Textured', 'Four Lite Rectangle - Textured.webp'),
  S4: slabUrl('Textured', 'Four Lites Together Each With An Arch At Top - Textured.webp'),
  S836: slabUrl('Textured', 'S836 - Textured.webp'),
  SAT: slabUrl('Textured', 'SAT - Textured.webp'),
  SHAK1: slabUrl('Textured', 'Shak1 - Textured.webp'),
  SHAK2: slabUrl('Textured', 'Shak2 - Textured.webp'),
  SHAK3: slabUrl('Textured', 'Shak3 - Textured.webp'),
  SO: slabUrl('Textured', 'SO - Textured.webp'),
  SW: slabUrl('Textured', 'Wagon Wheel - Textured.webp'),
}

const signatureCherryPaintDoorPreviewAssets: Record<string, string> = {
  '2PNGSS': slabUrl('Cherry', '2 Panel No Glass - Textured.webp'),
  '2PPLSS': slabUrl('Cherry', '2 Panel Plank No Glass - Cherry.webp'),
  CANGSS: slabUrl('Cherry', 'Center Arch No Glass - Cherry.webp'),
  CA: slabUrl('Cherry', 'Fiberglass Center Arch 8 Panel - Cherry.webp'),
  F: slabUrl('Cherry', 'Full Lite - Cherry.webp'),
  F482: slabUrl('Cherry', '3_4 Lite 2 Panel - Cherry.webp'),
  S: slabUrl('Cherry', 'Half Lite - Cherry.webp'),
  S1NGSS: slabUrl('Cherry', 'S1 6-Panel No Glass - Smooth.webp'),
  SO2: slabUrl('Cherry', 'Small Oval 2 Panel - Cherry.webp'),
}

const signatureFirPaintDoorPreviewAssets: Record<string, string> = {
  CR14: slabUrl('Fir', 'CR14 - Fir.webp'),
  CR14PL: slabUrl('Smooth', 'CR14PL - Smooth.webp'),
  F: slabUrl('Fir', 'Full Lite - Fir.webp'),
}

const signatureMahoganyPaintDoorPreviewAssets: Record<string, string> = {
  '3PNG': slabUrl('Mahogany', '3 Panel No Glass - Mahogany.webp'),
  '3PNGSS': slabUrl('Mahogany', '3 Panel No Glass - Mahogany.webp'),
  F: slabUrl('Mahogany', 'Full Lite - Mahogany.webp'),
  F48: slabUrl('Mahogany', '3_4 Lite - Mahogany.webp'),
  S: slabUrl('Mahogany', 'Half Lite - Mahogany.webp'),
  S1NGSS: slabUrl('Mahogany', 'S1 6-Panel No Glass - Mahogany.webp'),
}

const signatureOakPaintDoorPreviewAssets: Record<string, string> = {
  F: slabUrl('Oak', 'Full Lite - Oak.webp'),
  F48: slabUrl('Oak', '3_4 Lite - Mahogany.webp'),
  S: slabUrl('Oak', 'Half Lite - Oak.webp'),
  S1NGSS: slabUrl('Oak', 'S1 6-Panel No Glass - Mahogany.webp'),
}

function candidateCodes(style: DoorStyle) {
  return [...new Set([style.code, ...style.variants.map((variant) => variant.code)])]
}

function signaturePaintPreviewByGrain(grain?: string | null) {
  if (grain?.toLowerCase() === 'cherry') return signatureCherryPaintDoorPreviewAssets
  if (grain?.toLowerCase() === 'fir') return signatureFirPaintDoorPreviewAssets
  if (grain?.toLowerCase() === 'mahogany') return signatureMahoganyPaintDoorPreviewAssets
  if (grain?.toLowerCase() === 'oak') return signatureOakPaintDoorPreviewAssets
  return null
}

function usesTexturedPaintPreview(product?: ResolvedDoorProduct | null) {
  return product?.matchingVariants.some((variant) => variant.lineId === 'textured-fiberglass') ?? false
}

function usesSmoothPaintPreview(product?: ResolvedDoorProduct | null) {
  return product?.matchingVariants.some((variant) =>
    ['20-gauge-smooth-steel', '22-gauge-steel', 'brushed-smooth-fiberglass'].includes(variant.lineId),
  ) ?? false
}

function usesPaintableStainableSteelPreview(product?: ResolvedDoorProduct | null) {
  return product?.matchingVariants.some((variant) => variant.lineId === '22-gauge-steel') ?? false
}

function usesSignaturePreview(product?: ResolvedDoorProduct | null) {
  return product?.matchingVariants.some((variant) => variant.lineId.startsWith('signature-')) ?? false
}

function previewFromMap(style: DoorStyle, assets: Record<string, string>) {
  return candidateCodes(style)
    .map((code) => assets[code])
    .find(Boolean)
}

const signaturePreviewMaps = [
  signatureCherryPaintDoorPreviewAssets,
  signatureFirPaintDoorPreviewAssets,
  signatureMahoganyPaintDoorPreviewAssets,
  signatureOakPaintDoorPreviewAssets,
]

function doorStyleThumbnailPreview(style: DoorStyle) {
  return candidateCodes(style)
    .map((code) => doorStyleThumbnailAssets[code]?.image)
    .find(Boolean)
}

export function resolveDoorPreviewCandidates(style: DoorStyle, finishType?: Finish['finishType'], product?: ResolvedDoorProduct | null, grain?: string | null) {
  const candidates: (string | undefined)[] = []
  const hasExactDoorLine = product?.doorTypes.length === 1
  const exactLineId = hasExactDoorLine ? product?.matchingVariants[0]?.lineId : undefined
  const exactLineAssets = exactLineId ? exactDoorLinePreviewAssets[exactLineId] : undefined
  if (exactLineAssets) candidates.push(previewFromMap(style, exactLineAssets))
  const useStainableSteelTexture = hasExactDoorLine && usesPaintableStainableSteelPreview(product)
  const signatureGrainAssets = hasExactDoorLine && usesSignaturePreview(product) ? signaturePaintPreviewByGrain(grain) : null
  if (signatureGrainAssets) candidates.push(previewFromMap(style, signatureGrainAssets))

  if (hasExactDoorLine && usesSignaturePreview(product)) {
    candidates.push(...signaturePreviewMaps.map((assets) => previewFromMap(style, assets)))
  }

  if (hasExactDoorLine && usesTexturedPaintPreview(product)) {
    candidates.push(previewFromMap(style, texturedPaintDoorPreviewAssets))
  }
  if (useStainableSteelTexture) {
    candidates.push(previewFromMap(style, texturedPaintDoorPreviewAssets))
  }
  if (hasExactDoorLine && usesSmoothPaintPreview(product)) {
    candidates.push(previewFromMap(style, smoothPaintDoorPreviewAssets))
  }

  candidates.push(
    previewFromMap(style, doorPreviewAssets),
    previewFromMap(style, texturedPaintDoorPreviewAssets),
    ...signaturePreviewMaps.map((assets) => previewFromMap(style, assets)),
    doorStyleThumbnailPreview(style),
  )

  return [...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate)))]
}

function mappedPreview(style: DoorStyle, finishType?: Finish['finishType'], product?: ResolvedDoorProduct | null, grain?: string | null) {
  return resolveDoorPreviewCandidates(style, finishType, product, grain)[0]
}

export function hasDoorPreviewAsset(
  style: DoorStyle,
  grain?: string | null,
  finishType?: Finish['finishType'],
  product?: ResolvedDoorProduct | null,
) {
  return Boolean(mappedPreview(style, finishType, product, grain))
}

const previewGlassCodes = new Set([
  '3LT', '3STEP', '4LT', '5LT', 'CA', 'CR14', 'CR14PL', 'F', 'F2', 'F3', 'F4', 'F48', 'F482', 'F764', 'F848',
  'FO', 'FRT', 'HRT', 'N',
  'QA', 'S', 'S2', 'S3', 'S4', 'S836', 'SAT', 'SO', 'SO2', 'SW',
])

export function previewAssetHasGlass(style: DoorStyle) {
  return candidateCodes(style).some((code) => previewGlassCodes.has(code))
}

const previewTintMasks: Record<string, string> = {}

const previewGlassOverlays = {
  '5LT': '/assets/hgi-assets/Glass/RETRO/5LTCLE.webp',
  F764: '/assets/hgi-assets/Glass/RETRO/F764CLE.webp',
} as const

export function previewAssetTintMask(style: DoorStyle) {
  return candidateCodes(style)
    .map((code) => previewTintMasks[code as keyof typeof previewTintMasks])
    .find(Boolean)
}

export function previewAssetGlassOverlay(style: DoorStyle, finishType?: Finish['finishType'] | null) {
  return candidateCodes(style)
    .map((code) => {
      const overlay = previewGlassOverlays[code as keyof typeof previewGlassOverlays]
      if (!overlay || typeof overlay === 'string') return overlay
      return finishType ? overlay[finishType] : undefined
    })
    .find(Boolean)
}

export function hasPaintPreviewAsset(style: DoorStyle, grain?: string | null, product?: ResolvedDoorProduct | null) {
  return hasDoorPreviewAsset(style, grain, 'paint', product)
}

export function hasStainPreviewAsset(style: DoorStyle, grain?: string | null, product?: ResolvedDoorProduct | null) {
  return hasDoorPreviewAsset(style, grain, 'stain', product)
}

export function finishTypesForPreviewAssets(style: DoorStyle, grain?: string | null, product?: ResolvedDoorProduct | null): Finish['finishType'][] {
  return hasDoorPreviewAsset(style, grain, undefined, product) ? ['paint', 'stain'] : []
}

export function resolveAutomaticPreviewGrain(_style: DoorStyle) {
  return undefined
}

const missingPreviewWarnings = new Set<string>()

function warnMissingPreview(style: DoorStyle, grain?: string | null, finishType?: Finish['finishType'], product?: ResolvedDoorProduct | null) {
  if (!import.meta.env.DEV) return
  const productKey = product?.doorTypes.join('|') ?? 'none'
  const key = `${style.code}:${grain ?? 'none'}:${finishType ?? 'any'}:${productKey}`
  if (missingPreviewWarnings.has(key)) return
  missingPreviewWarnings.add(key)
  console.warn('[door-preview:missing-slab-asset]', {
    style: style.name,
    code: style.code,
    grain,
    finishType,
    doorTypes: product?.doorTypes,
  })
}

export function resolveDoorPreviewAsset(
  style: DoorStyle,
  grain?: string | null,
  finishType?: Finish['finishType'],
  product?: ResolvedDoorProduct | null,
) {
  const preview = mappedPreview(style, finishType, product, grain)
  if (preview) return preview
  warnMissingPreview(style, grain, finishType, product)
  return ''
}
