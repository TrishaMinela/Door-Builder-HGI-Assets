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
  FO: '/assets/doors/previews/preview-fo.png?v=2',
  FRT: '/assets/doors/previews/preview-frt.png?v=2',
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
  FO: '/assets/doors/previews/preview-fo-stain.png?v=2',
  FRT: '/assets/doors/previews/preview-frt-stain.png?v=2',
  F482: '/assets/doors/previews/preview-f482-stain.png',
  HDAT1: '/assets/doors/previews/preview-hdat1-stain.png',
  HRT: '/assets/doors/previews/preview-hrt-stain.png',
  N: '/assets/doors/previews/preview-n-stain.png',
  N1: '/assets/doors/previews/preview-n1-stain.png',
  QA: '/assets/doors/previews/preview-qa-stain.png',
  S: '/assets/doors/previews/preview-s-stain.png?v=2',
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

const smoothPaintDoorPreviewAssets: Record<string, string> = {
  '2PHD': '/assets/doors/previews/smooth-steel-paint/2PHDSWHT.png?v=1',
  '3LT': '/assets/doors/previews/smooth-steel-paint/3LTSWHT.png?v=1',
  '3PNG': '/assets/doors/previews/smooth-steel-paint/3PNGSWHT.png?v=1',
  '3PNGSS': '/assets/doors/previews/smooth-steel-paint/3PNGSWHT.png?v=1',
  '3STEP': '/assets/doors/previews/smooth-steel-paint/3STEPSWHT.png?v=1',
  '4LT': '/assets/doors/previews/smooth-steel-paint/4LTSWHT.png?v=1',
  '5LT': '/assets/doors/previews/smooth-steel-paint/5LTSWHT.png?v=1',
  CR14: '/assets/doors/previews/smooth-steel-paint/CR14SWHT.png?v=1',
  E1: '/assets/doors/previews/smooth-steel-paint/E1SWHT.png?v=1',
  F: '/assets/doors/previews/smooth-steel-paint/FSCUSPNT.png?v=1',
  F1: '/assets/doors/previews/smooth-steel-paint/F1SWHT.png?v=1',
  F2: '/assets/doors/previews/smooth-steel-paint/F2SWHT.png?v=1',
  F3: '/assets/doors/previews/smooth-steel-paint/F3SWHT.png?v=1',
  F4: '/assets/doors/previews/smooth-steel-paint/F4SWHT.png?v=1',
  F48: '/assets/doors/previews/smooth-steel-paint/F48SWHT.png?v=1',
  F764: '/assets/doors/previews/smooth-steel-paint/F764SCUSPNT.png?v=1',
  F848: '/assets/doors/previews/smooth-steel-paint/F848SWHT.png?v=1',
  FO: '/assets/doors/previews/smooth-steel-paint/FOSWHT.png?v=1',
  HDAT1: '/assets/doors/previews/smooth-steel-paint/HDAT1SWHT.png?v=1',
  HRT: '/assets/doors/previews/smooth-steel-paint/HRTSWHT.png?v=1',
  N: '/assets/doors/previews/smooth-steel-paint/NSWHT.png?v=1',
  N1: '/assets/doors/previews/smooth-steel-paint/N1SWHT.png?v=1',
  QA: '/assets/doors/previews/smooth-steel-paint/QASWHT.png?v=1',
  S: '/assets/doors/previews/smooth-steel-paint/SSWHT.png?v=1',
  S1NGSS: '/assets/doors/previews/smooth-steel-paint/S1SWHT.png?v=1',
  S2: '/assets/doors/previews/smooth-steel-paint/S2SWHT.png?v=1',
  S3: '/assets/doors/previews/smooth-steel-paint/S3SWHT.png?v=1',
  S4: '/assets/doors/previews/smooth-steel-paint/S4SWHT.png?v=1',
  S836: '/assets/doors/previews/smooth-steel-paint/S836SWHT.png?v=1',
  SHAK1: '/assets/doors/previews/smooth-steel-paint/SHAK1SWHT.png?v=1',
  SHAK2: '/assets/doors/previews/smooth-steel-paint/SHAK2SWHT.png?v=1',
  SHAK3: '/assets/doors/previews/smooth-steel-paint/SHAK3SWHT.png?v=1',
  SO: '/assets/doors/previews/smooth-steel-paint/SOSWHT.png?v=1',
  SW: '/assets/doors/previews/smooth-steel-paint/SWSWHT.png?v=1',
}

