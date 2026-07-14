import type { DoorStyle, Finish, ResolvedDoorProduct } from '../types'
import { doorStyleThumbnailAssets } from './doorStyleThumbnailAssets'

// Preview slabs are separate from door-style thumbnails and are loaded by URL.
const slabUrl = (folder: string, fileName: string) => `/assets/hgi-assets/Preview Slabs/${folder}/${fileName}`

const smoothPaintDoorPreviewAssets: Record<string, string> = {
  '2PHD': slabUrl('Smooth', '2P HD Flat Top - Smooth.png'),
  '3LT': slabUrl('Smooth', 'Stacked 3 Lite - Smooth.png'),
  '3PNG': slabUrl('Smooth', '3 Panel No Glass - Smooth.png'),
  '3PNGSS': slabUrl('Smooth', '3 Panel No Glass - Smooth.png'),
  '3STEP': slabUrl('Smooth', 'Three Lite Stepping Down From Lock Side - Smooth.png'),
  '4LT': slabUrl('Smooth', 'Stacked 4 Lite - Smooth.png'),
  '5LT': slabUrl('Smooth', 'Five Lite Stack - Smooth.png'),
  CR14: slabUrl('Smooth', 'Craftsman 14 Rectangle - Smooth.png'),
  CR14PL: slabUrl('Smooth', 'CR14PL - Smooth.png'),
  E1: slabUrl('Smooth', 'Eight Panel No Glass - Smooth.png'),
  F: slabUrl('Smooth', 'Full Lite - Smooth.png'),
  F1: slabUrl('Smooth', 'Flush No Glass - Smooth.png'),
  F2: slabUrl('Smooth', 'Diamond - Smooth.png'),
  F3: slabUrl('Smooth', 'Square - Smooth.png'),
  F4: slabUrl('Smooth', 'Three Lites Stepping Up From Lock Side - Smooth.png'),
  F48: slabUrl('Smooth', '34 Lite - Smooth.png'),
  F482: slabUrl('Smooth', '3_4 Lite 2 Panel - Smooth.png'),
  F764: slabUrl('Smooth', 'Full Twin Lite - Smooth.png'),
  F848: slabUrl('Smooth', 'Two 8_ x 48_ Lites, 3_4 Lite - Smooth.png'),
  FRT: slabUrl('Smooth', 'Full Round Top - Smooth.png'),
  FO: slabUrl('Smooth', 'Full Oval - Smooth.png'),
  HDAT1: slabUrl('Smooth', 'HD Arch Top - Smooth.png'),
  HRT: slabUrl('Smooth', 'Half Round Top Glass - Smooth.png'),
  N: slabUrl('Smooth', 'N Panel - Smooth.png'),
  N1: slabUrl('Smooth', 'Nine Panel No Glass - Smooth.png'),
  QA: slabUrl('Smooth', '648 Quarter Height Eye Brow - Smooth.png'),
  S: slabUrl('Smooth', 'Half Lite - Smooth.png'),
  S1: slabUrl('Smooth', 'S1 6-Panel No Glass - Smooth.png'),
  SAT: slabUrl('Smooth', 'Half Round Top - Smooth.png'),
  S1NGSS: slabUrl('Smooth', 'S1 6-Panel No Glass - Smooth.png'),
  S2: slabUrl('Smooth', 'Two Lights Top of 6 Panel Door - Smooth.png'),
  S3: slabUrl('Smooth', 'Four Lite Rectangle - Smooth.png'),
  S4: slabUrl('Smooth', 'Four Lites Together Each With An Arch At Top - Smooth.png'),
  S836: slabUrl('Smooth', 'Two 8_ x 36_ Lites - Smooth.png'),
  SHAK1: slabUrl('Smooth', '1 Panel Shaker - Smooth.png'),
  SHAK2: slabUrl('Smooth', '2 Panel Shaker - Smooth.png'),
  SHAK3: slabUrl('Smooth', '3 Panel Shaker - Smooth.png'),
  SO: slabUrl('Smooth', 'Small Oval 3 Panel - Smooth.png'),
  SW: slabUrl('Smooth', 'Wagon Wheel - Smooth.png'),
}

export const doorPreviewAssets: Record<string, string> = smoothPaintDoorPreviewAssets

