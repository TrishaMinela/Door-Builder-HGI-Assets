import assert from 'node:assert/strict'
import { RECIPES } from '../src/features/find-my-door/recipes.ts'
import { resolveRecommendation } from '../src/features/find-my-door/resolveRecommendation.ts'
import { chooseFinish, selectRecipes } from '../src/features/find-my-door/selectRecipes.ts'
import { LIGHT_CHOICES, STYLE_CHOICES } from '../src/features/find-my-door/types.ts'
import { resolveAiProduct } from '../server/aiDoorVisualization.ts'
import { dealerSlugFromPath } from '../src/utils/dealerSlug.ts'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission.ts'

const house = { architecture: 'Colonial', siding: 'white clapboard', trim: 'black', opening: 'single' as const }
const failures: string[] = []

for (const recipe of RECIPES) {
  for (const finishId of [recipe.defaultFinishId, ...recipe.allowedFinishIds]) {
    const resolved = resolveRecommendation(recipe, finishId, 'A deep finish contrasts the white clapboard and suits the lines of this colonial entry.', house, recipe.moods[0])
    if (!resolved) {
      failures.push(`${recipe.id} ${finishId} did not resolve`)
      continue
    }
    if (finishId === recipe.defaultFinishId) {
      try {
        resolveAiProduct(resolved.configuration, resolved.finish.id, resolved.preview.glass ? resolved.finish.id : undefined)
      } catch (error) {
        failures.push(`${recipe.id} rejected by the visualizer: ${error instanceof Error ? error.message : error}`)
      }
    }
  }
  const swapped = chooseFinish(recipe, 'white vinyl', 'not-a-finish')
  assert.equal(recipe.allowedFinishIds.includes(swapped), true, recipe.id)
}

for (const style of STYLE_CHOICES) {
  for (const light of LIGHT_CHOICES) {
    const picks = selectRecipes(style.id, light.id, 'unknown')
    if (picks.length < 2 || picks.length > 3) failures.push(`${style.id}/${light.id} returned ${picks.length}`)
    if (picks.some((pick) => pick.light !== light.id && RECIPES.filter((recipe) => recipe.light === light.id).length >= 2)) failures.push(`${style.id}/${light.id} left the light preference`)
  }
}

const sample = resolveRecommendation(RECIPES[0], RECIPES[0].defaultFinishId, '', house, 'timeless')
assert.ok(sample)
const lead = buildDoorBuilderSubmissionPayload({
  contact: { fullName: 'Ada Homeowner', email: 'ada@example.com', phone: '555-0100', zip: '46741', notes: 'Find My Door' },
  configuration: sample.configuration,
})
assert.equal(lead.postal_code, '46741')
assert.match(lead.door_style, /3\/4|F48/i)
assert.equal(dealerSlugFromPath('/findmydoor'), null)
assert.equal(failures.length, 0, failures.join('\n'))
console.log(`Find My Door catalog: ${RECIPES.length} recipes resolve and the visualizer accepts them.`)
