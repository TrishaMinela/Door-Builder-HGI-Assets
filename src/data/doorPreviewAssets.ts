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
  S1NGSS: '/assets/doors/previews/preview-s1ngss.png',
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

const smoothPaintDoorPreviewAssets: Record<string, string> = {
  '2PHD': '/assets/hgi-assets/Preview%20Slabs/Smooth/2PHDSWHT.png',
  '3LT': '/assets/hgi-assets/Preview%20Slabs/Smooth/3LTSWHT.png',
  '3PNG': '/assets/hgi-assets/Preview%20Slabs/Smooth/3PNGSWHT.png',
  '3PNGSS': '/assets/hgi-assets/Preview%20Slabs/Smooth/3PNGSWHT.png',
  '3STEP': '/assets/hgi-assets/Preview%20Slabs/Smooth/3STEPSWHT.png',
  '4LT': '/assets/hgi-assets/Preview%20Slabs/Smooth/4LTSWHT.png',
  '5LT': '/assets/hgi-assets/Preview%20Slabs/Smooth/5LTSWHT.png',
  CR14: '/assets/hgi-assets/Preview%20Slabs/Smooth/CR14SWHT.png',
  E1: '/assets/hgi-assets/Preview%20Slabs/Smooth/E1SWHT.png',
  F: '/assets/hgi-assets/Preview%20Slabs/Smooth/FSCUSPNT.png',
  F1: '/assets/hgi-assets/Preview%20Slabs/Smooth/F1SWHT.png',
  F2: '/assets/hgi-assets/Preview%20Slabs/Smooth/F2SWHT.png',
  F3: '/assets/hgi-assets/Preview%20Slabs/Smooth/F3SWHT.png',
  F4: '/assets/hgi-assets/Preview%20Slabs/Smooth/F4SWHT.png',
  F48: '/assets/hgi-assets/Preview%20Slabs/Smooth/F48SWHT.png',
  F764: '/assets/hgi-assets/Preview%20Slabs/Smooth/F764SCUSPNT.png',
  F848: '/assets/hgi-assets/Preview%20Slabs/Smooth/F848SWHT.png',
  FO: '/assets/hgi-assets/Preview%20Slabs/Smooth/FOSWHT.png',
  HDAT1: '/assets/hgi-assets/Preview%20Slabs/Smooth/HDAT1SWHT.png',
  HRT: '/assets/hgi-assets/Preview%20Slabs/Smooth/HRTSWHT.png',
  N: '/assets/hgi-assets/Preview%20Slabs/Smooth/NSWHT.png',
  N1: '/assets/hgi-assets/Preview%20Slabs/Smooth/N1SWHT.png',
  QA: '/assets/hgi-assets/Preview%20Slabs/Smooth/QASWHT.png',
  S: '/assets/hgi-assets/Preview%20Slabs/Smooth/SSWHT.png',
  S1NGSS: '/assets/hgi-assets/Preview%20Slabs/Smooth/S1SWHT.png',
  S2: '/assets/hgi-assets/Preview%20Slabs/Smooth/S2SWHT.png',
  S3: '/assets/hgi-assets/Preview%20Slabs/Smooth/S3SWHT.png',
  S4: '/assets/hgi-assets/Preview%20Slabs/Smooth/S4SWHT.png',
  S836: '/assets/hgi-assets/Preview%20Slabs/Smooth/S836SWHT.png',
  SHAK1: '/assets/hgi-assets/Preview%20Slabs/Smooth/SHAK1SWHT.png',
  SHAK2: '/assets/hgi-assets/Preview%20Slabs/Smooth/SHAK2SWHT.png',
  SHAK3: '/assets/hgi-assets/Preview%20Slabs/Smooth/SHAK3SWHT.png',
  SO: '/assets/hgi-assets/Preview%20Slabs/Smooth/SOSWHT.png',
  SW: '/assets/hgi-assets/Preview%20Slabs/Smooth/SWSWHT.png',
}

