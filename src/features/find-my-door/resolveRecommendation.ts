import { doorStyles, finishes, glassOptions } from '../../data/options.js'
import { autoGrainForDoorLine, doorLineChoices, doorStyleSupportsGlass, finishesForStyle, resolveDoorProduct } from '../../data/productCatalog.js'
import { hardwareDisplayName, hardwareOptions } from '../../data/hardware.js'
import { isCustomerSelectableGlass, isHiddenDecorativeGlass } from '../../data/customerGlassAvailability.js'
import { isGlassFamilyCompatible } from '../../data/glassFamilyCompatibility.js'
import { doorStyleDisplayName } from '../../data/productDisplayNames.js'
import { doorSwingDisplayName } from '../../data/doorHanding.js'
import { f48slGlassOptions, f48slGridAsset } from '../../data/f48slGlass.js'
import { sideliteAssetFamilyForSlab, sideliteGlassMask, sideliteSlabAsset, sideliteStylesForFamily, type SideliteStyleId } from '../../data/sideliteAssets.js'
import type { DoorPreviewProps } from '../../components/DoorPreview.js'
import type { DoorBuilderDraftConfiguration } from '../../utils/doorBuilderDraft.js'
import type { DoorConfiguration, DoorSwing, DoubleDoorLockPrepCode, Finish, GlassOption, GridPattern } from '../../types.js'
import type { Recipe } from './recipes.js'
import type { HouseReading, StyleMood } from './types.js'
import { styleChoice } from './types.js'

const LEGACY_FULL_LITE = new Set(['clear', 'f-f10l', 'f-f15wh', 'f-prairie-internal', 'f-ten-lite', 'f-clear-f10', 'f-clear-f10l', 'f-clear-nonstock', 'f-clear-f15', 'f-clear-f15int', 'f-clear-f15intl', 'f-clear-fpraint', 'f-clear-ften', 'f-blinds-15', 'blinds-espresso', 'blinds-gray', 'blinds-sand', 'blinds-silver', 'blinds-tan', 'blinds-white'])
const LEGACY_F48 = new Set(['clear-low-e', 'f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock'])
const LEGACY_S = new Set(['clear', 'clear-low-e', 's-clear-s5', 's-clear-s5l', 's-clear-s9', 's-clear-s9int', 's-clear-s9intl', 's-clear-sv6', 's-clear-nonstock'])
const F48_GLASS = new Set(['f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock', 'f48-blinds-white', 'f48-clic-nogrid', 'f48-clic-ext-12l', 'ashbury', 'berkley', 'briselle', 'cadence', 'calandra', 'courtyard', 'crosswalk', 'cyndi', 'dorian-nickel', 'dorian-patina', 'edgewood', 'elegant-black-white', 'elegant-nickel', 'elegant-patina', 'empire', 'fragrance', 'garrison', 'grace-nickel', 'grace-patina', 'heirlooms-brass', 'heirlooms-nickel', 'high-point', 'jameston', 'majestic-nickel', 'majestic-patina', 'margate', 'metro', 'mistify', 'mohave', 'monterey-nickel', 'monterey-patina', 'neo', 'nouveau-nickel', 'nouveau-patina', 'oak-park', 'paris', 'pembrook', 'prestige', 'rill', 'riverwood', 'sterling', 'topaz', 'vilano', 'vincraft', 'waterside', 'baroque', 'blanca', 'chinchilla', 'cumulus', 'double-water', 'micro-granite', 'rain', 'streamed', 'vapor', 'wide-reed', 'f48-clear-grids', 'f48-clear-no-grids'])

const DOOR_SWINGS: DoorSwing[] = [
  { id: 'LHI', name: 'Left Hand Inswing', image: '/assets/door-swing/lhi.webp' },
  { id: 'LHO', name: 'Left Hand Outswing', image: '/assets/door-swing/lho.webp' },
  { id: 'RHI', name: 'Right Hand Inswing', image: '/assets/door-swing/rhi.webp' },
  { id: 'RHO', name: 'Right Hand Outswing', image: '/assets/door-swing/rho.webp' },
]

