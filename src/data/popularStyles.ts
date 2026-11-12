import type { DoorBuilderDraftConfiguration } from '../utils/doorBuilderDraft'

export type PopularStyle = {
  id: string
  name: string
  detail: string
  thumbnail: string
  configuration: DoorBuilderDraftConfiguration
}

const baseConfiguration: DoorBuilderDraftConfiguration = {
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
  hardwareId: '',
  doubleDoorLockPrep: '',
  doorSwingId: 'LHI',
}

const smoothSteel = '20-gauge-smooth-steel'
const centuryMatteBlack = 'schlage-century-handleset-matte-black-left'
const blackPaint = 'paint-black'

function style(
  id: string,
  name: string,
  detail: string,
  thumbnail: string,
  configuration: Partial<DoorBuilderDraftConfiguration>,
): PopularStyle {
  const next = { ...baseConfiguration, ...configuration }
  const finishId = next.selectedFinishType === 'stain' ? next.selectedStain : next.selectedPaint
  return {
    id,
    name,
    detail,
    thumbnail,
    configuration: {
      ...next,
      jambFinishType: next.selectedFinishType || 'paint',
      jambFinishColor: finishId,
      glassFrameFinishId: finishId,
      glassFrameFinishType: next.selectedFinishType === 'stain' ? 'stain' : 'paint',
    },
  }
}

/**
 * Customer-facing quick starts. Every id is a real catalog value.
 * Forest is the paint named "Forest" (there is no separate "Forest green").
 * Swing is Left Hand Inswing on every preset; only the farmhouse build named it,
 * and the others use that same exterior handing.
 */
export const POPULAR_STYLES: PopularStyle[] = [
  style(
    'modern-farmhouse',
    'Modern Farmhouse',
    'Black 3/4 lite',
    '/popular-styles/01-modern-farmhouse.png',
    {
      styleId: 'f48-3-4-lite',
      doorLineId: smoothSteel,
      selectedPaint: blackPaint,
      selectedGlassCategory: 'clear',
      glassId: 'f48-clear-grids',
      selectedGlassGroupKey: 'clear-glass-with-grids',
      glassVariantConfirmed: true,
      gridPathId: 'sdl',
      gridPattern: '4 Lite',
      hardwareId: centuryMatteBlack,
    },
  ),
  style(
    'craftsman',
    'Craftsman',
    'Fir with nutmeg stain',
    '/popular-styles/02-craftsman.png',
    {
      styleId: 'cr14-craftsman-1-4-rectangle',
      doorLineId: 'signature-series',
      grainId: 'Fir',
      selectedFinishType: 'stain',
      selectedStain: 'stain-nutmeg',
      selectedGlassCategory: 'clear',
      glassId: 'cr14-divided-lites',
      selectedGlassGroupKey: 'craftsman-divided-lites',
      glassVariantConfirmed: true,
      hardwareId: 'baldwin-adirondack-dark-bronze-right',
    },
  ),
  style(
    'farmhouse-sidelites',
    'Farmhouse with Sidelites',
    'Forest, two sidelites',
    '/popular-styles/03-farmhouse-sidelites.png',
    {
      styleId: 'f48-3-4-lite',
      doorLineId: smoothSteel,
      sidelites: 'both-sides',
      sideliteStyleId: 'f48sl',
      sideliteGlassCategory: 'clear',
      sideliteGlassId: 'clear-grids',
      sideliteGlassGroupKey: 'clear glass with grids',
      sideliteGlassVariantConfirmed: true,
      sideliteGridLocation: 'sdl',
      sideliteGridPattern: '4 Lite',
      selectedPaint: 'paint-forest',
      selectedGlassCategory: 'clear',
      glassId: 'f48-clear-grids',
      selectedGlassGroupKey: 'clear-glass-with-grids',
      glassVariantConfirmed: true,
      gridPathId: 'sdl',
      gridPattern: '4 Lite',
      hardwareId: centuryMatteBlack,
    },
  ),
  style(
    'french-double',
    'French Double Door',
    'Black, locks on both doors',
    '/popular-styles/04-french-double.png',
    {
      selectedDoorConfigurationType: 'french',
      styleId: 'f-full-lite',
      doorLineId: smoothSteel,
      selectedPaint: blackPaint,
      selectedGlassCategory: 'clear',
      glassId: 'f-clear-grids',
      selectedGlassGroupKey: 'clear-glass-with-grids',
      glassVariantConfirmed: true,
      gridPathId: 'sdl',
      gridPattern: '8 Lite',
      hardwareId: centuryMatteBlack,
      doubleDoorLockPrep: 'DDLLBO',
    },
  ),
  style(
    'stacked-3-lite',
    'Stacked 3 Lite',
    'Black, clear low-E',
    '/popular-styles/05-stacked-3-lite.png',
    {
      styleId: '3lt-stacked-3-lite',
      doorLineId: smoothSteel,
      selectedPaint: blackPaint,
      selectedGlassCategory: 'retro',
      glassId: 'clear-low-e',
      selectedGlassGroupKey: 'clear-glass',
      glassVariantConfirmed: true,
      hardwareId: centuryMatteBlack,
    },
  ),
]

export function popularStyleIdMatching(configuration: DoorBuilderDraftConfiguration) {
  const keys = Object.keys(baseConfiguration) as (keyof DoorBuilderDraftConfiguration)[]
  return POPULAR_STYLES.find((style) => keys.every((key) => style.configuration[key] === configuration[key]))?.id ?? null
}
