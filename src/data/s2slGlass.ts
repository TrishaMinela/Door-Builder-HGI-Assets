import type { GridStyle } from '../types'
import type { SideliteGlassOption, SideliteGridRules } from './fslGlass'

export const s2slGlassCategories = [
  { id: 'clear', name: 'Clear Glass', image: '/assets/glass/thumbnails/Clear.png' },
] as const

export const s2slGlassOptions: SideliteGlassOption[] = [
  { id: 'clear-no-grids', name: 'Clear Glass with No Grids', category: 'clear' },
]

export const s2slStyleRules: Partial<Record<GridStyle, SideliteGridRules>> = {}
