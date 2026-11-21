import type { HouseReading, LightPreference, StyleMood } from './types.js'
import { RECIPES, type Recipe } from './recipes.js'

const DARK_FINISH = /black|navy|forest|iron|tobacco|cherry|cinnamon|french-roast|mocha/
const LIGHT_FINISH = /white|eggshell|coastal|cozy|pewter|natural-gold|grey-ghost|oyster/
const LIGHT_SIDING = /white|cream|beige|light|pale|ivory|tan|yellow/
const DARK_SIDING = /black|charcoal|dark|navy|brown|brick|red|green|blue/

/** Higher when the finish contrasts the siding. Neutral sidings score in the middle. */
export function finishContrast(finishId: string, siding: string) {
  const text = siding.toLowerCase()
  const darkFinish = DARK_FINISH.test(finishId)
  const lightFinish = LIGHT_FINISH.test(finishId)
  if (LIGHT_SIDING.test(text)) return darkFinish ? 2 : lightFinish ? 0 : 1
  if (DARK_SIDING.test(text)) return lightFinish ? 2 : darkFinish ? 0 : 1
  return 1
}

export function chooseFinish(recipe: Recipe, siding: string, requested?: string) {
  if (requested && recipe.allowedFinishIds.includes(requested)) return requested
  const text = siding.toLowerCase()
  const preferred = LIGHT_SIDING.test(text) ? DARK_FINISH : DARK_SIDING.test(text) ? LIGHT_FINISH : null
  if (preferred) {
    const match = recipe.allowedFinishIds.find((id) => preferred.test(id))
    if (match) return match
  }
  return recipe.allowedFinishIds.includes(recipe.defaultFinishId) ? recipe.defaultFinishId : recipe.allowedFinishIds[0]
}

/**
 * Door identity before hardware and swing. Two recipes that differ only by
 * handleset or handing share a key once they wear the same finish.
 */
export function preferredDoorKey(recipe: Recipe, finishId: string) {
  const draft = recipe.draft
  const configuration = draft.selectedDoorConfigurationType === 'french' ? 'french' : 'single'
  const sidelites = draft.sidelites === 'both-sides' ? 'both-sides' : 'none'
  return [
    recipe.styleCode,
    configuration,
    sidelites,
    finishId,
    draft.glassId || 'none',
    draft.gridPathId || '',
    draft.gridPattern || '',
    draft.sideliteGlassId || '',
    draft.sideliteGridPattern || '',
  ].join('|')
}

function score(recipe: Recipe, mood: StyleMood, opening: HouseReading['opening']) {
  return (recipe.moods.includes(mood) ? 4 : 0) + (opening !== 'unknown' && recipe.opening === opening ? 3 : 0)
}

function rank(source: readonly Recipe[], mood: StyleMood, opening: HouseReading['opening']) {
  return [...source].sort((a, b) => score(b, mood, opening) - score(a, mood, opening) || a.id.localeCompare(b.id))
}

function pickDistinct(ranked: readonly Recipe[], siding: string) {
  const picked: Recipe[] = []
  const seen = new Set<string>()
  for (const recipe of ranked) {
    const key = preferredDoorKey(recipe, chooseFinish(recipe, siding))
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(recipe)
    if (picked.length === 3) break
  }
  return picked
}

export function selectRecipes(mood: StyleMood, light: LightPreference, opening: HouseReading['opening'], siding = '') {
  const matching = RECIPES.filter((recipe) => recipe.light === light)
  const pool = matching.length >= 2 ? matching : RECIPES
  const picked = pickDistinct(rank(pool, mood, opening), siding)
  if (picked.length >= 2 || pool === RECIPES) return picked
  const widened = pickDistinct(rank(RECIPES, mood, opening), siding)
  return widened.length > picked.length ? widened : picked
}
