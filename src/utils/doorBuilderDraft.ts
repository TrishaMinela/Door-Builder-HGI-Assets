import type {
  DoorConfigurationType,
  DoubleDoorLockPrepCode,
  GridColor,
  GridPattern,
  GridStyle,
  GridWidth,
  SideliteConfiguration,
} from '../types'
import type { FslGridLocationId, SideliteGlassCategory } from '../data/fslGlass'

export const DOOR_BUILDER_DRAFT_KEY = 'hgi-door-builder-draft'
export const DOOR_BUILDER_DRAFT_VERSION = 1

export type DraftGlassCategory = 'clear' | 'decorative' | 'privacy' | 'blinds' | 'clic' | 'retro'

export interface DoorBuilderDraftConfiguration {
  selectedDoorConfigurationType: DoorConfigurationType | ''
  styleId: string
  doorLineId: string
  grainId: string
  sidelites: SideliteConfiguration | ''
  sideliteStyleId: string
  sideliteGlassCategory: SideliteGlassCategory | ''
  sideliteGlassId: string
  sideliteGlassGroupKey: string
  sideliteGlassVariantConfirmed: boolean
  sideliteGridLocation: FslGridLocationId | ''
  sideliteGridStyle: GridStyle | ''
  sideliteGridPattern: GridPattern | ''
  sideliteGridColor: GridColor | ''
  sideliteGridWidth: GridWidth | ''
  selectedFinishType: '' | 'paint' | 'stain'
  selectedPaint: string
  selectedStain: string
  jambType: '' | 'timber' | 'clad'
  jambFinishType: '' | 'paint' | 'stain' | 'clad'
  jambFinishColor: string
  jambFinishOverridden: boolean
  selectedGlassCategory: DraftGlassCategory | ''
  glassId: string
  selectedGlassGroupKey: string
  glassVariantConfirmed: boolean
  glassFrameColorMode: '' | 'match-door' | 'custom'
  glassFrameFinishId: string
  glassFrameFinishType: 'paint' | 'stain'
  gridPathId: string
  gridStyle: GridStyle | ''
  gridPattern: GridPattern | ''
  gridColor: GridColor | ''
  gridWidth: GridWidth | ''
  hardwareId: string
  doubleDoorLockPrep: DoubleDoorLockPrepCode | ''
  doorSwingId: string
}

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const blankDraft: DoorBuilderDraftConfiguration = {
  selectedDoorConfigurationType: '', styleId: '', doorLineId: '', grainId: '', sidelites: '', sideliteStyleId: '',
  sideliteGlassCategory: '', sideliteGlassId: '', sideliteGlassGroupKey: '', sideliteGlassVariantConfirmed: false,
  sideliteGridLocation: '', sideliteGridStyle: '', sideliteGridPattern: '', sideliteGridColor: '', sideliteGridWidth: '',
  selectedFinishType: '', selectedPaint: '', selectedStain: '', jambType: '', jambFinishType: '', jambFinishColor: '',
  jambFinishOverridden: false, selectedGlassCategory: '', glassId: '', selectedGlassGroupKey: '', glassVariantConfirmed: false,
  glassFrameColorMode: '', glassFrameFinishId: '', glassFrameFinishType: 'paint', gridPathId: '', gridStyle: '',
  gridPattern: '', gridColor: '', gridWidth: '', hardwareId: '', doubleDoorLockPrep: '', doorSwingId: '',
}

const allowed = <T extends string>(value: unknown, values: readonly T[], fallback: T): T =>
  typeof value === 'string' && values.includes(value as T) ? value as T : fallback
const text = (value: unknown) => typeof value === 'string' ? value : ''
const flag = (value: unknown) => value === true

