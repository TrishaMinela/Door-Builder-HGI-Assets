import type { DoorStyle, Finish, ResolvedDoorProduct } from '../types'

export const doorPreviewAssets = {
  smooth: {
    '2PNGSS': '/assets/doors/grain/cherry/2PNGCCUSPNT.png',
    '2PPLSS': '/assets/doors/grain/cherry/2PPLSSCCUSPNT.png',
    '2PHD': '/assets/doors/smooth/2PHDSWHT.png',
    '3LT': '/assets/doors/smooth/3LTSWHT.png',
    '3PNG': '/assets/doors/smooth/3PNGSWHT.png',
    '3STEP': '/assets/doors/smooth/3STEPSWHT.png',
    '3STEP_FRONT': '/assets/doors/smooth/3STEPSWHTF.png',
    '4LT': '/assets/doors/smooth/4LTSWHT.png',
    '5LT': '/assets/doors/smooth/5LTSWHT.png',
    CR14: '/assets/doors/smooth/CR14SWHT.png',
    E1: '/assets/doors/smooth/E1SWHT.png',
    F1: '/assets/doors/smooth/F1SWHT.png',
    F2: '/assets/doors/smooth/F2SWHT.png',
    F3: '/assets/doors/smooth/F3SWHT.png',
    F4: '/assets/doors/smooth/F4SWHT.png',
    F4_FRONT: '/assets/doors/smooth/F4SWHTF.png',
    F482: '/assets/doors/grain/cherry/F482CCUSPNT.png',
    F42: '/assets/doors/smooth/F42SWHT.png',
    F42_FRONT: '/assets/doors/smooth/F42SWHTF.png',
    F48: '/assets/doors/smooth/F48SWHT.png',
    F764: '/assets/doors/smooth/F764SCUSPNT.png',
    F848: '/assets/doors/smooth/F848SWHT.png',
    F864: '/assets/doors/smooth/F864SWHT.png',
    FO: '/assets/doors/smooth/FOSWHT.png',
    F: '/assets/doors/smooth/FSCUSPNT.png',
    HDAT1: '/assets/doors/smooth/HDAT1SWHT.png',
    HRT: '/assets/doors/smooth/HRTSWHT.png',
    N1: '/assets/doors/smooth/N1SWHT.png',
    N: '/assets/doors/smooth/NSWHT.png',
    QA: '/assets/doors/smooth/QASWHT.png',
    S1: '/assets/doors/smooth/S1SWHT.png',
    S2SL: '/assets/doors/smooth/S2SLSWHT.png',
    S2: '/assets/doors/smooth/S2SWHT.png',
    S3: '/assets/doors/smooth/S3SWHT.png',
    S4: '/assets/doors/smooth/S4SWHT.png',
    S836: '/assets/doors/smooth/S836SWHT.png',
    SF: '/assets/doors/smooth/SFSWHT.png',
    SHAK1: '/assets/doors/smooth/SHAK1SWHT.png',
    SHAK2: '/assets/doors/smooth/SHAK2SWHT.png',
    SHAK3: '/assets/doors/smooth/SHAK3SWHT.png',
    SO: '/assets/doors/smooth/SOSWHT.png',
    S: '/assets/doors/smooth/SSWHT.png',
    SW: '/assets/doors/smooth/SWSWHT.png',
  },
  textured: {
    '2PHD': '/assets/doors/textured/2PHDTCUSPNT.png',
    '3LT': '/assets/doors/textured/3LTTCUSPNT.png',
    '3PNG': '/assets/doors/textured/3PNGTCUSPNT.png',
    '3STEP': '/assets/doors/textured/3STEPTCUSPNT.png',
    '3STEP_FRONT': '/assets/doors/textured/3STEPTCUSPNTF.png',
    '4LT': '/assets/doors/textured/4LTTCUSPNT.png',
    '5LT': '/assets/doors/textured/5LTTCUSPNT.png',
    CR14: '/assets/doors/textured/CR14TCUSPNT.png',
    E1: '/assets/doors/textured/E1TCUSPNT.png',
    F1: '/assets/doors/textured/F1TCUSPNT.png',
    F2: '/assets/doors/textured/F2TCUSPNT.png',
    F3: '/assets/doors/textured/F3TCUSPNT.png',
    F4: '/assets/doors/textured/F4TCUSPNT.png',
    F4_FRONT: '/assets/doors/textured/F4TCUSPNTF.png',
    F42: '/assets/doors/textured/F42TCUSPNT.png',
    F42_FRONT: '/assets/doors/textured/F42TCUSPNTF.png',
    F48: '/assets/doors/textured/F48TCUSPNT.png',
    F764: '/assets/doors/textured/F764TCUSPNT.png',
    F848: '/assets/doors/textured/F848TCUSPNT.png',
    F864: '/assets/doors/textured/F864TCUSPNT.png',
    F: '/assets/doors/textured/FTCUSPNT.png',
    FRT: '/assets/doors/textured/FRTTCUSPNT.png',
    HDAT1: '/assets/doors/textured/HDAT1TCUSPNT.png',
    HRT: '/assets/doors/textured/HRTTCUSPNT.png',
    N1: '/assets/doors/textured/N1TCUSPNT.png',
    N: '/assets/doors/textured/NTCUSPNT.png',
    QA: '/assets/doors/textured/QATCUSPNT.png',
    S1: '/assets/doors/textured/S1TCUSPNT.png',
    S2: '/assets/doors/textured/S2TCUSPNT.png',
    S3: '/assets/doors/textured/S3TCUSPNT.png',
    S4: '/assets/doors/textured/S4TCUSPNT.png',
    S836: '/assets/doors/textured/S836TCUSPNT.png',
    SHAK1: '/assets/doors/textured/SHAK1TCUSPNT.png',
    SHAK2: '/assets/doors/textured/SHAK2TCUSPNT.png',
    SHAK3: '/assets/doors/textured/SHAK3TCUSPNT.png',
    SHAK3_GLASS: '/assets/doors/textured/SHAK3GLCUSPNT.png',
    SHAK3_TEXTURED_GLASS: '/assets/doors/textured/SHAK3TGLCUSPNT.png',
    SOT: '/assets/doors/textured/SOTCUSPNT.png',
    SW: '/assets/doors/textured/SWTCUSPNT.png',
  },
  cherry: {
    '2PNGSS': '/assets/doors/grain/cherry/2PNGCCUSPNT.png',
    '2PPLSS': '/assets/doors/grain/cherry/2PPLSSCCUSPNT.png',
    '3PNGSS': '/assets/doors/grain/cherry/3PNGSSMCUSPNT.png',
    CANGSS: '/assets/doors/grain/cherry/CANGSSTCUSPNT.png',
    CA: '/assets/doors/grain/cherry/CATCUSPNT.png',
    F48: '/assets/doors/grain/cherry/F48CCUSPNT.png',
    F482: '/assets/doors/grain/cherry/F482CCUSPNT.png',
    F482P: '/assets/doors/grain/cherry/F482PCCUSPNT.png',
    F: '/assets/doors/grain/cherry/FCCUSPNT.png',
    S1: '/assets/doors/grain/cherry/S1CCUSPNT.png',
    S: '/assets/doors/grain/cherry/SCCUSPNT.png',
  },
  fir: {
    CR14: '/assets/doors/grain/fir/CR14FCUSPNT.png',
    CR14_NO_GLASS: '/assets/doors/grain/fir/CR14FCUSPNTNOGLASS.png',
    F: '/assets/doors/grain/fir/FFCUSPNT.png',
    F_PANEL: '/assets/doors/grain/fir/FFPNLXX.png',
  },
  mahogany: {
    '3PNGSS': '/assets/doors/grain/mahogany/3PNGSSMCUSPNT.png',
    F48: '/assets/doors/grain/mahogany/F48MCUSPNT.png',
    F: '/assets/doors/grain/mahogany/FMCUSPNT.png',
    S1: '/assets/doors/grain/mahogany/S1MCUSPNT.png',
    S: '/assets/doors/grain/mahogany/SMCUSPNT.png',
    SO: '/assets/doors/grain/mahogany/SOTCUSPNT.png',
  },
  oak: {
    F48: '/assets/doors/grain/oak/F48TCUSPNT.png',
    F: '/assets/doors/grain/oak/FTCUSPNT.png',
    S1: '/assets/doors/grain/oak/S1TCUSPNT.png',
    S: '/assets/doors/grain/oak/STCUSPNT.png',
  },
} as const