const texturedPaintDoorPreviewAssets: Record<string, string> = {
  '2PHD': '/assets/doors/previews/textured-paint/2PHDTCUSPNT.png?v=1',
  '3LT': '/assets/doors/previews/textured-paint/3LTTCUSPNT.png?v=1',
  '3PNG': '/assets/doors/previews/textured-paint/3PNGTCUSPNT.png?v=1',
  '3PNGSS': '/assets/doors/previews/textured-paint/3PNGTCUSPNT.png?v=1',
  '3STEP': '/assets/doors/previews/textured-paint/3STEPTCUSPNT.png?v=1',
  '4LT': '/assets/doors/previews/textured-paint/4LTTCUSPNT.png?v=1',
  '5LT': '/assets/doors/previews/textured-paint/5LTTCUSPNT.png?v=1',
  CR14: '/assets/doors/previews/textured-paint/CR14TCUSPNT.png?v=1',
  E1: '/assets/doors/previews/textured-paint/E1TCUSPNT.png?v=1',
  F: '/assets/doors/previews/textured-paint/FTCUSPNT.png?v=1',
  F1: '/assets/doors/previews/textured-paint/F1TCUSPNT.png?v=1',
  F2: '/assets/doors/previews/textured-paint/F2TCUSPNT.png?v=1',
  F3: '/assets/doors/previews/textured-paint/F3TCUSPNT.png?v=1',
  F4: '/assets/doors/previews/textured-paint/F4TCUSPNT.png?v=1',
  F48: '/assets/doors/previews/textured-paint/F48TCUSPNT.png?v=1',
  F764: '/assets/doors/previews/textured-paint/F764TCUSPNT.png?v=1',
  F848: '/assets/doors/previews/textured-paint/F848TCUSPNT.png?v=1',
  HDAT1: '/assets/doors/previews/textured-paint/HDAT1TCUSPNT.png?v=1',
  HRT: '/assets/doors/previews/textured-paint/HRTTCUSPNT.png?v=1',
  N: '/assets/doors/previews/textured-paint/NTCUSPNT.png?v=1',
  N1: '/assets/doors/previews/textured-paint/N1TCUSPNT.png?v=1',
  QA: '/assets/doors/previews/textured-paint/QATCUSPNT.png?v=1',
  S1NGSS: '/assets/doors/previews/textured-paint/S1TCUSPNT.png?v=1',
  S2: '/assets/doors/previews/textured-paint/S2TCUSPNT.png?v=1',
  S3: '/assets/doors/previews/textured-paint/S3TCUSPNT.png?v=1',
  S4: '/assets/doors/previews/textured-paint/S4TCUSPNT.png?v=1',
  S836: '/assets/doors/previews/textured-paint/S836TCUSPNT.png?v=1',
  SHAK1: '/assets/doors/previews/textured-paint/SHAK1TCUSPNT.png?v=1',
  SHAK2: '/assets/doors/previews/textured-paint/SHAK2TCUSPNT.png?v=1',
  SHAK3: '/assets/doors/previews/textured-paint/SHAK3TCUSPNT.png?v=1',
  SO: '/assets/doors/previews/textured-paint/SOTCUSPNT.png?v=1',
  SW: '/assets/doors/previews/textured-paint/SWTCUSPNT.png?v=1',
}

