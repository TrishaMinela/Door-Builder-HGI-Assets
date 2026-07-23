import type { GridColor, GridPattern } from '../types'
import { glassOptions } from './glassOptions'
import type { SideliteGlassCategory, SideliteGlassOption } from './fslGlass'
import { s2slStyleRules } from './s2slGlass'

const privacyIds = new Set(['rain'])

export const cr14slGlassOptions: SideliteGlassOption[] = glassOptions
  .filter((option) => Boolean(option.overlaysByDoorStyle.CR14))
  .map((option) => ({
    id: option.id,
    name: option.name,
    category: (option.id === 'clear' ? 'clear' : privacyIds.has(option.id) ? 'privacy' : 'decorative') as SideliteGlassCategory,
    asset: option.overlaysByDoorStyle.CR14,
  }))

const categories = [
  { id: 'clear', name: 'Clear Glass', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'decorative', name: 'Decorative Glass', image: '/assets/glass/thumbnails/Decorative.png' },
  { id: 'privacy', name: 'Privacy Glass', image: '/assets/glass/thumbnails/Privacy.png' },
] as const

export const cr14slGlassCategories = categories.filter((category) => cr14slGlassOptions.some((option) => option.category === category.id))
export const cr14slStyleRules = s2slStyleRules
export const cr14slGridAsset = (_pattern: GridPattern, _color: GridColor) => ''