function getBrowserStorage(): DraftStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function sanitizeDoorBuilderDraft(value: unknown): DoorBuilderDraftConfiguration | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const envelope = value as Record<string, unknown>
  if (envelope.version !== DOOR_BUILDER_DRAFT_VERSION || !envelope.configuration || typeof envelope.configuration !== 'object' || Array.isArray(envelope.configuration)) return null
  const input = envelope.configuration as Record<string, unknown>
  return {
    ...blankDraft,
    selectedDoorConfigurationType: allowed(input.selectedDoorConfigurationType, ['', 'single', 'french', 'savannah'], ''),
    styleId: text(input.styleId), doorLineId: text(input.doorLineId), grainId: text(input.grainId),
    sidelites: allowed(input.sidelites, ['', 'none', 'hinge-side', 'lock-side', 'both-sides'], ''),
    sideliteStyleId: text(input.sideliteStyleId),
    sideliteGlassCategory: allowed(input.sideliteGlassCategory, ['', 'clear', 'decorative', 'privacy', 'clic', 'blinds'], ''),
    sideliteGlassId: text(input.sideliteGlassId), sideliteGlassGroupKey: text(input.sideliteGlassGroupKey),
    sideliteGlassVariantConfirmed: flag(input.sideliteGlassVariantConfirmed),
    sideliteGridLocation: allowed(input.sideliteGridLocation, ['', 'external', 'internal', 'sdl'], ''),
    sideliteGridStyle: text(input.sideliteGridStyle) as GridStyle | '', sideliteGridPattern: text(input.sideliteGridPattern) as GridPattern | '',
    sideliteGridColor: text(input.sideliteGridColor) as GridColor | '', sideliteGridWidth: text(input.sideliteGridWidth) as GridWidth | '',
    selectedFinishType: allowed(input.selectedFinishType, ['', 'paint', 'stain'], ''), selectedPaint: text(input.selectedPaint),
    selectedStain: text(input.selectedStain), jambType: allowed(input.jambType, ['', 'timber', 'clad'], ''),
    jambFinishType: allowed(input.jambFinishType, ['', 'paint', 'stain', 'clad'], ''), jambFinishColor: text(input.jambFinishColor),
    jambFinishOverridden: flag(input.jambFinishOverridden),
    selectedGlassCategory: allowed(input.selectedGlassCategory, ['', 'clear', 'decorative', 'privacy', 'blinds', 'clic', 'retro'], ''),
    glassId: text(input.glassId), selectedGlassGroupKey: text(input.selectedGlassGroupKey), glassVariantConfirmed: flag(input.glassVariantConfirmed),
    glassFrameColorMode: allowed(input.glassFrameColorMode, ['', 'match-door', 'custom'], ''),
    glassFrameFinishId: text(input.glassFrameFinishId), glassFrameFinishType: allowed(input.glassFrameFinishType, ['paint', 'stain'], 'paint'),
    gridPathId: text(input.gridPathId), gridStyle: text(input.gridStyle) as GridStyle | '', gridPattern: text(input.gridPattern) as GridPattern | '',
    gridColor: text(input.gridColor) as GridColor | '', gridWidth: text(input.gridWidth) as GridWidth | '', hardwareId: text(input.hardwareId),
    doubleDoorLockPrep: allowed(input.doubleDoorLockPrep, ['', 'DDLLBO', 'DDLLAC', 'DDLLKP'], ''), doorSwingId: text(input.doorSwingId),
  }
}

export function loadDoorBuilderDraft(storage: DraftStorage | null = getBrowserStorage()): DoorBuilderDraftConfiguration | null {
  if (!storage) return null
  try {
    const saved = storage.getItem(DOOR_BUILDER_DRAFT_KEY)
    return saved ? sanitizeDoorBuilderDraft(JSON.parse(saved)) : null
  } catch {
    return null
  }
}

export function saveDoorBuilderDraft(configuration: DoorBuilderDraftConfiguration, storage: DraftStorage | null = getBrowserStorage()) {
  if (!storage) return
  try {
    storage.setItem(DOOR_BUILDER_DRAFT_KEY, JSON.stringify({ version: DOOR_BUILDER_DRAFT_VERSION, configuration }))
  } catch {
    // Storage may be unavailable or full; the builder must remain usable.
  }
}

export function clearDoorBuilderDraft(storage: DraftStorage | null = getBrowserStorage()) {
  if (!storage) return
  try {
    storage.removeItem(DOOR_BUILDER_DRAFT_KEY)
  } catch {
    // Storage may be disabled; resetting the in-memory builder still succeeds.
  }
}