type PreviewAssetSet = Record<string, string>
type GrainKey = Exclude<keyof typeof doorPreviewAssets, 'smooth' | 'textured'>
type PreviewAssetFamily = keyof typeof doorPreviewAssets

const previewAssetCodeAliases: Record<string, string[]> = {
  S1NGSS: ['S1'],
}

const grainPriority: GrainKey[] = ['oak', 'cherry', 'mahogany', 'fir']

function grainKey(grain?: string | null): GrainKey | undefined {
  const normalized = grain?.toLowerCase()
  return normalized === 'cherry' || normalized === 'fir' || normalized === 'mahogany' || normalized === 'oak' ? normalized : undefined
}

function candidateCodesForStyle(style: DoorStyle) {
  const variantCodes = style.variants.flatMap((variant) => [variant.code, ...(previewAssetCodeAliases[variant.code] ?? [])])
  return [...new Set([...variantCodes, style.code, ...(previewAssetCodeAliases[style.code] ?? [])])]
}

function resolveFromAssetSet(style: DoorStyle, assets: PreviewAssetSet, codes = candidateCodesForStyle(style)) {
  if (!style.hasGlass) {
    const noGlassAsset = codes
      .map((code) => assets[`${code}_NO_GLASS` as keyof typeof assets] ?? assets[`${code}_PANEL` as keyof typeof assets])
      .find(Boolean)
    if (noGlassAsset) return noGlassAsset
  }

  return codes.map((code) => assets[code]).find(Boolean)
}

