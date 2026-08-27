export type SideliteStyleId = 'fsl' | 'f48sl' | 'ssl' | 's2sl' | 'cr14sl'
export type SideliteAssetFamily = '20-gauge' | '22-gauge' | 'cherry' | 'fir' | 'mahogany' | 'oak'

type SideliteFamilySelection = {
  doorLineId?: string | null
  grain?: string | null
  doorStyleCode?: string | null
}

const SIDELITE_SLABS: Record<SideliteAssetFamily, Partial<Record<SideliteStyleId, string>>> = {
  '20-gauge': {
    fsl: '/assets/hgi-assets/Sidelites/20 Gauge/FSL.png',
    f48sl: '/assets/hgi-assets/Sidelites/20 Gauge/F48SL.png',
    s2sl: '/assets/hgi-assets/Sidelites/20 Gauge/S2SL.png',
  },
  '22-gauge': {
    fsl: '/assets/hgi-assets/Sidelites/22 Gauge/FSL.png',
    f48sl: '/assets/hgi-assets/Sidelites/22 Gauge/F48SL.png',
    ssl: '/assets/hgi-assets/Sidelites/Signature/Oak/SSL.png',
    s2sl: '/assets/hgi-assets/Sidelites/22 Gauge/S2SL.png',
  },
  cherry: {
    fsl: '/assets/hgi-assets/Sidelites/Signature/Cherry/FSL.png',
    f48sl: '/assets/hgi-assets/Sidelites/Signature/Cherry/F48SL.png',
    ssl: '/assets/hgi-assets/Sidelites/Signature/Cherry/SSL.png',
  },
  fir: {
    fsl: '/assets/hgi-assets/Sidelites/Signature/Fir/FSL.png',
    cr14sl: '/assets/hgi-assets/Sidelites/Signature/Fir/CR14SL.png',
  },
  mahogany: {
    fsl: '/assets/hgi-assets/Sidelites/Signature/Mahogany/FSL.png',
    f48sl: '/assets/hgi-assets/Sidelites/Signature/Mahogany/F48SL.png',
    ssl: '/assets/hgi-assets/Sidelites/Signature/Mahogany/SSL.png',
  },
  oak: {
    f48sl: '/assets/hgi-assets/Sidelites/Signature/Oak/F48SL.png',
    ssl: '/assets/hgi-assets/Sidelites/Signature/Oak/SSL.png',
  },
}

const SIDELITE_GLASS_MASKS: Record<SideliteStyleId, string> = {
  fsl: '/assets/masks/Sidelites/FSL.png',
  f48sl: '/assets/masks/Sidelites/F48SL.png',
  ssl: '/assets/masks/Sidelites/SSL.png',
  s2sl: '/assets/masks/Sidelites/S2SL.png',
  cr14sl: '/assets/masks/Sidelites/CR14SL.png',
}

/**
 * Resolve sidelites from the same authored surface family as the selected
 * main slab. Keep this centralized with the slab-asset exceptions so the
 * builder, captures, and exports cannot independently choose a texture.
 */
export function sideliteAssetFamilyForSlab({ doorLineId, grain, doorStyleCode }: SideliteFamilySelection): SideliteAssetFamily | null {
  if (doorLineId === 'signature-fiberglass') {
    const normalizedGrain = grain?.toLowerCase()
    if (normalizedGrain === 'cherry' || normalizedGrain === 'fir' || normalizedGrain === 'mahogany' || normalizedGrain === 'oak') return normalizedGrain
    return null
  }
  // F3 uses the supplied textured slab for both 22-Gauge and Brushed Smooth.
  // Its sidelite must therefore use the textured authored family as well.
  if (doorStyleCode === 'F3' && doorLineId === 'brushed-smooth-fiberglass') return '22-gauge'
  if (doorLineId === '20-gauge-smooth-steel' || doorLineId === 'brushed-smooth-fiberglass') return '20-gauge'
  if (doorLineId === '22-gauge-steel' || doorLineId === 'textured-fiberglass') return '22-gauge'
  return null
}

export function sideliteStylesForFamily(family: SideliteAssetFamily | null): SideliteStyleId[] {
  return family ? Object.keys(SIDELITE_SLABS[family]) as SideliteStyleId[] : []
}

export function sideliteSlabAsset(family: SideliteAssetFamily | null, style: SideliteStyleId | null) {
  return family && style ? SIDELITE_SLABS[family][style] : undefined
}

export function sideliteGlassMask(family: SideliteAssetFamily | null, style: SideliteStyleId | null) {
  if (!family || !style || !SIDELITE_SLABS[family][style]) return undefined
  // Every supplied F48SL slab is authored against the same current F48SL
  // opening. Keep glass, finish cutout, and generated insert trim on this one
  // shared mask instead of routing smooth slabs through the legacy mask.
  return SIDELITE_GLASS_MASKS[style]
}
