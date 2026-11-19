import type { DoorBuilderDraftConfiguration } from '../../utils/doorBuilderDraft'
import type { LightPreference, OpeningHint, StyleMood } from './types'

export type Recipe = {
  id: string
  title: string
  moods: StyleMood[]
  light: LightPreference
  opening: OpeningHint
  styleCode: string
  defaultFinishId: string
  allowedFinishIds: string[]
  draft: DoorBuilderDraftConfiguration
}

const blank: DoorBuilderDraftConfiguration = {
  selectedDoorConfigurationType: 'single',
  styleId: '',
  doorLineId: '',
  grainId: '',
  sidelites: 'none',
  sideliteStyleId: '',
  sideliteGlassCategory: '',
  sideliteGlassId: '',
  sideliteGlassGroupKey: '',
  sideliteGlassVariantConfirmed: false,
  sideliteGridLocation: '',
  sideliteGridStyle: '',
  sideliteGridPattern: '',
  sideliteGridColor: '',
  sideliteGridWidth: '',
  selectedFinishType: 'paint',
  selectedPaint: '',
  selectedStain: '',
  jambType: 'timber',
  jambFinishType: 'paint',
  jambFinishColor: '',
  jambFinishOverridden: false,
  selectedGlassCategory: '',
  glassId: '',
  selectedGlassGroupKey: '',
  glassVariantConfirmed: false,
  glassFrameColorMode: 'match-door',
  glassFrameFinishId: '',
  glassFrameFinishType: 'paint',
  gridPathId: '',
  gridStyle: '',
  gridPattern: '',
  gridColor: '',
  gridWidth: '',
  hardwareId: 'schlage-century-handleset-matte-black-left',
  doubleDoorLockPrep: '',
  doorSwingId: 'LHI',
}

const black = 'paint-black'
const white = 'paint-white'
const navy = 'paint-navy'
const forest = 'paint-forest'
const iron = 'paint-iron-ore'
const eggshell = 'paint-eggshell'
const coastal = 'paint-coastal-plain'
const nutmeg = 'stain-nutmeg'
const tobacco = 'stain-tobacco-road'
const cherry = 'stain-black-cherry'
const gold = 'stain-natural-gold'
const matteBlack = 'schlage-century-handleset-matte-black-left'
const satinNickel = 'schlage-century-handleset-satin-nickel-left'
const bronze = 'baldwin-adirondack-dark-bronze-right'
const steelPaints = [black, white, navy, forest, iron, eggshell, coastal, 'paint-pewter', 'paint-cozy-cottage']
const woodStains = [nutmeg, tobacco, cherry, gold, 'stain-cinnamon', 'stain-french-roast', 'stain-toasted-caramel']

function recipe(partial: Omit<Recipe, 'draft'> & { draft: Partial<DoorBuilderDraftConfiguration> }): Recipe {
  return { ...partial, draft: { ...blank, ...partial.draft } }
}

const sideliteGrids: Partial<DoorBuilderDraftConfiguration> = {
  sidelites: 'both-sides',
  sideliteStyleId: 'f48sl',
  sideliteGlassCategory: 'clear',
  sideliteGlassId: 'clear-grids',
  sideliteGlassGroupKey: 'clear glass with grids',
  sideliteGlassVariantConfirmed: true,
  sideliteGridLocation: 'sdl',
  sideliteGridPattern: '4 Lite',
}

/**
 * Complete builder drafts. Every id is a catalog value the door builder already
 * accepts. Finish swaps stay inside allowedFinishIds, which the resolver checks
 * against the live finish list for that slab and material.
 */
