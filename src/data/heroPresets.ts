export type HeroPreset = {
  styleCode: string
  finishKey: 'black-paint' | 'white-paint' | 'natural-stain' | 'harvest-stain' | 'nutmeg-stain' | 'toasted-caramel-stain' | 'brown-stain' | 'black-cherry-stain'
  glassId?: string
  glassName?: string
}

export const HERO_PRESETS: HeroPreset[] = [
  { styleCode: '2PHD', finishKey: 'black-paint' },
  { styleCode: '2PNGSS', finishKey: 'natural-stain' },
  { styleCode: '3LT', finishKey: 'white-paint', glassId: 'bristol' },
  { styleCode: '3STEP', finishKey: 'black-paint', glassId: 'paris' },
  { styleCode: '4LT', finishKey: 'natural-stain', glassId: 'oak-park' },
  { styleCode: '5LT', finishKey: 'white-paint', glassId: 'bay-point' },
  { styleCode: 'CR14', finishKey: 'black-paint', glassId: 'margate' },
  { styleCode: 'CR14PL', finishKey: 'harvest-stain', glassId: 'lexington' },
  { styleCode: 'F', finishKey: 'white-paint', glassId: 'vilano' },
  { styleCode: 'F2', finishKey: 'nutmeg-stain', glassId: 'leland' },
  { styleCode: 'F3', finishKey: 'black-paint', glassId: 'cobblestone' },
  { styleCode: 'F4', finishKey: 'natural-stain', glassId: 'ovation' },
  { styleCode: 'F48', finishKey: 'toasted-caramel-stain', glassId: 'lazarus' },
  { styleCode: 'F482', finishKey: 'brown-stain', glassId: 'dutchcraft', glassName: 'Dutch Craft' },
  { styleCode: 'F764', finishKey: 'white-paint', glassId: 'cadence' },
  { styleCode: 'F848', finishKey: 'black-cherry-stain', glassId: 'majestic-nickel', glassName: 'Majestic Elegance' },
  { styleCode: 'FO', finishKey: 'black-paint', glassId: 'mistify', glassName: 'Mistify - Black' },
  { styleCode: 'FRT', finishKey: 'harvest-stain', glassId: 'nouveau-nickel', glassName: 'Nouveau' },
  { styleCode: 'HDAT1', finishKey: 'white-paint', glassId: 'topaz' },
  { styleCode: 'HRT', finishKey: 'natural-stain', glassId: 'hrt-nouveau-nickel', glassName: 'Nouveau - Nickel' },
  { styleCode: 'QA', finishKey: 'black-paint', glassId: 'mohave' },
  { styleCode: 'S', finishKey: 'nutmeg-stain', glassId: 'waterside' },
  { styleCode: 'S2', finishKey: 'white-paint', glassId: 'entropy' },
  { styleCode: 'S3', finishKey: 'toasted-caramel-stain', glassId: 'heirlooms-nickel', glassName: 'Heirlooms' },
  { styleCode: 'S4', finishKey: 'black-paint', glassId: 'renewed-impressions' },
  { styleCode: 'S836', finishKey: 'brown-stain', glassId: 'privacy', glassName: 'Private Lites' },
  { styleCode: 'SAT', finishKey: 'white-paint', glassId: 'bristol' },
  { styleCode: 'SO', finishKey: 'black-cherry-stain', glassId: 'paris' },
  { styleCode: 'SO2', finishKey: 'black-paint', glassId: 'oak-park' },
]

export function heroDoorFilename(preset: HeroPreset, index: number) {
  const finish = preset.finishKey.replace(/-(paint|stain)$/, '')
  const glass = preset.glassId ? `-${preset.glassId}` : ''
  return `hero-${String(index + 1).padStart(2, '0')}-${preset.styleCode.toLowerCase()}-${finish}${glass}-v1.webp`
}
