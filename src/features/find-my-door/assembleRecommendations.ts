import { RECIPES, recipeById, type Recipe } from './recipes.js'
import { chooseFinish, finishContrast } from './selectRecipes.js'
import { consistentReason, recommendationSubtitle, resolveRecommendation, type ResolvedRecommendation } from './resolveRecommendation.js'
import type { HouseReading, LightPreference, StyleMood } from './types.js'

export const RECOMMENDATION_COUNT = 3

export type RawDoorPick = {
  id?: string
  recipeId?: string
  finishId?: string
  reason?: string
}

type Candidate = {
  recipe: Recipe
  finishId: string
  resolved: ResolvedRecommendation
  score: number
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

/**
 * Visual door identity after catalog normalization.
 * Hardware finish and swing are intentionally omitted: they do not make a second door.
 */
export function visualDoorKey(item: ResolvedRecommendation) {
  const door = item.configuration
  const grid = door.grid
  const sidelite = door.sideliteGlass
  return [
    door.style.id,
    door.doorConfigurationType ?? 'single',
    door.sidelites,
    door.finish.id,
    door.glass?.id ?? 'none',
    grid?.gridLocation ?? '',
    grid?.gridPattern ?? '',
    sidelite?.glass ?? '',
    sidelite?.gridLocation ?? '',
    sidelite?.gridPattern ?? '',
  ].join('|')
}

/** Title plus the subtitle rendered on the option card. */
export function cardTitleSubtitleKey(item: Pick<ResolvedRecommendation, 'title' | 'finishName' | 'glassName'>) {
  return `${item.title}\n${recommendationSubtitle(item.finishName, item.glassName)}`
}

export function styleFinishPairKey(item: ResolvedRecommendation) {
  return `${item.configuration.style.id}|${item.finish.id}`
}

function doorScore(recipe: Recipe, finishId: string, mood: StyleMood, light: LightPreference, opening: HouseReading['opening'], siding: string) {
  let score = 0
  if (recipe.light === light) score += 100
  if (recipe.moods.includes(mood)) score += 40
  if (opening !== 'unknown' && recipe.opening === opening) score += 30
  score += finishContrast(finishId, siding) * 10
  if (finishId === chooseFinish(recipe, siding)) score += 5
  return score
}

function compareScore(a: Candidate, b: Candidate) {
  return b.score - a.score || a.recipe.id.localeCompare(b.recipe.id) || a.finishId.localeCompare(b.finishId)
}

export function assembleRecommendations(input: {
  mood: StyleMood
  light: LightPreference
  house: HouseReading
  picks?: readonly RawDoorPick[]
}) {
  const { mood, light, house } = input
  const cache = new Map<string, ResolvedRecommendation | null>()
  const resolveDoor = (recipe: Recipe, finishId: string, reason: string) => {
    const key = `${recipe.id}\n${finishId}`
    let base = cache.get(key)
    if (base === undefined) {
      base = resolveRecommendation(recipe, finishId, '', house, mood)
      cache.set(key, base)
    }
    if (!base) return null
    return { ...base, reason: consistentReason(reason, base.finishName, base.styleName, house, mood) }
  }
  const candidateFor = (recipe: Recipe, finishId: string, reason: string): Candidate | null => {
    const resolved = resolveDoor(recipe, finishId, reason)
    if (!resolved) return null
    return {
      recipe,
      finishId: resolved.finish.id,
      resolved,
      score: doorScore(recipe, resolved.finish.id, mood, light, house.opening, house.siding),
    }
  }
  const clampPick = (recipe: Recipe, requested: string, reason: string) => {
    const ordered = [
      chooseFinish(recipe, house.siding, requested || undefined),
      chooseFinish(recipe, house.siding),
      ...[...recipe.allowedFinishIds].sort((a, b) => finishContrast(b, house.siding) - finishContrast(a, house.siding) || a.localeCompare(b)),
    ]
    const seen = new Set<string>()
    for (const finishId of ordered) {
      if (seen.has(finishId)) continue
      seen.add(finishId)
      const candidate = candidateFor(recipe, finishId, reason)
      if (candidate) return candidate
    }
    return null
  }

  const catalog: Candidate[] = []
  for (const recipe of RECIPES) {
    for (const finishId of recipe.allowedFinishIds) {
      const candidate = candidateFor(recipe, finishId, '')
      if (candidate) catalog.push(candidate)
    }
  }
  const inLight = catalog.filter((item) => item.recipe.light === light)
  const pool = new Set(inLight.map((item) => visualDoorKey(item.resolved))).size >= RECOMMENDATION_COUNT ? inLight : catalog
  const lightCanFill = pool === inLight

  const primary: Candidate[] = []
  for (const pick of (input.picks ?? []).slice(0, 8)) {
    const recipe = recipeById(clean(pick?.id || pick?.recipeId, 80))
    if (!recipe || (lightCanFill && recipe.light !== light)) continue
    const candidate = clampPick(recipe, clean(pick?.finishId, 80), clean(pick?.reason, 280))
    if (candidate) primary.push(candidate)
  }

  const ranked = [...pool].sort(compareScore)
  const picked: Candidate[] = []
  const visuals = new Set<string>()
  const cards = new Set<string>()
  const pairs = new Set<string>()
  const take = (candidates: readonly Candidate[], allowRepeatedPair: boolean) => {
    for (const candidate of candidates) {
      if (picked.length >= RECOMMENDATION_COUNT) return
      const visual = visualDoorKey(candidate.resolved)
      const card = cardTitleSubtitleKey(candidate.resolved)
      const pair = styleFinishPairKey(candidate.resolved)
      if (visuals.has(visual) || cards.has(card)) continue
      if (!allowRepeatedPair && pairs.has(pair)) continue
      visuals.add(visual)
      cards.add(card)
      pairs.add(pair)
      picked.push(candidate)
    }
  }
  // Keep photo-based picks that are already distinct, then fill from the highest-scoring catalog doors.
  // A repeated style-and-finish pair is used only when the catalog cannot supply three different pairs.
  take(primary, false)
  take(ranked, false)
  take(primary, true)
  take(ranked, true)
  return picked.map((item) => item.resolved)
}
