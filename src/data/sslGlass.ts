import type { GridColor, GridPattern, GridStyle, GridWidth } from '../types'
import type { SideliteGlassCategory, SideliteGlassOption, SideliteGridRules } from './fslGlass'

const asset = (code: string) => `/assets/hgi-assets/Sidelites/SSL/Glass/SSL${code}.png`
const option = (code: string, name: string, category: SideliteGlassCategory = 'decorative'): SideliteGlassOption => ({ id: code.toLowerCase(), name, category, asset: asset(code) })

export const sslGlassCategories = [
  { id: 'clear', name: 'Clear Glass', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'decorative', name: 'Decorative Glass', image: '/assets/glass/thumbnails/Decorative.png' },
  { id: 'privacy', name: 'Privacy Glass', image: '/assets/glass/thumbnails/Privacy.png' },
  { id: 'blinds', name: 'Mini Blinds', image: '/assets/glass/thumbnails/Blinds.png' },
] as const

export const sslGlassOptions: SideliteGlassOption[] = [
  { id: 'clear-no-grids', name: 'Clear Glass with No Grids', category: 'clear' },
  { id: 'clear-grids', name: 'Clear Glass with Grids', category: 'clear' },
  option('BER', 'Berkley'), option('BRI', 'Bristol'), option('COB', 'Cobblestone'), option('COU', 'Courtyard'),
  option('CRO', 'Crosswalk'), option('DORNI', 'Dorian – Nickel'), option('DORPA', 'Dorian – Patina'),
  option('DUT', 'Dutchcraft'), option('EDG', 'Edgewood'), option('ELEBW', 'Elegant – Black/White'),
  option('ELENI', 'Elegant – Nickel'), option('ELEPA', 'Elegant – Patina'), option('EMP', 'Empire'),
  option('GRA', 'Grace'), option('HEIBB', 'Heirlooms – Brass'), option('HEINI', 'Heirlooms – Nickel'),
  option('JAM', 'Jameston'), option('LAU', 'Laurel'), option('LAZ', 'Lazarus'), option('LEL', 'Leland'),
  option('LEX', 'Lexington'), option('LON', 'London'), option('MAJ', 'Majestic'), option('MAR', 'Margate'),
  option('MET', 'Metro'), option('MOH', 'Mohave'), option('NEO', 'Neo'), option('NOUNI', 'Nouveau – Nickel'),
  option('NOUPA', 'Nouveau – Patina'), option('OAK', 'Oak Park'), option('PAR', 'Paris'),
  option('PEM', 'Pembrook'), option('PRE', 'Prestige'), option('REN', 'Renewed Impressions'),
  option('TOP', 'Topaz'), option('VIL', 'Vilano'), option('VIN', 'Vincraft'), option('WTS', 'Waterside'),
  option('BLA', 'Blanca', 'privacy'), option('CHI', 'Chinchilla', 'privacy'), option('CUM', 'Cumulus', 'privacy'),
  option('LIN', 'Linen', 'privacy'), option('MIC', 'Micro Granite', 'privacy'), option('RAI', 'Rain', 'privacy'),
  option('VAP', 'Vapor', 'privacy'), option('RLBSL', 'Mini Blinds – Raise, Lower & Tilt', 'blinds'),
]

const both: GridWidth[] = ['5/8"', '7/8"']
export const sslStandardStyleRules: Partial<Record<GridStyle, SideliteGridRules>> = {
  'Arts & Crafts': { '3 Lite': { White: ['5/8"'] } },
  Contoured: { '3 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } },
  Flat: {
    '2 Lite': { Bronze: [], Tan: ['7/8"'], White: both },
    '3 Lite': { Beige: both, Bronze: [], Champagne: ['5/8"'], Tan: ['7/8"'], White: both },
  },
  Prairie: { '3 Lite': { Champagne: ['5/8"', '11/16"'], Tan: ['7/8"'], White: ['5/8"', '7/8"', '11/16"'] } },
}

export const sslLowEStyleRules: Partial<Record<GridStyle, SideliteGridRules>> = {
  'Arts & Crafts': { '3 Lite': { White: ['5/8"'] } },
  Contoured: { '3 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } },
  Flat: {
    '2 Lite': { Beige: both, Black: both, Bronze: [], 'Bronze/White': both, Tan: ['7/8"'], White: both },
    '3 Lite': { Beige: both, Black: both, Bronze: [], 'Bronze/White': both, Champagne: ['5/8"'], Tan: ['7/8"'], White: both },
  },
  Prairie: { '3 Lite': { Champagne: ['5/8"', '11/16"'], Tan: ['7/8"'], White: ['5/8"', '7/8"', '11/16"'] } },
}

const patternCodes: Partial<Record<GridPattern, string>> = { '2 Lite': '2L', '3 Lite': '3L' }
const colorCodes: Partial<Record<GridColor, string>> = { Beige: 'BE', Black: 'BL', Bronze: 'BZ', 'Bronze/White': 'WH', Champagne: 'CH', Tan: 'TA', White: 'WH' }
export const sslGridAsset = (pattern: GridPattern, color: GridColor) => `/assets/hgi-assets/Sidelites/SSL/Internal Grids/SSLINT${patternCodes[pattern]}${colorCodes[color]}.png`