export const RECIPES: Recipe[] = [
  recipe({
    id: 'timeless-black-34',
    title: 'Black 3/4 lite',
    moods: ['timeless', 'bold'],
    light: 'some',
    opening: 'single',
    styleCode: 'F48',
    defaultFinishId: black,
    allowedFinishIds: steelPaints,
    draft: {
      styleId: 'f48-3-4-lite',
      doorLineId: '20-gauge-smooth-steel',
      selectedPaint: black,
      jambFinishColor: black,
      glassFrameFinishId: black,
      selectedGlassCategory: 'clear',
      glassId: 'f48-clear-grids',
      selectedGlassGroupKey: 'clear-glass-with-grids',
      glassVariantConfirmed: true,
      gridPathId: 'sdl',
      gridPattern: '4 Lite',
      hardwareId: matteBlack,
    },
  }),
  recipe({
    id: 'timeless-white-six',
    title: 'White six panel',
    moods: ['timeless', 'coastal'],
    light: 'privacy',
    opening: 'single',
    styleCode: 'S1',
    defaultFinishId: white,
    allowedFinishIds: steelPaints,
    draft: {
      styleId: 's1-six-panel-no-glass',
      doorLineId: '20-gauge-smooth-steel',
      selectedPaint: white,
      jambFinishColor: white,
      glassFrameFinishId: white,
      hardwareId: satinNickel,
    },
  }),
  recipe({
    id: 'warm-craftsman',
    title: 'Nutmeg craftsman',
    moods: ['warm', 'rustic'],
    light: 'some',
    opening: 'single',
    styleCode: 'CR14',
    defaultFinishId: nutmeg,
    allowedFinishIds: [...woodStains, black, white, navy],
    draft: {
      styleId: 'cr14-craftsman-1-4-rectangle',
      doorLineId: 'signature-series',
      grainId: 'Fir',
      selectedFinishType: 'stain',
      selectedStain: nutmeg,
      jambFinishType: 'stain',
      jambFinishColor: nutmeg,
      glassFrameFinishId: nutmeg,
      glassFrameFinishType: 'stain',
      selectedGlassCategory: 'clear',
      glassId: 'cr14-divided-lites',
      selectedGlassGroupKey: 'craftsman-divided-lites',
      glassVariantConfirmed: true,
      hardwareId: bronze,
    },
  }),
  recipe({
    id: 'warm-mahogany-half',
    title: 'Mahogany half lite',
    moods: ['warm', 'timeless'],
    light: 'some',
    opening: 'single',
    styleCode: 'S',
    defaultFinishId: tobacco,
    allowedFinishIds: [...woodStains, black, white],
    draft: {
      styleId: 's-half-lite',
      doorLineId: 'signature-series',
      grainId: 'Mahogany',
      selectedFinishType: 'stain',
      selectedStain: tobacco,
      jambFinishType: 'stain',
      jambFinishColor: tobacco,
      glassFrameFinishId: tobacco,
      glassFrameFinishType: 'stain',
      selectedGlassCategory: 'clear',
      glassId: 's-clear-no-grids',
      selectedGlassGroupKey: 'clear-glass',
      glassVariantConfirmed: true,
      hardwareId: bronze,
    },
  }),
  recipe({
    id: 'bold-navy-full',
    title: 'Navy full lite',
    moods: ['bold', 'modern'],
    light: 'lots',
    opening: 'single',
    styleCode: 'F',
    defaultFinishId: navy,
    allowedFinishIds: steelPaints,
    draft: {
      styleId: 'f-full-lite',
      doorLineId: '20-gauge-smooth-steel',
      selectedPaint: navy,
      jambFinishColor: navy,
      glassFrameFinishId: navy,
      selectedGlassCategory: 'clear',
      glassId: 'f-clear-no-grids',
      selectedGlassGroupKey: 'clear-glass-with-no-grids',
      glassVariantConfirmed: true,
      hardwareId: matteBlack,
    },
  }),
  recipe({
    id: 'bold-black-french',
    title: 'Black French doors',
    moods: ['bold', 'timeless'],
    light: 'lots',
    opening: 'double',
    styleCode: 'F',
    defaultFinishId: black,
    allowedFinishIds: steelPaints,
    draft: {
      selectedDoorConfigurationType: 'french',
      styleId: 'f-full-lite',
      doorLineId: '20-gauge-smooth-steel',
      selectedPaint: black,
      jambFinishColor: black,
      glassFrameFinishId: black,
      selectedGlassCategory: 'clear',
      glassId: 'f-clear-grids',
      selectedGlassGroupKey: 'clear-glass-with-grids',
      glassVariantConfirmed: true,
      gridPathId: 'sdl',
      gridPattern: '8 Lite',
      hardwareId: matteBlack,
      doubleDoorLockPrep: 'DDLLBO',
    },
  }),
  recipe({
    id: 'modern-flush-black',
    title: 'Black flush',
    moods: ['modern', 'bold'],
    light: 'privacy',
    opening: 'single',
    styleCode: 'F1',
    defaultFinishId: black,
    allowedFinishIds: steelPaints,
    draft: {
      styleId: 'f1-flush-no-glass',
      doorLineId: '20-gauge-smooth-steel',
      selectedPaint: black,
      jambFinishColor: black,
      glassFrameFinishId: black,
      hardwareId: matteBlack,
    },
  }),
  recipe({
    id: 'modern-shaker-white',
    title: 'White shaker',
    moods: ['modern', 'coastal'],
    light: 'privacy',
    opening: 'single',
    styleCode: 'SHAK2',
    defaultFinishId: white,
    allowedFinishIds: steelPaints,
    draft: {
      styleId: 'shak2-2-panel-shaker',
      doorLineId: '20-gauge-smooth-steel',
      selectedPaint: white,
      jambFinishColor: white,
      glassFrameFinishId: white,
      hardwareId: satinNickel,
    },
  }),
  recipe({
    id: 'rustic-farmhouse',
    title: 'Forest farmhouse with sidelites',
    moods: ['rustic', 'warm'],
    light: 'some',
    opening: 'sidelites',
    styleCode: 'F48',
    defaultFinishId: forest,
    allowedFinishIds: steelPaints,
    draft: {
      styleId: 'f48-3-4-lite',
      doorLineId: '20-gauge-smooth-steel',
      selectedPaint: forest,
      jambFinishColor: forest,
      glassFrameFinishId: forest,
      selectedGlassCategory: 'clear',
      glassId: 'f48-clear-grids',
      selectedGlassGroupKey: 'clear-glass-with-grids',
      glassVariantConfirmed: true,
      gridPathId: 'sdl',
      gridPattern: '4 Lite',
      hardwareId: matteBlack,
      ...sideliteGrids,
    },
  }),
  recipe({
    id: 'coastal-white-full',
    title: 'White full lite',
    moods: ['coastal', 'modern'],
    light: 'lots',
    opening: 'single',
    styleCode: 'F',
    defaultFinishId: white,
    allowedFinishIds: steelPaints,
    draft: {
      styleId: 'f-full-lite',
      doorLineId: '20-gauge-smooth-steel',
      selectedPaint: white,
      jambFinishColor: white,
      glassFrameFinishId: white,
      selectedGlassCategory: 'clear',
      glassId: 'f-clear-no-grids',
      selectedGlassGroupKey: 'clear-glass-with-no-grids',
      glassVariantConfirmed: true,
      hardwareId: satinNickel,
    },
  }),
  recipe({
    id: 'coastal-sidelites',
    title: 'Coastal 3/4 lite with sidelites',
    moods: ['coastal', 'warm'],
    light: 'some',
    opening: 'sidelites',
    styleCode: 'F48',
    defaultFinishId: coastal,
    allowedFinishIds: steelPaints,
    draft: {
      styleId: 'f48-3-4-lite',
      doorLineId: '20-gauge-smooth-steel',
      selectedPaint: coastal,
      jambFinishColor: coastal,
      glassFrameFinishId: coastal,
      selectedGlassCategory: 'clear',
      glassId: 'f48-clear-grids',
      selectedGlassGroupKey: 'clear-glass-with-grids',
      glassVariantConfirmed: true,
      gridPathId: 'sdl',
      gridPattern: '4 Lite',
      hardwareId: satinNickel,
      ...sideliteGrids,
    },
  }),
  recipe({
    id: 'privacy-rain',
    title: 'Privacy 3/4 lite',
    moods: ['timeless', 'modern', 'bold'],
    light: 'privacy',
    opening: 'single',
    styleCode: 'F48',
    defaultFinishId: iron,
    allowedFinishIds: steelPaints,
    draft: {
      styleId: 'f48-3-4-lite',
      doorLineId: '20-gauge-smooth-steel',
      selectedPaint: iron,
      jambFinishColor: iron,
      glassFrameFinishId: iron,
      selectedGlassCategory: 'privacy',
      glassId: 'rain',
      selectedGlassGroupKey: 'rain',
      glassVariantConfirmed: true,
      hardwareId: matteBlack,
    },
  }),
  recipe({
    id: 'bold-sidelites',
    title: 'Black 3/4 lite with sidelites',
    moods: ['bold', 'rustic'],
    light: 'some',
    opening: 'sidelites',
    styleCode: 'F48',
    defaultFinishId: black,
    allowedFinishIds: steelPaints,
    draft: {
      styleId: 'f48-3-4-lite',
      doorLineId: '20-gauge-smooth-steel',
      selectedPaint: black,
      jambFinishColor: black,
      glassFrameFinishId: black,
      selectedGlassCategory: 'clear',
      glassId: 'f48-clear-grids',
      selectedGlassGroupKey: 'clear-glass-with-grids',
      glassVariantConfirmed: true,
      gridPathId: 'sdl',
      gridPattern: '4 Lite',
      hardwareId: matteBlack,
      ...sideliteGrids,
    },
  }),
]

export function recipeById(id: string) {
  return RECIPES.find((recipe) => recipe.id === id) ?? null
}

export function recipeMenu() {
  return RECIPES.map((recipe) => [
    recipe.id,
    `light=${recipe.light}`,
    `moods=${recipe.moods.join(',')}`,
    `opening=${recipe.opening}`,
    recipe.title,
    `finishes=${recipe.allowedFinishIds.join(',')}`,
  ].join(' | ')).join('\n')
}
