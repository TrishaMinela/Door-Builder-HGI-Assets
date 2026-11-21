import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { builderUx } from '../src/config/builderUx.ts'
import { hasHouseImage, houseImageGeneration, houseImages, modeAfterOptionChange, resetHouseImages } from '../src/features/find-my-door/houseImageCache.ts'
import { FEATURED_DOOR, INSPIRATION } from '../src/features/find-my-door/inspiration.ts'
import { assembleRecommendations, cardTitleSubtitleKey, styleFinishPairKey, visualDoorKey } from '../src/features/find-my-door/assembleRecommendations.ts'
import { RECIPES, recipeById } from '../src/features/find-my-door/recipes.ts'
import { recommendationSubtitle, resolveRecommendation } from '../src/features/find-my-door/resolveRecommendation.ts'
import { chooseFinish, preferredDoorKey, selectRecipes } from '../src/features/find-my-door/selectRecipes.ts'
import { LIGHT_CHOICES, STYLE_CHOICES, type OpeningHint } from '../src/features/find-my-door/types.ts'
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
    assert.ok(resolved.title.toLowerCase().includes(resolved.finishName.toLowerCase()), `${recipe.id} title "${resolved.title}" does not include finish ${resolved.finishName}`)
    assert.ok(resolved.summary.startsWith(`${resolved.finishName} ·`), `${recipe.id} summary "${resolved.summary}"`)
    const otherFinish = resolved.finishName === 'Navy' ? 'Coastal Plain' : 'Navy'
    if (resolved.reason.toLowerCase().includes(otherFinish.toLowerCase()) && !`${house.siding} ${house.trim} ${house.architecture}`.toLowerCase().includes(otherFinish.toLowerCase())) {
      failures.push(`${recipe.id} reason names ${otherFinish} but the finish is ${resolved.finishName}`)
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
    const keys = picks.map((pick) => preferredDoorKey(pick, chooseFinish(pick, '')))
    if (new Set(keys).size !== picks.length) failures.push(`${style.id}/${light.id} collapsed to the same door`)
  }
}

