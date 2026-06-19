import type { DoorStyle, Finish, ResolvedDoorProduct } from '../types'

// Preview slabs are separate from door-style thumbnails and are loaded by URL.
export const doorPreviewAssets: Record<string, string> = {
  CA: '/assets/doors/previews/preview-ca.png?v=3',
  CANGSS: '/assets/doors/previews/preview-cangss.png',
  CR14: '/assets/doors/previews/preview-cr14.png',
  F: '/assets/doors/previews/preview-f.png',
  F482: '/assets/doors/previews/preview-f482.png',
  S: '/assets/doors/previews/preview-s.png',
  S1NGSS: '/assets/doors/previews/preview-s1ngss.png?v=2',
  SO2: '/assets/doors/previews/preview-so2.png',
  '2PPLSS': '/assets/doors/previews/preview-2pplss.png',
  '2PHD': '/assets/doors/previews/preview-2phd.png',
  '2PNGSS': '/assets/doors/previews/preview-2pngss.png',
  '3PNG': '/assets/doors/previews/preview-3png.png',
  '3PNGSS': '/assets/doors/previews/preview-3png.png',
  '3LT': '/assets/doors/previews/preview-3lt.png',
  '3STEP': '/assets/doors/previews/preview-3step.png',
}

function candidateCodes(style: DoorStyle) {
  return [...new Set([style.code, ...style.variants.map((variant) => variant.code)])]
}

function mappedPreview(style: DoorStyle) {
  return candidateCodes(style).map((code) => doorPreviewAssets[code]).find(Boolean)
}

export function hasDoorPreviewAsset(style: DoorStyle) {
  return Boolean(mappedPreview(style))
}

const previewGlassCodes = new Set(['3LT', '3STEP', 'CA', 'CR14', 'F', 'F482', 'S', 'SO2'])

export function previewAssetHasGlass(style: DoorStyle) {
  return candidateCodes(style).some((code) => previewGlassCodes.has(code))
}

const previewGlassMasks = {
  CA: 'ca',
  CR14: 'craftsman-lite',
  F: 'full-lite',
  F482: 'three-quarter-lite',
  S: 'half-lite',
  SO2: 'small-oval',
} as const

const previewTintMasks = {
  CA: '/assets/doors/previews/masks/tint-ca.svg?v=2',
  CR14: '/assets/doors/previews/masks/tint-cr14.svg',
  F: '/assets/doors/previews/masks/tint-f.svg',
  F482: '/assets/doors/previews/masks/tint-f482.svg',
  S: '/assets/doors/previews/masks/tint-s.svg',
  SO2: '/assets/doors/previews/masks/tint-so2.svg',
} as const

export function previewAssetTintMask(style: DoorStyle) {
  return candidateCodes(style)
    .map((code) => previewTintMasks[code as keyof typeof previewTintMasks])
    .find(Boolean)
}

export function previewAssetGlassMask(style: DoorStyle) {
  return candidateCodes(style)
    .map((code) => previewGlassMasks[code as keyof typeof previewGlassMasks])
    .find(Boolean)
}

export function hasPaintPreviewAsset(style: DoorStyle) {
  return hasDoorPreviewAsset(style)
}

export function hasStainPreviewAsset(style: DoorStyle) {
  return hasDoorPreviewAsset(style)
}

export function finishTypesForPreviewAssets(style: DoorStyle): Finish['finishType'][] {
  return hasDoorPreviewAsset(style) ? ['paint', 'stain'] : []
}

export function resolveAutomaticPreviewGrain(_style: DoorStyle) {
  return undefined
}

export function resolveDoorPreviewAsset(
  style: DoorStyle,
  _grain?: string | null,
  _finishType?: Finish['finishType'],
  _product?: ResolvedDoorProduct | null,
) {
  return mappedPreview(style) ?? style.image
}
