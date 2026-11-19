import type { HouseReading, LightPreference, StyleMood } from './types.js'
import { RECIPES, type Recipe } from './recipes.js'

const DARK_FINISH = /black|navy|forest|iron|tobacco|cherry|cinnamon|french-roast|mocha/
const LIGHT_FINISH = /white|eggshell|coastal|cozy|pewter|natural-gold|grey-ghost|oyster/

export function chooseFinish(recipe: Recipe, siding: string, requested?: string) {
  if (requested && recipe.allowedFinishIds.includes(requested)) return requested
  const text = siding.toLowerCase()
  const lightSiding = /white|cream|beige|light|pale|ivory|tan|yellow/.test(text)
  const darkSiding = /black|charcoal|dark|navy|brown|brick|red|green|blue/.test(text)
  const preferred = lightSiding ? DARK_FINISH : darkSiding ? LIGHT_FINISH : null
  if (preferred) {
    const match = recipe.allowedFinishIds.find((id) => preferred.test(id))
    if (match) return match
  }
  return recipe.allowedFinishIds.includes(recipe.defaultFinishId) ? recipe.defaultFinishId : recipe.allowedFinishIds[0]
}

function score(recipe: Recipe, mood: StyleMood, opening: HouseReading['opening']) {
  return (recipe.moods.includes(mood) ? 4 : 0) + (opening !== 'unknown' && recipe.opening === opening ? 3 : 0)
}

export function selectRecipes(mood: StyleMood, light: LightPreference, opening: HouseReading['opening']) {
  const pool = RECIPES.filter((recipe) => recipe.light === light)
  const ranked = [...(pool.length >= 2 ? pool : RECIPES)].sort((a, b) => score(b, mood, opening) - score(a, mood, opening) || a.id.localeCompare(b.id))
  const picked: Recipe[] = []
  for (const recipe of ranked) {
    if (picked.some((item) => item.styleCode === recipe.styleCode && item.opening === recipe.opening && item.defaultFinishId === recipe.defaultFinishId)) continue
    picked.push(recipe)
    if (picked.length === 3) break
  }
  for (const recipe of ranked) {
    if (picked.length >= 2) break
    if (!picked.includes(recipe)) picked.push(recipe)
  }
  return picked.slice(0, 3)
}