const navy = RECIPES.find((recipe) => recipe.id === 'bold-navy-full')
const french = RECIPES.find((recipe) => recipe.id === 'bold-black-french')
const whiteLite = RECIPES.find((recipe) => recipe.id === 'coastal-white-full')
assert.ok(navy && french && whiteLite)
const coastalOnNavyRecipe = resolveRecommendation(navy, 'paint-coastal-plain', 'A deep navy slab would stand out, but a lighter coastal-plain finish would complement the pale siding.', house, 'bold')
assert.ok(coastalOnNavyRecipe)
assert.equal(coastalOnNavyRecipe.title, 'Coastal Plain full lite')
assert.equal(coastalOnNavyRecipe.finishName, 'Coastal Plain')
assert.match(coastalOnNavyRecipe.summary, /^Coastal Plain · Full Lite ·/)
assert.doesNotMatch(coastalOnNavyRecipe.title, /navy/i)
assert.doesNotMatch(coastalOnNavyRecipe.reason, /navy/i)
assert.match(coastalOnNavyRecipe.reason, /Coastal Plain/)
const whiteFrench = resolveRecommendation(french, 'paint-white', 'Black French doors make a stronger statement.', house, 'bold')
assert.equal(whiteFrench?.title, 'White French doors')
assert.equal(whiteFrench?.finishName, 'White')
const eggshellLite = resolveRecommendation(whiteLite, 'paint-eggshell', 'A white full lite keeps the entry bright against the pale siding.', house, 'coastal')
assert.equal(eggshellLite?.title, 'Eggshell full lite')
assert.match(eggshellLite?.reason ?? '', /Eggshell/)
assert.doesNotMatch(eggshellLite?.reason ?? '', /white full lite/i)
const sample = resolveRecommendation(RECIPES[0], RECIPES[0].defaultFinishId, '', house, 'timeless')
assert.ok(sample)
const lead = buildDoorBuilderSubmissionPayload({
  contact: { fullName: 'Ada Homeowner', email: 'ada@example.com', phone: '555-0100', zip: '46741', notes: 'Find My Door' },
  configuration: sample.configuration,
})
assert.equal(lead.postal_code, '46741')
assert.match(lead.door_style, /3\/4|F48/i)
assert.equal(dealerSlugFromPath('/findmydoor'), null)
assert.equal(builderUx.showFindMyDoorEntry, false)
assert.equal(FEATURED_DOOR, INSPIRATION[0])
assert.equal(INSPIRATION.length, 10)
assert.equal(INSPIRATION.some((door) => /round[- ]top/i.test(`${door.id} ${door.src} ${door.alt}`)), false)
const jargon = /\b(?:20|22)[ -]?gauge\b|fiberglass/i
for (const door of INSPIRATION) {
  assert.equal(jargon.test(door.alt), false, door.alt)
  assert.equal('name' in door || 'detail' in door || 'mood' in door, false, door.id)
}
const page = readFileSync(new URL('../src/features/find-my-door/FindMyDoorPage.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/features/find-my-door/FindMyDoor.css', import.meta.url), 'utf8')
const gallery = page.slice(page.indexOf('className="find-door-gallery"'), page.indexOf("step === 'style'"))
const hero = page.slice(page.indexOf('className="find-door-feature"'), page.indexOf('className="find-door-gallery"'))
assert.equal(gallery.includes('Tap one'), false)
assert.equal(/<button|onClick|door\.name|door\.detail|cursor:\s*pointer/.test(gallery), false)
assert.match(gallery, /Popular right now/)
assert.match(gallery, /aria-hidden="true"/)
assert.match(gallery, /alt=""/)
assert.equal(hero.includes('figcaption'), false)
assert.equal(jargon.test(hero + gallery), false)
assert.match(css, /@keyframes find-door-marquee\{from\{transform:translate3d\(0,0,0\)\}to\{transform:translate3d\(-50%,0,0\)\}/)
assert.match(css, /\.find-door-marquee:hover \.find-door-marquee-track\{animation-play-state:paused\}/)
assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*\.find-door-marquee-track\{animation:none\}/)
assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*overflow-x:auto/)
assert.equal(css.includes('find-door-gallery-row'), false)
assert.equal(page.includes('See this on my house'), false)
assert.match(page, /modeAfterOptionChange/)
const render = readFileSync(new URL('../src/features/find-my-door/HouseRender.tsx', import.meta.url), 'utf8')
assert.match(render, /CleanupComparisonSlider/)
assert.match(render, /originalLabel="Before"/)
assert.match(render, /resultLabel="After"/)
assert.match(render, /\.begin\(/)
resetHouseImages()
const photoA = 'blob:house-a'
const photoB = 'blob:house-b'
const images = houseImages(photoA)
let starts = 0
const generate = (door: string) => {
  const decision = images.begin(door)
  if (decision === 'start') {
    starts += 1
    images.fulfill(door, `image-${door}`)
  }
  return decision
}
let mode: 'door' | 'house' = 'house'
assert.equal(mode, 'house')
assert.equal(generate('option-a'), 'start')
mode = 'door'
assert.equal(mode, 'door')
mode = 'house'
assert.equal(generate('option-a'), 'cached')
mode = modeAfterOptionChange(mode === 'house', hasHouseImage(photoA, 'option-b'))
assert.equal(mode, 'door')
assert.equal(starts, 1)
mode = 'house'
assert.equal(mode, 'house')
assert.equal(generate('option-b'), 'start')
mode = modeAfterOptionChange(true, hasHouseImage(photoA, 'option-a'))
assert.equal(mode, 'house')
assert.equal(generate('option-a'), 'cached')
assert.equal(images.get('option-a'), 'image-option-a')
mode = modeAfterOptionChange(mode === 'house', hasHouseImage(photoA, 'option-b'))
assert.equal(mode, 'house')
assert.equal(generate('option-b'), 'cached')
assert.equal(images.get('option-b'), 'image-option-b')
assert.equal(starts, 2)
const generationBeforePhotoChange = houseImageGeneration()
assert.equal(houseImages(photoB).has('option-a'), false)
assert.notEqual(houseImageGeneration(), generationBeforePhotoChange)
const third = houseImages('blob:house-c')
assert.equal(third.begin('option-a'), 'start')
assert.equal(third.begin('option-a'), 'inflight')
third.fail('option-a')
assert.equal(third.begin('option-a'), 'start')
resetHouseImages()

const contrast = (color: string) => `${color} paint gives this colonial entry a crisp contrast against the pale siding.`
const sideliteHouse = { architecture: 'Colonial', siding: 'white clapboard', trim: 'white', opening: 'sidelites' as const }
const boldSidelites = recipeById('bold-sidelites')
const coastalSidelites = recipeById('coastal-sidelites')
const ironRecipe = recipeById('timeless-black-34')
assert.ok(boldSidelites && coastalSidelites && ironRecipe)
assert.notEqual(boldSidelites.draft.hardwareId, coastalSidelites.draft.hardwareId)
assert.equal(preferredDoorKey(boldSidelites, 'paint-black'), preferredDoorKey(coastalSidelites, 'paint-black'))
const matteBlack = resolveRecommendation(boldSidelites, 'paint-black', contrast('Black'), sideliteHouse, 'bold')
const satinNickel = resolveRecommendation(coastalSidelites, 'paint-black', contrast('Black'), sideliteHouse, 'bold')
const ironOre = resolveRecommendation(ironRecipe, 'paint-iron-ore', contrast('Iron Ore'), sideliteHouse, 'bold')
assert.ok(matteBlack && satinNickel && ironOre)
assert.equal(ironOre.title, 'Iron Ore 3/4 lite')
assert.equal(recommendationSubtitle(ironOre.finishName, ironOre.glassName), 'Iron Ore · Clear Glass with Grids')
assert.equal(matteBlack.title, 'Black 3/4 lite with sidelites')
assert.equal(satinNickel.title, matteBlack.title)
assert.equal(recommendationSubtitle(matteBlack.finishName, matteBlack.glassName), 'Black · Clear Glass with Grids')
assert.equal(recommendationSubtitle(satinNickel.finishName, satinNickel.glassName), recommendationSubtitle(matteBlack.finishName, matteBlack.glassName))
assert.notEqual(matteBlack.hardwareName, satinNickel.hardwareName)
assert.match(satinNickel.hardwareName, /nickel/i)
assert.equal(visualDoorKey(matteBlack), visualDoorKey(satinNickel))
assert.equal(cardTitleSubtitleKey(matteBlack), cardTitleSubtitleKey(satinNickel))
assert.equal(/schlage|satin|nickel|matte|LHI|RHO/i.test(visualDoorKey(matteBlack)), false)
const swung = {
  ...matteBlack,
  hardwareName: satinNickel.hardwareName,
  configuration: { ...matteBlack.configuration, doorSwing: { ...satinNickel.configuration.doorSwing }, hardware: satinNickel.configuration.hardware },
}
assert.equal(visualDoorKey(swung), visualDoorKey(matteBlack))
assert.equal(cardTitleSubtitleKey(swung), cardTitleSubtitleKey(matteBlack))

const brian = assembleRecommendations({
  mood: 'bold',
  light: 'some',
  house: sideliteHouse,
  picks: [
    { id: 'timeless-black-34', finishId: 'paint-iron-ore', reason: contrast('Iron Ore') },
    { id: 'bold-sidelites', finishId: 'paint-black', reason: contrast('Black') },
    { id: 'coastal-sidelites', finishId: 'paint-black', reason: contrast('Black') },
  ],
})
assert.deepEqual(brian.map((item) => [item.id, item.finish.id]), [
  ['timeless-black-34', 'paint-iron-ore'],
  ['bold-sidelites', 'paint-black'],
  ['bold-sidelites', 'paint-forest'],
])
assert.equal(brian[1].hardwareName, matteBlack.hardwareName)
assert.equal(brian.filter((item) => cardTitleSubtitleKey(item) === cardTitleSubtitleKey(matteBlack)).length, 1)
assert.equal(new Set(brian.map(visualDoorKey)).size, 3)
assert.equal(new Set(brian.map(cardTitleSubtitleKey)).size, 3)
assert.equal(new Set(brian.map(styleFinishPairKey)).size, 3)
const brianAgain = assembleRecommendations({
  mood: 'bold',
  light: 'some',
  house: sideliteHouse,
  picks: [
    { recipeId: 'timeless-black-34', finishId: 'paint-iron-ore', reason: contrast('Iron Ore') },
    { recipeId: 'bold-sidelites', finishId: 'paint-black', reason: contrast('Black') },
    { recipeId: 'coastal-sidelites', finishId: 'paint-black', reason: contrast('Black') },
  ],
})
assert.deepEqual(brianAgain.map((item) => [item.id, item.finish.id, item.title]), brian.map((item) => [item.id, item.finish.id, item.title]))

const snapped = assembleRecommendations({
  mood: 'bold',
  light: 'some',
  house: sideliteHouse,
  picks: [
    { id: 'bold-sidelites', finishId: 'not-a-finish', reason: contrast('Black') },
    { id: 'coastal-sidelites', finishId: 'paint-black', reason: contrast('Black') },
    { id: 'rustic-farmhouse', finishId: 'paint-black', reason: contrast('Black') },
  ],
})
assert.equal(snapped.length, 3)
assert.equal(snapped.filter((item) => visualDoorKey(item) === visualDoorKey(matteBlack)).length, 1)
assert.equal(new Set(snapped.map(visualDoorKey)).size, 3)
assert.equal(new Set(snapped.map(cardTitleSubtitleKey)).size, 3)
assert.equal(new Set(snapped.map(styleFinishPairKey)).size, 3)
assert.equal(snapped[0].id, 'bold-sidelites')
assert.equal(snapped[0].finish.id, 'paint-black')

const sameFinish = assembleRecommendations({
  mood: 'coastal',
  light: 'some',
  house: sideliteHouse,
  picks: [
    { id: 'coastal-sidelites', finishId: 'paint-coastal-plain', reason: contrast('Coastal Plain') },
    { id: 'bold-sidelites', finishId: 'paint-coastal-plain', reason: contrast('Coastal Plain') },
    { id: 'rustic-farmhouse', finishId: 'paint-coastal-plain', reason: contrast('Coastal Plain') },
  ],
})
const coastalPlain = resolveRecommendation(coastalSidelites, 'paint-coastal-plain', contrast('Coastal Plain'), sideliteHouse, 'coastal')
assert.ok(coastalPlain)
assert.equal(sameFinish.filter((item) => visualDoorKey(item) === visualDoorKey(coastalPlain)).length, 1)
assert.equal(new Set(sameFinish.map(cardTitleSubtitleKey)).size, 3)

const brickHouse = { architecture: 'Brick colonial', siding: 'red brick', trim: 'white', opening: 'single' as const }
const navyFull = recipeById('bold-navy-full')
const whiteFull = recipeById('coastal-white-full')
assert.ok(navyFull && whiteFull)
const whiteFromNavy = resolveRecommendation(navyFull, 'paint-white', contrast('White'), brickHouse, 'bold')
const whiteFromCoastal = resolveRecommendation(whiteFull, 'paint-white', contrast('White'), brickHouse, 'bold')
assert.ok(whiteFromNavy && whiteFromCoastal)
assert.equal(visualDoorKey(whiteFromNavy), visualDoorKey(whiteFromCoastal))
assert.notEqual(whiteFromNavy.hardwareName, whiteFromCoastal.hardwareName)
assert.equal(cardTitleSubtitleKey(whiteFromNavy), cardTitleSubtitleKey(whiteFromCoastal))
const collapsedFullLites = assembleRecommendations({
  mood: 'bold',
  light: 'lots',
  house: brickHouse,
  picks: [
    { id: 'bold-navy-full', finishId: 'paint-white', reason: 'White full lite keeps a brick entry from feeling heavy or dark.' },
    { id: 'coastal-white-full', finishId: 'paint-white', reason: 'A white full lite lightens the brick and brings in the glass.' },
  ],
})
assert.equal(collapsedFullLites.filter((item) => visualDoorKey(item) === visualDoorKey(whiteFromNavy)).length, 1)
assert.equal(new Set(collapsedFullLites.map(styleFinishPairKey)).size, 3)

const sameColorDifferentOpening = assembleRecommendations({
  mood: 'bold',
  light: 'some',
  house: { architecture: 'Colonial', siding: 'white clapboard', trim: 'white', opening: 'single' },
  picks: [
    { id: 'timeless-black-34', finishId: 'paint-black', reason: contrast('Black') },
    { id: 'bold-sidelites', finishId: 'paint-black', reason: contrast('Black') },
  ],
})
assert.equal(sameColorDifferentOpening.filter((item) => item.finish.id === 'paint-black').length, 1)
assert.equal(new Set(sameColorDifferentOpening.map(styleFinishPairKey)).size, 3)

const openings: OpeningHint[] = ['single', 'double', 'sidelites', 'unknown']
const sidings = ['', 'white clapboard', 'red brick']
for (const style of STYLE_CHOICES) {
  for (const light of LIGHT_CHOICES) {
    for (const opening of openings) {
      for (const siding of sidings) {
        const label = `${style.id}/${light.id}/${opening}/${siding || 'unsided'}`
        const recipes = selectRecipes(style.id, light.id, opening, siding)
        const recipeKeys = recipes.map((recipe) => preferredDoorKey(recipe, chooseFinish(recipe, siding)))
        if (new Set(recipeKeys).size !== recipes.length) failures.push(`${label} recipe list repeats a door`)
        const house = { architecture: 'Colonial', siding, trim: 'white', opening }
        const doors = assembleRecommendations({ mood: style.id, light: light.id, house })
        if (doors.length !== 3) failures.push(`${label} returned ${doors.length}`)
        const visuals = new Set(doors.map(visualDoorKey))
        const cards = new Set(doors.map(cardTitleSubtitleKey))
        const pairs = new Set(doors.map(styleFinishPairKey))
        if (visuals.size !== doors.length) failures.push(`${label} visual keys ${[...visuals].join(' | ')}`)
        if (cards.size !== doors.length) failures.push(`${label} cards ${doors.map(cardTitleSubtitleKey).join(' | ')}`)
        if (pairs.size !== doors.length) failures.push(`${label} style/finish ${[...pairs].join(' | ')}`)
        if (doors.some((door) => recipeById(door.id)?.light !== light.id)) failures.push(`${label} left the glass preference`)
        const seed = doors[0]
        if (!seed) continue
        const poisoned = assembleRecommendations({
          mood: style.id,
          light: light.id,
          house,
          picks: [
            { id: seed.id, finishId: seed.finish.id, reason: seed.reason },
            { id: seed.id, finishId: seed.finish.id, reason: seed.reason },
            { recipeId: seed.id, finishId: seed.finish.id, reason: 'Same door with a different hardware finish and swing.' },
          ],
        })
        if (poisoned.length !== 3) failures.push(`${label} poisoned returned ${poisoned.length}`)
        if (new Set(poisoned.map(visualDoorKey)).size !== poisoned.length) failures.push(`${label} poisoned visual duplicate`)
        if (new Set(poisoned.map(cardTitleSubtitleKey)).size !== poisoned.length) failures.push(`${label} poisoned card duplicate`)
        if (new Set(poisoned.map(styleFinishPairKey)).size !== poisoned.length) failures.push(`${label} poisoned style/finish duplicate`)
        if (poisoned.filter((door) => visualDoorKey(door) === visualDoorKey(seed)).length !== 1) failures.push(`${label} poisoned seed was repeated or dropped`)
      }
    }
  }
}

const apiSource = readFileSync(new URL('../api/recommend-door.ts', import.meta.url), 'utf8')
assert.match(apiSource, /Hardware finish and door swing do not make a door different/)
assert.match(apiSource, /assembleRecommendations/)
assert.match(apiSource, /minItems: 3/)
assert.equal(apiSource.includes('picksFromModel'), false)
assert.match(page, /assembleRecommendations/)
assert.match(page, /recommendationSubtitle/)
assert.equal(page.includes('item.id === recipe.id'), false)

assert.equal(failures.length, 0, failures.join('\n'))
console.log(`Find My Door catalog: ${RECIPES.length} recipes resolve and the visualizer accepts them.`)