const signatureCherryPaintDoorPreviewAssets: Record<string, string> = {
  '2PNGSS': '/assets/doors/previews/signature-cherry-paint/2PNGCCUSPNT.png?v=1',
  '2PPLSS': '/assets/doors/previews/signature-cherry-paint/2PPLSSCCUSPNT.png?v=1',
  CANGSS: '/assets/doors/previews/signature-cherry-paint/CANGSSTCUSPNT.png?v=1',
  CA: '/assets/doors/previews/signature-cherry-paint/CATCUSPNT.png?v=1',
  F: '/assets/doors/previews/signature-cherry-paint/FCCUSPNT.png?v=1',
  F48: '/assets/doors/previews/signature-cherry-paint/F48CCUSPNT.png?v=1',
  F482: '/assets/doors/previews/signature-cherry-paint/F482CCUSPNT.png?v=1',
  S: '/assets/doors/previews/signature-cherry-paint/SCCUSPNT.png?v=1',
  S1NGSS: '/assets/doors/previews/signature-cherry-paint/S1CCUSPNT.png?v=1',
}

const signatureFirPaintDoorPreviewAssets: Record<string, string> = {
  CR14: '/assets/doors/previews/signature-fir-paint/CR14FCUSPNT.png?v=1',
  F: '/assets/doors/previews/signature-fir-paint/FFCUSPNT.png?v=1',
}

const signatureMahoganyPaintDoorPreviewAssets: Record<string, string> = {
  '3PNGSS': '/assets/doors/previews/signature-mahogany-paint/3PNGSSMCUSPNT.png?v=1',
  F: '/assets/doors/previews/signature-mahogany-paint/FMCUSPNT.png?v=1',
  F48: '/assets/doors/previews/signature-mahogany-paint/F48MCUSPNT.png?v=1',
  S: '/assets/doors/previews/signature-mahogany-paint/SMCUSPNT.png?v=1',
  S1NGSS: '/assets/doors/previews/signature-mahogany-paint/S1MCUSPNT.png?v=1',
  SO2: '/assets/doors/previews/signature-mahogany-paint/SOTCUSPNT.png?v=1',
}

const signatureOakPaintDoorPreviewAssets: Record<string, string> = {
  F: '/assets/doors/previews/signature-oak-paint/FTCUSPNT.png?v=1',
  F48: '/assets/doors/previews/signature-oak-paint/F48TCUSPNT.png?v=1',
  S: '/assets/doors/previews/signature-oak-paint/STCUSPNT.png?v=1',
  S1NGSS: '/assets/doors/previews/signature-oak-paint/S1TCUSPNT.png?v=1',
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

function mappedPreview(style: DoorStyle, _finishType?: Finish['finishType'], product?: ResolvedDoorProduct | null, grain?: string | null) {
  if (usesSignaturePreview(product)) {
    const signatureGrainAssets = signaturePaintPreviewByGrain(grain)
    return signatureGrainAssets ? previewFromMap(style, signatureGrainAssets) : undefined
  }

  if (usesTexturedPaintPreview(product)) return previewFromMap(style, texturedPaintDoorPreviewAssets)

  if (usesSmoothPaintPreview(product)) return previewFromMap(style, smoothPaintDoorPreviewAssets)

  return undefined
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

const previewGlassMasks = {
  CR14: 'craftsman-lite',
  F: 'full-lite',
  F482: 'three-quarter-lite',
  S: 'half-lite',
  SO2: 'small-oval',
} as const

const previewTintMasks = {
  CA: '/assets/doors/previews/masks/tint-ca.svg',
  CR14: '/assets/doors/previews/masks/tint-cr14.svg?v=2',
  F: '/assets/doors/previews/masks/tint-f.svg',
  F482: '/assets/doors/previews/masks/tint-f482.svg',
  S: '/assets/doors/previews/masks/tint-s.svg',
  SO2: '/assets/doors/previews/masks/tint-so2.svg',
} as const

const previewGlassOverlays = {
  FRT: '/assets/doors/previews/glass/glass-frt.png?v=2',
  N: '/assets/doors/previews/glass/glass-n.png?v=1',
  S3: '/assets/doors/previews/glass/glass-s3.png?v=1',
  '5LT': '/assets/glass/overlays/5LT/5LTCLEAR.png?v=1',
  F764: '/assets/glass/overlays/F764/F764Clear.png?v=1',
  HRT: '/assets/glass/overlays/HRT/HRTClear.png?v=1',
  SAT: '/assets/glass/overlays/SAT/SATClear.png?v=1',
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
