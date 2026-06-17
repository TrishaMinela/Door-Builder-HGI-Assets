import type { DoorStyle, Finish, ResolvedDoorProduct } from '../types'

// Preview slabs are separate from door-style thumbnails and are loaded by URL.
export const doorPreviewAssets: Record<string, string> = {
  CA: '/assets/doors/previews/preview-ca.png',
  CANGSS: '/assets/doors/previews/preview-cangss.png',
  F: '/assets/doors/previews/preview-f.png',
  F482: '/assets/doors/previews/preview-f482.png',
  S: '/assets/doors/previews/preview-s.png',
  S1NGSS: '/assets/doors/previews/preview-s1ngss.png',
  SO2: '/assets/doors/previews/preview-so2.png',
  '2PPLSS': '/assets/doors/previews/preview-2pplss.png',
  '2PNGSS': '/assets/doors/previews/preview-2pngss.png',
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

const previewGlassCodes = new Set(['CA', 'F', 'F482', 'S', 'SO2'])

export function previewAssetHasGlass(style: DoorStyle) {
  return candidateCodes(style).some((code) => previewGlassCodes.has(code))
}

const previewGlassMasks = {
  CA: 'ca',
  F: 'full-lite',
  F482: 'three-quarter-lite',
  S: 'half-lite',
  SO2: 'small-oval',
} as const

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
