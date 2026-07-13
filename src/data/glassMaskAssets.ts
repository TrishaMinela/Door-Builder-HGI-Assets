export const glassMaskAssets = {
  '3LT': '/assets/masks/3LT.png',
  '3STEP': '/assets/masks/3STEP.png',
  '4LT': '/assets/masks/4LT.png',
  '5LT': '/assets/masks/5LT.png',
  CA: '/assets/masks/CA.png',
  CR14: '/assets/masks/CR14.png',
  CR14PL: '/assets/masks/CR14PL.png',
  F: '/assets/masks/F.png',
  F2: '/assets/masks/F2.png',
  F3: '/assets/masks/F3.png',
  F4: '/assets/masks/F4.png',
  F48: '/assets/masks/F48.png',
  F482: '/assets/masks/F482.png',
  F764: '/assets/masks/F764.png',
  F848: '/assets/masks/F848.png',
  FO: '/assets/masks/FO.png',
  FRT: '/assets/masks/FRT.png',
  HRT: '/assets/masks/HRT.png',
  N: '/assets/masks/N.png',
  QA: '/assets/masks/QA.png',
  S: '/assets/masks/S.png',
  S2: '/assets/masks/S2.png',
  S3: '/assets/masks/S3.png',
  S4: '/assets/masks/S4.png',
  S836: '/assets/masks/S836.png',
  SAT: '/assets/masks/SAT.png',
  SO: '/assets/masks/SO.png',
  SO2: '/assets/masks/SO2.png',
  SW: '/assets/masks/SW.png',
} as const

export type GlassMaskCode = keyof typeof glassMaskAssets

export function resolveGlassMaskAsset(doorStyleCode: string) {
  return glassMaskAssets[doorStyleCode as GlassMaskCode] ?? null
}