const GRID_PATTERN_CODE: Partial<Record<GridPattern, string>> = {
  '4 Lite': '4L', '6 Lite': '6L', '8 Lite': '8L', '12 Lite': '12L', '15 Lite': '15L',
}

const sideliteCatalogs = { f48sl: f48slGlassOptions }

export type ResolvedRecommendation = {
  id: string
  cacheKey: string
  title: string
  summary: string
  reason: string
  finishName: string
  styleName: string
  glassName: string
  hardwareName: string
  openingLabel: string
  draft: DoorBuilderDraftConfiguration
  configuration: DoorConfiguration
  preview: DoorPreviewProps
  finish: Finish
}

function styleFor(code: string, doorLineId: string) {
  const line = doorLineChoices.find((item) => item.id === doorLineId)
  if (!line) return null
  return doorStyles.find((style) => style.variants.some((variant) => variant.code === code && line.lineIds.includes(variant.lineId))) ?? null
}

function glassAllowed(codes: string[], glass: GlassOption, lineId: string) {
  if (!isCustomerSelectableGlass(glass) || isHiddenDecorativeGlass(glass) || !isGlassFamilyCompatible(glass, lineId)) return false
  if (!codes.some((code) => glass.overlaysByDoorStyle[code])) return false
  if (codes.includes('F') && LEGACY_FULL_LITE.has(glass.id)) return false
  if (codes.includes('S') && LEGACY_S.has(glass.id)) return false
  if ((codes.includes('F48') || codes.includes('F482')) && (LEGACY_F48.has(glass.id) || !F48_GLASS.has(glass.id))) return false
  return true
}

function sdlOverlay(code: string, pattern: GridPattern) {
  const token = GRID_PATTERN_CODE[pattern]
  if (!token) return null
  if (code === 'F48' || code === 'F482') return `/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT${token}WH.webp`
  if (code === 'F') return `/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT${token}WH.webp`
  if (code === 'S') return `/assets/hgi-assets/Glass/S/INTERNAL GRIDS/SINT${token}WH.webp`
  return null
}

export function applyFinish(draft: DoorBuilderDraftConfiguration, finishId: string): DoorBuilderDraftConfiguration | null {
  const finish = finishes.find((item) => item.id === finishId)
  if (!finish) return null
  const paint = finish.finishType === 'paint'
  return {
    ...draft,
    selectedFinishType: finish.finishType,
    selectedPaint: paint ? finish.id : '',
    selectedStain: paint ? '' : finish.id,
    jambType: 'timber',
    jambFinishType: finish.finishType,
    jambFinishColor: finish.id,
    jambFinishOverridden: false,
    glassFrameColorMode: 'match-door',
    glassFrameFinishId: finish.id,
    glassFrameFinishType: finish.finishType,
  }
}

export function fallbackReason(finishName: string, styleName: string, house: HouseReading, mood: StyleMood) {
  const moodName = styleChoice(mood).name.toLowerCase()
  const siding = house.siding.trim()
  const architecture = house.architecture.trim()
  const setting = [siding ? `${siding} exterior` : '', architecture].filter(Boolean).join(' and ')
  const where = setting ? ` on your ${setting}` : ' on your home'
  return `${finishName} ${styleName} brings a ${moodName} feel${where}.`.replace(/\s+/g, ' ').slice(0, 280)
}

