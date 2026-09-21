import type { DoorStyle } from '../types'

export type DoorStyleThumbnailAsset = {
  image: string
  panel: DoorStyle['panel']
}

export const fallbackDoorStyleThumbnailAsset: DoorStyleThumbnailAsset = {
  image: '/assets/doors/2PNGSS.png',
  panel: 'classic',
}

// Card thumbnails are intentionally separate from live preview assets.
export const doorStyleThumbnailAssets: Record<string, DoorStyleThumbnailAsset> = {
  '2PNGSS': { image: '/assets/doors/2PNGSS.png', panel: 'classic' },
  '2PPLSS': { image: '/assets/doors/2PPLSS.png', panel: 'classic' },
  '2PHD': { image: '/assets/doors/2PHD.webp', panel: 'classic' },
  '3LT': { image: '/assets/doors/3LT.png', panel: 'modern' },
  '3PNG': { image: '/assets/doors/3PNG.webp', panel: 'classic' },
  '3PNGSS': { image: '/assets/doors/3PNG.webp', panel: 'classic' },
  '3STEP': { image: '/assets/doors/3STEP.png', panel: 'modern' },
  '4LT': { image: '/assets/doors/4LT.png', panel: 'modern' },
  '5LT': { image: '/assets/doors/5LT.png', panel: 'modern' },
  CA: { image: '/assets/doors/CA.png', panel: 'heritage' },
  CANGSS: { image: '/assets/doors/CANGSS.png', panel: 'heritage' },
  CR14: { image: '/assets/doors/CR14.webp', panel: 'craftsman' },
  CR14PL: { image: '/assets/doors/CR14PL.webp', panel: 'craftsman' },
  E1: { image: '/assets/doors/E1.webp', panel: 'classic' },
  F: { image: '/assets/doors/FULL LITE.webp', panel: 'modern' },
  F1: { image: '/assets/doors/F1.webp', panel: 'modern' },
  F2: { image: '/assets/doors/F2.png', panel: 'modern' },
  F3: { image: '/assets/doors/F3.webp', panel: 'modern' },
  F4: { image: '/assets/doors/F4.png', panel: 'modern' },
  F48: { image: '/assets/doors/F48.webp', panel: 'modern' },
  F482: { image: '/assets/doors/F482.webp', panel: 'modern' },
  F764: { image: '/assets/doors/F764.png', panel: 'modern' },
  F848: { image: '/assets/doors/F848.webp', panel: 'modern' },
  FO: { image: '/assets/doors/FO.png', panel: 'heritage' },
  FRT: { image: '/assets/doors/FRT.png', panel: 'heritage' },
  HDAT1: { image: '/assets/doors/HDAT.webp', panel: 'heritage' },
  HRT: { image: '/assets/doors/HRT.webp', panel: 'heritage' },
  N: { image: '/assets/doors/N.webp', panel: 'heritage' },
  N1: { image: '/assets/doors/N1.webp', panel: 'heritage' },
  QA: { image: '/assets/doors/QA.webp', panel: 'heritage' },
  S: { image: '/assets/doors/S.webp', panel: 'heritage' },
  S1: { image: '/assets/doors/S1.webp', panel: 'classic' },
  S1NGSS: { image: '/assets/doors/S1NGSS.webp', panel: 'classic' },
  S2: { image: '/assets/doors/S2.webp', panel: 'heritage' },
  S3: { image: '/assets/doors/S3.webp', panel: 'heritage' },
  S4: { image: '/assets/doors/S4.webp', panel: 'heritage' },
  S836: { image: '/assets/doors/S836.webp', panel: 'modern' },
  SAT: { image: '/assets/doors/SAT.webp', panel: 'heritage' },
  SHAK1: { image: '/assets/doors/SHAK1.webp', panel: 'modern' },
  SHAK2: { image: '/assets/doors/SHAK2.webp', panel: 'modern' },
  SHAK3: { image: '/assets/doors/SHAK3.webp', panel: 'modern' },
  SO: { image: '/assets/doors/SO.png', panel: 'heritage' },
  SO2: { image: '/assets/doors/SO2.png', panel: 'heritage' },
  SW: { image: '/assets/doors/SW.png', panel: 'heritage' },
}

export function getDoorStyleThumbnailAsset(codes: string[]): DoorStyleThumbnailAsset {
  return codes.map((code) => doorStyleThumbnailAssets[code]).find(Boolean) ?? fallbackDoorStyleThumbnailAsset
}

export function hasMappedDoorStyleThumbnailAsset(image: string) {
  return image !== fallbackDoorStyleThumbnailAsset.image
}
