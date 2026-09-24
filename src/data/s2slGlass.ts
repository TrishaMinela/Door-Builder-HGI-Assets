import type { GridStyle } from '../types.js'
import type { SideliteGlassOption, SideliteGridRules } from './fslGlass.js'

export const s2slGlassCategories = [
  { id: 'clear', name: 'Clear Glass', image: '/assets/glass/thumbnails/Clear.webp' },
] as const

export const s2slGlassOptions: SideliteGlassOption[] = [
  { id: 'clear-no-grids', name: 'Clear Glass with No Grids', category: 'clear' },
]

export const s2slStyleRules: Partial<Record<GridStyle, SideliteGridRules>> = {}
