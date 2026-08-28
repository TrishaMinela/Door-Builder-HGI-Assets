import type { GridColor, GridPattern, GridStyle, GridWidth } from '../types'
import { isApprovedDecorativeGlassName } from './decorativeGlass'
import { isApprovedPrivacyGlassName } from './privacyGlass'

export type SideliteGlassCategory = 'clear' | 'decorative' | 'privacy' | 'clic' | 'blinds'
export type SideliteGlassOption = { id: string; name: string; category: SideliteGlassCategory; asset?: string }

const asset = (code: string) => `/assets/hgi-assets/Sidelites/FSL/Glass/FSL${code}.png`
const option = (code: string, name: string, category: SideliteGlassCategory = 'decorative'): SideliteGlassOption => ({ id: code.toLowerCase(), name, category, asset: asset(code) })

export const fslGlassCategories = [
  { id: 'clear', name: 'Clear Glass', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'decorative', name: 'Decorative Glass', image: '/assets/glass/thumbnails/Decorative.png' },
  { id: 'privacy', name: 'Privacy Glass', image: '/assets/glass/thumbnails/Privacy.png' },
  { id: 'clic', name: 'CLiC Glass', image: '/assets/glass/thumbnails/CLIC.png' },
  { id: 'blinds', name: 'Mini Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
] as const

const allFslGlassOptions: SideliteGlassOption[] = [
  { id: 'clear-no-grids', name: 'Clear Glass with No Grids', category: 'clear' },
  { id: 'clear-grids', name: 'Clear Glass with Grids', category: 'clear' },
  option('ASH', 'Ashbury'), option('BAY', 'Bay Point'), option('BER', 'Berkley'), option('BRI', 'Bristol'),
  option('CAD', 'Cadence'), option('CAL', 'Calandra'), option('CAR', 'Carrollton'), option('CAT', 'Catalina'),
  option('COB', 'Cobblestone'), option('COU', 'Courtyard'), option('CRO', 'Crosswalk'), option('DORNI', 'Dorian – Nickel'),
  option('DORPA', 'Dorian – Patina'), option('DUT', 'Dutchcraft'), option('EDG', 'Edgewood'), option('ELEBW', 'Elegant – Black/White'),
  option('ELENI', 'Elegant – Nickel'), option('ELEPA', 'Elegant – Patina'), option('GEN', 'Geneva'), option('GRA', 'Grace'),
  option('HEIBB', 'Heirlooms – Brass'), option('HEINI', 'Heirlooms – Nickel'), option('HIG', 'High Point'), option('JAC', 'Jacinto'),
  option('JAM', 'Jameston'), option('LAU', 'Laurel'), option('LAZ', 'Lazarus'), option('LEL', 'Leland'), option('LEX', 'Lexington'),
  option('LON', 'London'), option('MAJ', 'Majestic'), option('MOH', 'Mohave'),
  option('MONNI', 'Monterey – Nickel'), option('MONPA', 'Monterey – Patina'), option('NOUNI', 'Nouveau – Nickel'),
  option('NOUPA', 'Nouveau – Patina'), option('OAK', 'Oak Park'), option('OVA', 'Ovation'), option('PAR', 'Paris'),
  option('PEM', 'Pembrook'), option('PRE', 'Prestige'), option('REN', 'Renewed Impressions'), option('RIV', 'Riverwood'),
  option('STE', 'Sterling'), option('TOP', 'Topaz'), option('VIN', 'Vincraft'), option('WYN', 'Wyngate'),
  option('BLA', 'Blanca', 'privacy'), option('CELOC', 'Celestial', 'privacy'), option('CHI', 'Chinchilla', 'privacy'),
  option('CUM', 'Cumulus', 'privacy'), option('LIN', 'Linen', 'privacy'), option('MIC', 'Micro Granite', 'privacy'),
  option('RAI', 'Rain', 'privacy'), option('VAP', 'Vapor', 'privacy'),
  option('ENTL', 'CLiC – Left', 'clic'), option('ENTR', 'CLiC – Right', 'clic'),
  option('FRLBSL', 'Mini Blinds', 'blinds'),
]

export const fslGlassOptions = allFslGlassOptions.filter((glass) =>
  (glass.category !== 'decorative' || isApprovedDecorativeGlassName(glass.name))
  && (glass.category !== 'privacy' || isApprovedPrivacyGlassName(glass.name)),
)

export type SideliteGridRules = Partial<Record<GridPattern, Partial<Record<GridColor, GridWidth[]>>>>
export const fslStandardFlatRules: SideliteGridRules = {
  '2 Lite': { Bronze: ['5/8"'], White: ['7/8"'] },
  '3 Lite': { Bronze: ['5/8"'], White: ['7/8"'] },
  '4 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '5 Lite': { Beige: ['5/8"'], Bronze: ['5/8"'], Champagne: ['5/8"', '7/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
}
export const fslLowEFlatRules: SideliteGridRules = {
  '2 Lite': { Black: ['5/8"', '7/8"'], Bronze: ['5/8"'], 'Bronze/White': ['5/8"', '7/8"'], White: ['5/8"', '7/8"'] },
  '3 Lite': { Beige: ['5/8"', '7/8"'], Black: ['5/8"', '7/8"'], 'Bronze/White': ['5/8"', '7/8"'], White: ['5/8"', '7/8"'] },
  '4 Lite': { Black: ['5/8"', '7/8"'], Bronze: ['5/8"'], 'Bronze/White': ['5/8"', '7/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '5 Lite': { Beige: ['5/8"', '7/8"'], Black: ['5/8"', '7/8"'], Bronze: ['5/8"'], 'Bronze/White': ['5/8"', '7/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
}
export const fslStandardStyleRules: Partial<Record<GridStyle, SideliteGridRules>> = {
  'Arts & Crafts': { '3 Lite': { White: ['5/8"'] } },
  Contoured: { '5 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } },
  Flat: fslStandardFlatRules,
  Prairie: { '5 Lite': { Champagne: ['11/16"'], Tan: ['7/8"'], White: ['5/8"', '7/8"', '11/16"'] } },
}
export const fslLowEStyleRules: Partial<Record<GridStyle, SideliteGridRules>> = {
  'Arts & Crafts': { '3 Lite': { White: ['5/8"'] } },
  Contoured: { '5 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } },
  Flat: fslLowEFlatRules,
  Prairie: { '5 Lite': { Champagne: ['5/8"', '11/16"'], Tan: ['7/8"'], White: ['5/8"', '7/8"', '11/16"'] } },
}

export type FslGridCoatingId = 'standard' | 'low-e' | 'low-e-plus'
export type FslGridLocationId = 'external' | 'internal' | 'sdl'

export const fslExternalPatterns: Record<FslGridCoatingId, GridPattern[]> = {
  standard: [],
  'low-e': [],
  'low-e-plus': [],
}

export const fslSdlPatterns: Record<FslGridCoatingId, GridPattern[]> = {
  standard: ['3 Lite', '4 Lite', '5 Lite'],
  'low-e': ['3 Lite', '4 Lite', '5 Lite'],
  'low-e-plus': [],
}

const patternCodes: Partial<Record<GridPattern, string>> = { '2 Lite': '2L', '3 Lite': '3L', '4 Lite': '4L', '5 Lite': '5L' }
const colorCodes: Partial<Record<GridColor, string>> = { Beige: 'BE', Black: 'BL', Bronze: 'BZ', 'Bronze/White': 'WH', Champagne: 'CH', Tan: 'TA', White: 'WH' }
export const fslGridAsset = (pattern: GridPattern, color: GridColor) => `/assets/hgi-assets/Sidelites/FSL/Internal Grids/FSLINT${patternCodes[pattern]}${colorCodes[color]}.png`
const fslPrairieGridAssets: Partial<Record<GridColor, string>> = {
  Champagne: '/assets/hgi-assets/Glass/FSL/CLEAR STOCK/FSL Prairie Champagne.png',
  Tan: '/assets/hgi-assets/Glass/FSL/CLEAR STOCK/FSL Prairie Tan.png',
  White: '/assets/hgi-assets/Glass/FSL/CLEAR STOCK/FSL Prairie White.png',
}

export const fslPrairieGridAsset = (color: GridColor) => fslPrairieGridAssets[color] ?? fslPrairieGridAssets.White!
export const fslArtsAndCraftsGridAsset = (_color: GridColor) => '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FART3LWH.png'