const texturedPaintDoorPreviewAssets: Record<string, string> = {
  '2PHD': '/assets/hgi-assets/Preview%20Slabs/Textured/2PHDTCUSPNT.png',
  '3LT': '/assets/hgi-assets/Preview%20Slabs/Textured/3LTTCUSPNT.png',
  '3PNG': '/assets/hgi-assets/Preview%20Slabs/Textured/3PNGTCUSPNT.png',
  '3PNGSS': '/assets/hgi-assets/Preview%20Slabs/Textured/3PNGTCUSPNT.png',
  '3STEP': '/assets/hgi-assets/Preview%20Slabs/Textured/3STEPTCUSPNT.png',
  '4LT': '/assets/hgi-assets/Preview%20Slabs/Textured/4LTTCUSPNT.png',
  '5LT': '/assets/hgi-assets/Preview%20Slabs/Textured/5LTTCUSPNT.png',
  CR14: '/assets/hgi-assets/Preview%20Slabs/Textured/CR14TCUSPNT.png',
  E1: '/assets/hgi-assets/Preview%20Slabs/Textured/E1TCUSPNT.png',
  F: '/assets/hgi-assets/Preview%20Slabs/Textured/FTCUSPNT.png',
  F1: '/assets/hgi-assets/Preview%20Slabs/Textured/F1TCUSPNT.png',
  F2: '/assets/hgi-assets/Preview%20Slabs/Textured/F2TCUSPNT.png',
  F3: '/assets/hgi-assets/Preview%20Slabs/Textured/F3TCUSPNT.png',
  F4: '/assets/hgi-assets/Preview%20Slabs/Textured/F4TCUSPNT.png',
  F48: '/assets/hgi-assets/Preview%20Slabs/Textured/F48TCUSPNT.png',
  F764: '/assets/hgi-assets/Preview%20Slabs/Textured/F764TCUSPNT.png',
  F848: '/assets/hgi-assets/Preview%20Slabs/Textured/F848TCUSPNT.png',
  HDAT1: '/assets/hgi-assets/Preview%20Slabs/Textured/HDAT1TCUSPNT.png',
  HRT: '/assets/hgi-assets/Preview%20Slabs/Textured/HRTTCUSPNT.png',
  N: '/assets/hgi-assets/Preview%20Slabs/Textured/NTCUSPNT.png',
  N1: '/assets/hgi-assets/Preview%20Slabs/Textured/N1TCUSPNT.png',
  QA: '/assets/hgi-assets/Preview%20Slabs/Textured/QATCUSPNT.png',
  S1NGSS: '/assets/hgi-assets/Preview%20Slabs/Textured/S1TCUSPNT.png',
  S2: '/assets/hgi-assets/Preview%20Slabs/Textured/S2TCUSPNT.png',
  S3: '/assets/hgi-assets/Preview%20Slabs/Textured/S3TCUSPNT.png',
  S4: '/assets/hgi-assets/Preview%20Slabs/Textured/S4TCUSPNT.png',
  S836: '/assets/hgi-assets/Preview%20Slabs/Textured/S836TCUSPNT.png',
  SHAK1: '/assets/hgi-assets/Preview%20Slabs/Textured/SHAK1TCUSPNT.png',
  SHAK2: '/assets/hgi-assets/Preview%20Slabs/Textured/SHAK2TCUSPNT.png',
  SHAK3: '/assets/hgi-assets/Preview%20Slabs/Textured/SHAK3TCUSPNT.png',
  SO: '/assets/hgi-assets/Preview%20Slabs/Textured/SOTCUSPNT.png',
  SW: '/assets/hgi-assets/Preview%20Slabs/Textured/SWTCUSPNT.png',
}

const signatureCherryPaintDoorPreviewAssets: Record<string, string> = {
  '2PNGSS': '/assets/hgi-assets/Preview%20Slabs/Cherry/2PNGCCUSPNT.png',
  '2PPLSS': '/assets/hgi-assets/Preview%20Slabs/Cherry/2PPLSSCCUSPNT.png',
  CANGSS: '/assets/hgi-assets/Preview%20Slabs/Cherry/CANGSSTCUSPNT.png',
  CA: '/assets/hgi-assets/Preview%20Slabs/Cherry/CATCUSPNT.png',
  F: '/assets/hgi-assets/Preview%20Slabs/Cherry/FCCUSPNT.png',
  F48: '/assets/hgi-assets/Preview%20Slabs/Cherry/F48CCUSPNT.png',
  F482: '/assets/hgi-assets/Preview%20Slabs/Cherry/F482CCUSPNT.png',
  S: '/assets/hgi-assets/Preview%20Slabs/Cherry/SCCUSPNT.png',
  S1NGSS: '/assets/hgi-assets/Preview%20Slabs/Cherry/S1CCUSPNT.png',
}

const signatureFirPaintDoorPreviewAssets: Record<string, string> = {
  CR14: '/assets/hgi-assets/Preview%20Slabs/Fir/CR14FCUSPNT.png',
  F: '/assets/hgi-assets/Preview%20Slabs/Fir/FFCUSPNT.png',
}

const signatureMahoganyPaintDoorPreviewAssets: Record<string, string> = {
  '3PNGSS': '/assets/hgi-assets/Preview%20Slabs/Mahogany/3PNGSSMCUSPNT.png',
  F: '/assets/hgi-assets/Preview%20Slabs/Mahogany/FMCUSPNT.png',
  F48: '/assets/hgi-assets/Preview%20Slabs/Mahogany/F48MCUSPNT.png',
  S: '/assets/hgi-assets/Preview%20Slabs/Mahogany/SMCUSPNT.png',
  S1NGSS: '/assets/hgi-assets/Preview%20Slabs/Mahogany/S1MCUSPNT.png',
  SO2: '/assets/hgi-assets/Preview%20Slabs/Mahogany/SOTCUSPNT.png',
}

const signatureOakPaintDoorPreviewAssets: Record<string, string> = {
  F: '/assets/hgi-assets/Preview%20Slabs/Oak/FTCUSPNT.png',
  F48: '/assets/hgi-assets/Preview%20Slabs/Oak/F48TCUSPNT.png',
  S: '/assets/hgi-assets/Preview%20Slabs/Oak/STCUSPNT.png',
  S1NGSS: '/assets/hgi-assets/Preview%20Slabs/Oak/S1TCUSPNT.png',
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
  CR14: '/assets/doors/previews/masks/tint-cr14.svg',
  F: '/assets/doors/previews/masks/tint-f.svg',
  F482: '/assets/doors/previews/masks/tint-f482.svg',
  S: '/assets/doors/previews/masks/tint-s.svg',
  SO2: '/assets/doors/previews/masks/tint-so2.svg',
} as const

const previewGlassOverlays = {
  FRT: '/assets/hgi-assets/Glass/glass-frt.png',
  N: '/assets/hgi-assets/Glass/glass-n.png',
  S3: '/assets/hgi-assets/Glass/glass-s3.png',
  '5LT': '/assets/hgi-assets/Glass/5LT/5LTCLEAR.png',
  F764: '/assets/hgi-assets/Glass/F764/F764Clear.png',
  HRT: '/assets/hgi-assets/Glass/HRT/HRTClear.png',
  SAT: '/assets/hgi-assets/Glass/SAT/SATClear.png',
  S4: {
    paint: '/assets/hgi-assets/Glass/glass-s4.png',
    stain: '/assets/hgi-assets/Glass/glass-s4-stain.png',
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
