import type { DoorStyle, Finish, ResolvedDoorProduct } from '../types'

// Preview slabs are separate from door-style thumbnails and are loaded by URL.
export const doorPreviewAssets: Record<string, string> = {
  CA: '/assets/doors/previews/preview-ca.png',
  CANGSS: '/assets/doors/previews/preview-cangss.png',
  CR14: '/assets/doors/previews/preview-cr14.png',
  CR14PL: '/assets/doors/previews/preview-cr14pl.png',
  E1: '/assets/doors/previews/preview-e1.png',
  F: '/assets/doors/previews/preview-f.png',
  F1: '/assets/doors/previews/preview-f1.png',
  FO: '/assets/doors/previews/preview-fo.png',
  FRT: '/assets/doors/previews/preview-frt.png',
  F482: '/assets/doors/previews/preview-f482.png',
  HDAT1: '/assets/doors/previews/preview-hdat1.png',
  HRT: '/assets/doors/previews/preview-hrt.png',
  N: '/assets/doors/previews/preview-n.png',
  N1: '/assets/doors/previews/preview-n1.png',
  QA: '/assets/doors/previews/preview-qa.png',
  S: '/assets/doors/previews/preview-s.png',
  S1NGSS: '/assets/doors/previews/preview-s1ngss.png?v=3',
  S2: '/assets/doors/previews/preview-s2.png',
  S3: '/assets/doors/previews/preview-s3.png',
  S4: '/assets/doors/previews/preview-s4.png',
  S836: '/assets/doors/previews/preview-s836.png',
  SAT: '/assets/doors/previews/preview-sat.png',
  SHAK1: '/assets/doors/previews/preview-shak1.png',
  SHAK2: '/assets/doors/previews/preview-shak2.png',
  SHAK3: '/assets/doors/previews/preview-shak3.png',
  SO: '/assets/doors/previews/preview-so.png',
  SW: '/assets/doors/previews/preview-sw.png',
  SO2: '/assets/doors/previews/preview-so2.png',
  '2PPLSS': '/assets/doors/previews/preview-2pplss.png',
  '2PHD': '/assets/doors/previews/preview-2phd.png',
  '2PNGSS': '/assets/doors/previews/preview-2pngss.png',
  '3PNG': '/assets/doors/previews/preview-3pngss.png',
  '3PNGSS': '/assets/doors/previews/preview-3pngss.png',
  '3LT': '/assets/doors/previews/preview-3lt.png',
  '3STEP': '/assets/doors/previews/preview-3step.png',
  '4LT': '/assets/doors/previews/preview-4lt.png',
  '5LT': '/assets/doors/previews/preview-5lt.png',
  F2: '/assets/doors/previews/preview-f2.png',
  F3: '/assets/doors/previews/preview-f3.png',
  F4: '/assets/doors/previews/preview-f4.png',
  F48: '/assets/doors/previews/preview-f48.png',
  F848: '/assets/doors/previews/preview-f848.png',
  F764: '/assets/doors/previews/preview-f764.png',
}