const texturedPaintDoorPreviewAssets: Record<string, string> = {
  '2PHD': slabUrl('Textured', '2P HD Flat Top - Textured.png'),
  '3LT': slabUrl('Textured', 'Stacked 3 Lite - Textured.png'),
  '3PNG': slabUrl('Textured', '3 Panel No Glass - Textured.png'),
  '3PNGSS': slabUrl('Textured', '3 Panel No Glass - Textured.png'),
  '3STEP': slabUrl('Textured', 'Three Lite Stepping Down From Lock Side - Textured.png'),
  '4LT': slabUrl('Textured', 'Stacked 4 Lite - Textured.png'),
  '5LT': slabUrl('Textured', 'Five Lite Stack - Textured.png'),
  CR14: slabUrl('Textured', 'Craftsman 1_4 Rectangle - Textured.png'),
  E1: slabUrl('Textured', 'Eight Panel No Glass - Textured.png'),
  F: slabUrl('Textured', 'Full Lite - Textured.png'),
  F1: slabUrl('Textured', 'Flush No Glass - Textured.png'),
  F48: slabUrl('Textured', '3_4 Lite - Textured.png'),
  F764: slabUrl('Textured', 'Full Twin Lite - Textured.png'),
  HDAT1: slabUrl('Textured', 'HD Arch Top - Textured.png'),
  HRT: slabUrl('Textured', 'Half Round Top Glass - Textured.png'),
  N: slabUrl('Textured', 'N Panel - Textured.png'),
  N1: slabUrl('Textured', 'Nine Panel - Textured.png'),
  QA: slabUrl('Textured', '648 Quarter Height Eye Brow - Textured.png'),
  S1NGSS: slabUrl('Textured', 'S1 6-Panel No Glass - Textured.png'),
  S2: slabUrl('Textured', 'Two 8_ x 36_ Lites - Textured.png'),
  S3: slabUrl('Textured', 'Two 8_ x 48_ Lites, 3_4 Lite - Textured.png'),
  S4: slabUrl('Textured', 'Full Twin Lite - Textured.png'),
  SHAK1: slabUrl('Textured', '1 Panel Shaker - Textured.png'),
  SHAK2: slabUrl('Textured', '2 Panel Shaker - Textured.png'),
  SHAK3: slabUrl('Textured', '3 Panel Shaker - Textured.png'),
  SO: slabUrl('Textured', 'Small Oval 3 Panel - Textured.png'),
  SW: slabUrl('Textured', 'Wagon Wheel - Textured.png'),
}

const signatureCherryPaintDoorPreviewAssets: Record<string, string> = {
  '2PNGSS': slabUrl('Cherry', '2 Panel No Glass - Textured.png'),
  '2PPLSS': slabUrl('Cherry', '2 Panel Plank No Glass - Cherry.png'),
  CANGSS: slabUrl('Cherry', 'Center Arch No Glass - Cherry.png'),
  CA: slabUrl('Cherry', 'Fiberglass Center Arch 8 Panel - Cherry.png'),
  F: slabUrl('Cherry', 'Full Lite - Cherry.png'),
  F48: slabUrl('Cherry', '3_4 Lite - Cherry.png'),
  F482: slabUrl('Cherry', '3_4 Lite 2 Panel - Cherry.png'),
  S: slabUrl('Cherry', 'Half Lite - Cherry.png'),
  S1NGSS: slabUrl('Cherry', 'S1 6-Panel No Glass - Cherry.png'),
  '3PNGSS': slabUrl('Cherry', '3 Panel No Glass - Cherry.png'),
}

const signatureFirPaintDoorPreviewAssets: Record<string, string> = {
  CR14: slabUrl('Fir', 'CR14 - Fir.png'),
  CR14PL: slabUrl('Smooth', 'CR14PL - Smooth.png'),
  F: slabUrl('Fir', 'Full Lite - Fir.png'),
}

const signatureMahoganyPaintDoorPreviewAssets: Record<string, string> = {
  '3PNG': slabUrl('Mahogany', '3 Panel No Glass - Mahogany.png'),
  '3PNGSS': slabUrl('Mahogany', '3 Panel No Glass - Mahogany.png'),
  F: slabUrl('Mahogany', 'Full Lite - Mahogany.png'),
  F48: slabUrl('Mahogany', '3_4 Lite - Mahogany.png'),
  S: slabUrl('Mahogany', 'Half Lite - Mahogany.png'),
  S1NGSS: slabUrl('Mahogany', 'S1 6-Panel No Glass - Mahogany.png'),
  SO2: slabUrl('Mahogany', 'Small Oval 3 Panel - Mahogany.png'),
}

const signatureOakPaintDoorPreviewAssets: Record<string, string> = {
  F: slabUrl('Oak', 'Full Lite - Mahogany.png'),
  F48: slabUrl('Oak', '3_4 Lite - Mahogany.png'),
  S1NGSS: slabUrl('Oak', 'S1 6-Panel No Glass - Mahogany.png'),
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

export function resolveDoorPreviewCandidates(style: DoorStyle, _finishType?: Finish['finishType'], product?: ResolvedDoorProduct | null, grain?: string | null) {
  const candidates: (string | undefined)[] = []
  const hasExactDoorLine = product?.doorTypes.length === 1
  const signatureGrainAssets = hasExactDoorLine && usesSignaturePreview(product) ? signaturePaintPreviewByGrain(grain) : null
  if (signatureGrainAssets) candidates.push(previewFromMap(style, signatureGrainAssets))

  if (hasExactDoorLine && usesSignaturePreview(product)) {
    candidates.push(...signaturePreviewMaps.map((assets) => previewFromMap(style, assets)))
  }

  if (hasExactDoorLine && usesTexturedPaintPreview(product)) {
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
  '5LT': '/assets/hgi-assets/Glass/RETRO/5LTCLE.png',
  F764: '/assets/hgi-assets/Glass/RETRO/F764CLE.png',
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