export function resolveRecommendation(recipe: Recipe, finishId: string, reason: string, house: HouseReading, mood: StyleMood): ResolvedRecommendation | null {
  if (!recipe.allowedFinishIds.includes(finishId)) return null
  const line = doorLineChoices.find((item) => item.id === recipe.draft.doorLineId)
  const style = line ? styleFor(recipe.styleCode, line.id) : null
  if (!line || !style) return null
  const painted = applyFinish({ ...recipe.draft, styleId: style.id }, finishId)
  if (!painted) return null
  const finish = finishes.find((item) => item.id === finishId)
  if (!finish) return null
  const grain = painted.grainId || autoGrainForDoorLine(style, line.id)
  if (line.id === 'signature-series' && !painted.grainId) return null
  if (painted.grainId && !style.variants.some((variant) => line.lineIds.includes(variant.lineId) && variant.code === recipe.styleCode && variant.grains.includes(painted.grainId))) return null
  if (!finishesForStyle(style, finishes, line.id, grain).some((item) => item.id === finish.id)) return null
  const hardware = hardwareOptions.find((item) => item.id === painted.hardwareId)
  const swing = DOOR_SWINGS.find((item) => item.id === painted.doorSwingId)
  if (!hardware || !swing) return null
  const configurationType = painted.selectedDoorConfigurationType === 'french' ? 'french' : painted.selectedDoorConfigurationType === 'single' ? 'single' : null
  if (!configurationType) return null
  const lockPrep: DoubleDoorLockPrepCode | null = painted.doubleDoorLockPrep === 'DDLLBO' || painted.doubleDoorLockPrep === 'DDLLAC' || painted.doubleDoorLockPrep === 'DDLLKP' ? painted.doubleDoorLockPrep : null
  if (configurationType === 'french' && !lockPrep) return null
  const product = resolveDoorProduct(style, finish, grain ?? undefined, line.id)
  const codes = product.styleCodes.length ? product.styleCodes : [recipe.styleCode]
  const supportsGlass = doorStyleSupportsGlass(style, line.id)
  const glass = painted.glassId ? glassOptions.find((item) => item.id === painted.glassId) ?? null : null
  if (supportsGlass && (!glass || !glassAllowed(codes, glass, line.id))) return null
  if (!supportsGlass && painted.glassId) return null
  const previewCode = codes.find((code) => glass?.overlaysByDoorStyle[code]) ?? codes[0]
  const pattern = painted.gridPattern || null
  const overlay = glass && painted.gridPathId === 'sdl' && pattern ? sdlOverlay(previewCode, pattern) : null
  const previewGlass = glass && overlay ? { ...glass, overlaysByDoorStyle: { ...glass.overlaysByDoorStyle, [previewCode]: overlay } } : glass
  const family = sideliteAssetFamilyForSlab({ doorLineId: line.id, grain, doorStyleCode: recipe.styleCode })
  const wantsSidelites = painted.sidelites === 'both-sides'
  if (painted.sidelites !== 'none' && painted.sidelites !== 'both-sides') return null
  const sideliteId = painted.sideliteStyleId as SideliteStyleId
  const sideliteReady = wantsSidelites && family && sideliteStylesForFamily(family).includes(sideliteId) && sideliteId in sideliteCatalogs
  if (wantsSidelites && !sideliteReady) return null
  const sideliteGlass = sideliteReady && sideliteId === 'f48sl' ? sideliteCatalogs.f48sl.find((item) => item.id === painted.sideliteGlassId) : undefined
  if (wantsSidelites && (!sideliteGlass || !isCustomerSelectableGlass(sideliteGlass))) return null
  const sideliteAsset = sideliteReady ? sideliteSlabAsset(family, sideliteId) : undefined
  const sideliteMask = sideliteReady ? sideliteGlassMask(family, sideliteId) : undefined
  if (wantsSidelites && (!sideliteAsset || !sideliteMask)) return null
  const sideliteGridPattern = (painted.sideliteGridPattern || '4 Lite') as GridPattern
  const sideliteGlassSrc = sideliteGlass?.asset
    || (sideliteGlass?.id === 'clear-grids' && sideliteId === 'f48sl' ? f48slGridAsset(sideliteGridPattern, 'Bronze') : undefined)
  const doorSwing = { ...swing, name: doorSwingDisplayName(configurationType, swing) }
  const grid = glass && painted.gridPathId === 'sdl' && pattern ? {
    glassCoating: 'Low-E' as const,
    gridLocation: 'SDL' as const,
    gridPattern: pattern,
  } : null
  const configuration: DoorConfiguration = {
    doorConfigurationType: configurationType,
    ...(lockPrep && configurationType === 'french' ? { doubleDoorLockPrep: lockPrep } : {}),
    product,
    doorLine: line.name,
    style,
    grain,
    finish,
    doorFinishType: finish.finishType,
    doorFinishColor: finish.name,
    glassFrameColorMode: 'match-door',
    jambType: 'timber',
    jambFinishType: finish.finishType,
    jambFinishColor: finish.name,
    jambFinishOverridden: false,
    glassFrameFinishColor: glass ? finish.name : undefined,
    glass: previewGlass,
    mainDoorGlass: previewGlass,
    grid,
    hardware,
    doorSwing,
    sidelites: wantsSidelites ? 'both-sides' : 'none',
    sidelitePlacement: wantsSidelites ? 'both-sides' : 'none',
    ...(wantsSidelites ? { sideliteStyle: 'F48SL', sideliteSlab: sideliteId } : {}),
    ...(sideliteGlass ? {
      sideliteGlass: {
        glass: sideliteGlass.name,
        glassCategory: sideliteGlass.category === 'privacy' ? 'Privacy Glass' : sideliteGlass.category === 'decorative' ? 'Decorative Glass' : 'Clear Glass',
        ...(sideliteGlass.asset ? { glassAsset: sideliteGlass.asset } : {}),
        ...(sideliteGlass.id === 'clear-grids' ? {
          glassCoating: 'Standard / No Low-E or Low-E' as const,
          gridLocation: 'SDL' as const,
          gridPattern: sideliteGridPattern,
        } : {}),
      },
    } : {}),
  }
  const preview: DoorPreviewProps = {
    doorConfigurationType: configurationType,
    doubleDoorLockPrep: configurationType === 'french' ? lockPrep : null,
    style,
    finish,
    glass: previewGlass,
    hardware,
    showHardware: true,
    grain,
    product,
    tintColor: finish.color,
    doorSwing,
    applyFinish: true,
    gridMatchesFinish: Boolean(overlay),
    showViewToggle: false,
    sidelites: wantsSidelites ? 'both-sides' : 'none',
    sideliteAssetSrc: sideliteAsset,
    sideliteMaskSrc: sideliteMask,
    sideliteGlassSrc,
    sideliteClearGlassBase: Boolean(sideliteGlass),
    sideliteGlassIsGrid: sideliteGlass?.id === 'clear-grids',
    sideliteGridMatchesFinish: sideliteGlass?.id === 'clear-grids',
    jambFinish: finish,
    jambType: 'timber',
    glassFrameFinish: glass ? finish : null,
    loadingLabel: 'Loading preview',
  }
  const styleName = doorStyleDisplayName(style)
  const glassName = glass?.name ?? 'No glass'
  const hardwareName = hardwareDisplayName(hardware)
  const openingLabel = configurationType === 'french' ? 'French double doors' : wantsSidelites ? 'Single door with sidelites' : 'Single door'
  const summary = [finish.name, styleName, glassName !== 'No glass' ? glassName : '', openingLabel].filter(Boolean).join(' · ')
  const cleanReason = reason.replace(/\s+/g, ' ').trim()
  return {
    id: recipe.id,
    cacheKey: `${recipe.id}:${finish.id}`,
    title: recipe.title,
    summary,
    reason: cleanReason.length >= 40 ? cleanReason.slice(0, 280) : fallbackReason(finish.name, styleName, house, mood),
    finishName: finish.name,
    styleName,
    glassName,
    hardwareName,
    openingLabel,
    draft: painted,
    configuration,
    preview,
    finish,
  }
}