function hasAssetInFamily(style: DoorStyle, family: PreviewAssetFamily) {
  return Boolean(resolveFromAssetSet(style, doorPreviewAssets[family]))
}

export function hasPaintPreviewAsset(style: DoorStyle) {
  return hasAssetInFamily(style, 'smooth') || hasAssetInFamily(style, 'textured')
}

export function hasStainPreviewAsset(style: DoorStyle) {
  return grainPriority.some((family) => hasAssetInFamily(style, family))
}

export function finishTypesForPreviewAssets(style: DoorStyle) {
  return (['paint', 'stain'] as const).filter((type) => type === 'paint' ? hasPaintPreviewAsset(style) : hasStainPreviewAsset(style))
}

export function resolveAutomaticPreviewGrain(style: DoorStyle): GrainKey | undefined {
  return grainPriority.find((family) => hasAssetInFamily(style, family)) ??
    grainPriority.find((family) => style.variants.some((variant) => variant.grains.some((grain) => grain.toLowerCase() === family)))
}

function hasTexturedMatch(product?: ResolvedDoorProduct | null) {
  return product?.matchingVariants.some((variant) => variant.lineId === 'textured-fiberglass') ?? false
}

export function resolveDoorPreviewAsset(style: DoorStyle, grain?: string | null, finishType?: Finish['finishType'], product?: ResolvedDoorProduct | null) {
  if (finishType === 'paint') {
    return resolveFromAssetSet(style, doorPreviewAssets.smooth) ??
      (hasTexturedMatch(product) ? resolveFromAssetSet(style, doorPreviewAssets.textured) : undefined) ??
      resolveFromAssetSet(style, doorPreviewAssets.textured) ??
      style.image
  }

  const key = grainKey(grain) ?? resolveAutomaticPreviewGrain(style)
  if (!key) return resolveFromAssetSet(style, doorPreviewAssets.textured) ?? style.image

  return resolveFromAssetSet(style, doorPreviewAssets[key]) ?? resolveFromAssetSet(style, doorPreviewAssets.textured) ?? style.image
}