const stainDoorPreviewAssets: Record<string, string> = {
  CA: '/assets/doors/previews/preview-ca-stain.png',
  CANGSS: '/assets/doors/previews/preview-cangss-stain.png',
  CR14: '/assets/doors/previews/preview-cr14-stain.png',
  CR14PL: '/assets/doors/previews/preview-cr14pl-stain.png',
  E1: '/assets/doors/previews/preview-e1-stain.png',
  F: '/assets/doors/previews/preview-f-stain.png',
  FO: '/assets/doors/previews/preview-fo-stain.png',
  FRT: '/assets/doors/previews/preview-frt-stain.png',
  F482: '/assets/doors/previews/preview-f482-stain.png',
  HDAT1: '/assets/doors/previews/preview-hdat1-stain.png',
  HRT: '/assets/doors/previews/preview-hrt-stain.png',
  N: '/assets/doors/previews/preview-n-stain.png',
  N1: '/assets/doors/previews/preview-n1-stain.png',
  QA: '/assets/doors/previews/preview-qa-stain.png',
  S: '/assets/doors/previews/preview-s-stain.png',
  S1NGSS: '/assets/doors/previews/preview-s1ngss-stain.png',
  S2: '/assets/doors/previews/preview-s2-stain.png',
  S3: '/assets/doors/previews/preview-s3-stain.png',
  S4: '/assets/doors/previews/preview-s4-stain.png',
  S836: '/assets/doors/previews/preview-s836-stain.png',
  SAT: '/assets/doors/previews/preview-sat-stain.png',
  SHAK1: '/assets/doors/previews/preview-shak1-stain.png',
  SHAK2: '/assets/doors/previews/preview-shak2-stain.png',
  SHAK3: '/assets/doors/previews/preview-shak3-stain.png',
  SO: '/assets/doors/previews/preview-so-stain.png',
  SW: '/assets/doors/previews/preview-sw-stain.png',
  SO2: '/assets/doors/previews/preview-so2-stain.png',
  '2PPLSS': '/assets/doors/previews/preview-2pplss-stain.png',
  '2PHD': '/assets/doors/previews/preview-2phd-stain.png',
  '2PNGSS': '/assets/doors/previews/preview-2pngss-stain.png',
  '3PNG': '/assets/doors/previews/preview-3pngss-stain.png',
  '3PNGSS': '/assets/doors/previews/preview-3pngss-stain.png',
  '3LT': '/assets/doors/previews/preview-3lt-stain.png',
  '3STEP': '/assets/doors/previews/preview-3step-stain.png',
  '4LT': '/assets/doors/previews/preview-4lt-stain.png',
  '5LT': '/assets/doors/previews/preview-5lt-stain.png',
  F2: '/assets/doors/previews/preview-f2-stain.png',
  F3: '/assets/doors/previews/preview-f3-stain.png',
  F4: '/assets/doors/previews/preview-f4-stain.png',
  F48: '/assets/doors/previews/preview-f48-stain.png',
  F848: '/assets/doors/previews/preview-f848-stain.png',
  F764: '/assets/doors/previews/preview-f764-stain.png',
}

function candidateCodes(style: DoorStyle) {
  return [...new Set([style.code, ...style.variants.map((variant) => variant.code)])]
}

function mappedPreview(style: DoorStyle, finishType?: Finish['finishType']) {
  const assets = finishType === 'stain' ? stainDoorPreviewAssets : doorPreviewAssets
  return candidateCodes(style).map((code) => assets[code] ?? doorPreviewAssets[code]).find(Boolean)
}

export function hasDoorPreviewAsset(style: DoorStyle) {
  return Boolean(mappedPreview(style))
}

const previewGlassCodes = new Set([
  '3LT', '3STEP', '4LT', '5LT', 'CA', 'CR14', 'CR14PL', 'F', 'F2', 'F3', 'F4', 'F48', 'F482', 'F764', 'F848',
  'FO', 'FRT', 'HRT', 'N',
  'QA', 'S', 'S2', 'S3', 'S4', 'S836', 'SAT', 'SO', 'SO2', 'SW',
])

export function previewAssetHasGlass(style: DoorStyle) {
  return candidateCodes(style).some((code) => previewGlassCodes.has(code))
}

const previewGlassMasks = {
  CR14: 'craftsman-lite',
  F: 'full-lite',
  F482: 'three-quarter-lite',
  S: 'half-lite',
  SO2: 'small-oval',
} as const

const previewTintMasks = {
  CR14: '/assets/doors/previews/masks/tint-cr14.svg?v=2',
  F: '/assets/doors/previews/masks/tint-f.svg',
  F482: '/assets/doors/previews/masks/tint-f482.svg',
  S: '/assets/doors/previews/masks/tint-s.svg',
  SO2: '/assets/doors/previews/masks/tint-so2.svg',
} as const

const previewGlassOverlays = {
  FRT: '/assets/doors/previews/glass/glass-frt.png?v=1',
  N: '/assets/doors/previews/glass/glass-n.png?v=1',
  S3: '/assets/doors/previews/glass/glass-s3.png?v=1',
  S4: {
    paint: '/assets/doors/previews/glass/glass-s4.png?v=1',
    stain: '/assets/doors/previews/glass/glass-s4-stain.png?v=1',
  },
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

export function previewAssetGlassOverlay(style: DoorStyle, finishType?: Finish['finishType'] | null) {
  return candidateCodes(style)
    .map((code) => {
      const overlay = previewGlassOverlays[code as keyof typeof previewGlassOverlays]
      if (!overlay || typeof overlay === 'string') return overlay
      return finishType ? overlay[finishType] : undefined
    })
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
  finishType?: Finish['finishType'],
  _product?: ResolvedDoorProduct | null,
) {
  return mappedPreview(style, finishType) ?? style.image
}
