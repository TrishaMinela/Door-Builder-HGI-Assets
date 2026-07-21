import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, Check, Download, FileText, Home as HomeIcon, Phone, RotateCcw, Send, ShieldCheck } from 'lucide-react'
import { DoorPreview } from './components/DoorPreview'
import { DoorStyleThumbnail } from './components/DoorStyleThumbnail'
import { GlassOptionCard } from './components/GlassOptionCard'
import { HardwareOptionCard } from './components/HardwareOptionCard'
import { OptionCard } from './components/OptionCard'
import { QuoteForm } from './components/QuoteForm'
import { doorStyles, finishes, glassOptions } from './data/options'
import { hardwareDisplayName, hardwareOptions } from './data/hardware'
import { autoGrainForDoorLine, doorLineChoicesForStyle, doorStyleSupportsGlass, finishesForStyle, finishTypesForDoorLine, glassDoorCodes, resolveDoorProduct } from './data/productCatalog'
import type { ContactForm, DoorSwing, GlassCoating, GlassOption, GridColor, GridConfiguration, GridPattern, GridStyle, GridWidth, PreviewHardware } from './types'
import { configurationPdfName } from './utils/pdfConfig'
import { submitQuote, type SubmissionResult } from './utils/submission'

const glassSteps = ['Door Style', 'Finish', 'Glass', 'Hardware', 'Review & Quote']
const noGlassSteps = ['Door Style', 'Finish', 'Hardware', 'Review & Quote']
type BuilderPage = 'door-style' | 'door-line' | 'door-grain' | 'finish' | 'glass-type' | 'glass' | 'grid-location' | 'grid-style' | 'grid-pattern' | 'grid-color' | 'grid-width' | 'hardware' | 'door-swing' | 'review'
type GlassCategory = 'clear' | 'decorative' | 'privacy' | 'blinds' | 'clic' | 'retro'
const initialContact: ContactForm = { fullName: '', email: '', phone: '', zip: '' }
const emptyPreviewHardware: PreviewHardware = { color: '#191919', type: 'long' }
const signatureSeriesId = 'signature-series'
const FULL_LITE_GRID_GLASS_ID = 'f-clear-grids'
const F48_GRID_GLASS_ID = 'f48-clear-grids'
const gridLocations = [
  { id: 'external', name: 'External Grids', image: '/assets/grid-options/External Grids.png' },
  { id: 'internal', name: 'Internal Grids', image: '/assets/grid-options/Internal Grids.png' },
  { id: 'sdl', name: 'SDL Grids', image: '/assets/grid-options/SDL Grids.png' },
] as const
const gridStyles: { id: GridStyle; image: string }[] = [
  { id: 'Contoured', image: '/assets/grid-options/Contoured Grids.png' },
  { id: 'Flat', image: '/assets/grid-options/Flat Grids.png' },
  { id: 'Prairie', image: '/assets/grid-options/Prairie Grids.png' },
]
const lowEGridStyles: { id: GridStyle; image: string }[] = [
  { id: 'Arts & Crafts', image: '/assets/grid-options/Arts & Crafts Grid.png' },
  ...gridStyles,
]
const flatGridPatterns: { id: GridPattern; image: string }[] = [
  { id: '4 Lite', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT4LBE.png' },
  { id: '4 Lite Horizontal', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT4LHBE.png' },
  { id: '6 Lite', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT6LBE.png' },
  { id: '8 Lite', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT8LBE.png' },
  { id: '10 Lite', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT10LBE.png' },
  { id: '12 Lite', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT12LBE.png' },
  { id: '15 Lite', image: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT15LBE.png' },
]
const allGridPatterns: { id: GridPattern; image: string }[] = [{ id: '3 Lite', image: '/assets/grid-options/All Lites.png' }, ...flatGridPatterns]
const internalGridPatternCodes: Partial<Record<GridPattern, string>> = { '3 Lite': '3L', '4 Lite': '4L', '4 Lite Horizontal': '4LH', '6 Lite': '6L', '8 Lite': '8L', '10 Lite': '10L', '12 Lite': '12L', '15 Lite': '15L' }
const internalGridColorCodes: Partial<Record<GridColor, string>> = { Beige: 'BE', Black: 'BK', Bronze: 'BZ', 'Bronze/White': 'WH', Champagne: 'CH', Tan: 'TA', White: 'WH' }
const internalGridAsset = (pattern: GridPattern, color: GridColor) => `/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT${internalGridPatternCodes[pattern]}${internalGridColorCodes[color]}.png`
const f48GridColorCodes: Partial<Record<GridColor, string>> = { Beige: 'BE', Black: 'BL', Bronze: 'BR', 'Bronze/White': 'WH', Champagne: 'CH', Tan: 'TA', White: 'WH' }
const f48InternalGridAsset = (pattern: GridPattern, color: GridColor) => `/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT${internalGridPatternCodes[pattern]}${f48GridColorCodes[color]}.png`
const contouredGridAssets: Partial<Record<GridPattern, Partial<Record<GridColor, string>>>> = {
  '4 Lite': { White: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT4LWH.png' },
  '10 Lite': {
    Champagne: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT10LCH.png',
    White: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT10LWH.png',
  },
  '15 Lite': { Champagne: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT15LCH.png' },
}
const prairieGridAssets: Partial<Record<GridColor, string>> = {
  White: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FPRAWH.png',
  Champagne: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FPRACH.png',
  Beige: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FPRACHBE.png',
  Tan: '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FPRACHTA.png',
}
const gridColorValues: Partial<Record<GridColor, string>> = {
  Beige: '#d8c5a4', Black: '#161616', Bronze: '#6f4b32', 'Bronze/White': 'linear-gradient(90deg,#6f4b32 0 50%,#f4f4ef 50%)', Champagne: '#d5bd8e', Tan: '#b18b62', White: '#f4f4ef',
}
type GridWidthRules = Partial<Record<GridColor, GridWidth[]>>
const flatGridRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '4 Lite': { Bronze: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '4 Lite Horizontal': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '6 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '8 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '10 Lite': { Beige: ['5/8"', '7/8"'], Bronze: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '12 Lite': { Tan: ['7/8"'] },
  '15 Lite': { Beige: ['5/8"', '7/8"'], Bronze: ['5/8"'], Champagne: ['5/8"', '7/8"'], Tan: ['5/8"', '7/8"'] },
}
const prairieGridRules: GridWidthRules = { Beige: [], Tan: ['7/8"'], White: ['7/8"', '11/16"'] }
const bothFlatWidths: GridWidth[] = ['5/8"', '7/8"']
const lowEFlatGridRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '4 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Tan: ['7/8"'], White: bothFlatWidths },
  '4 Lite Horizontal': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '6 Lite': { Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '8 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '10 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '12 Lite': { Tan: ['7/8"'] },
  '15 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: bothFlatWidths },
}
const lowEContouredRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '4 Lite': { White: ['11/16"'] },
  '10 Lite': { Champagne: ['11/16"'], White: ['11/16"'] },
  '15 Lite': { Champagne: ['11/16"'] },
}
const lowEArtsRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '3 Lite': { White: ['5/8"'] }, '4 Lite': { White: ['5/8"'] },
}
const lowEPrairieGridRules: GridWidthRules = { Beige: [], Champagne: ['5/8"', '11/16"'], Tan: ['7/8"'], White: ['5/8"', '7/8"', '11/16"'] }
const f48StandardFlatRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '3 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '4 Lite': { Beige: ['5/8"'], Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '6 Lite': { Beige: ['5/8"'], Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '8 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '12 Lite': { Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
}
const f48LowEFlatRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '3 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: ['7/8"'] },
  '4 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '6 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '8 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '12 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: bothFlatWidths, Tan: ['7/8"'], White: bothFlatWidths },
}
const f48StandardContouredRules: Partial<Record<GridPattern, GridWidthRules>> = { '12 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } }
const f48LowEContouredRules: Partial<Record<GridPattern, GridWidthRules>> = { '4 Lite': { White: ['11/16"'] }, '12 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } }
const f48StandardPrairieRules: GridWidthRules = { White: ['5/8"', '7/8"', '11/16"'] }
const f48LowEPrairieRules: GridWidthRules = { Beige: [], Champagne: ['5/8"', '11/16"'], Tan: ['7/8"'], White: ['5/8"', '7/8"', '11/16"'] }
function gridRuleWidths(style: GridStyle | '', pattern: GridPattern | '', color: GridColor | '', lowE: boolean): GridWidth[] | undefined {
  if (!style || !color) return undefined
  if (style === 'Prairie') return (lowE ? lowEPrairieGridRules : prairieGridRules)[color]
  if (!pattern) return undefined
  const rules = lowE
    ? style === 'Arts & Crafts' ? lowEArtsRules : style === 'Contoured' ? lowEContouredRules : lowEFlatGridRules
    : style === 'Contoured' ? { '15 Lite': { Champagne: ['11/16"' as GridWidth] } } : style === 'Flat' ? flatGridRules : {}
  return rules[pattern]?.[color]
}
const HERO_DOOR_OPENING = {
  leftPct: 45.3,
  topPct: 25.12,
  widthPct: 17.86,
  heightPct: 40.51,
} as const
const heroDoorOpeningStyle = {
  left: `${HERO_DOOR_OPENING.leftPct}%`,
  top: `${HERO_DOOR_OPENING.topPct}%`,
  width: `${HERO_DOOR_OPENING.widthPct}%`,
  height: `${HERO_DOOR_OPENING.heightPct}%`,
} as CSSProperties
// One hero preset per unique slab in the product catalog. Keeping this list to
// slab codes only lets the preset builder choose valid, non-repeating finishes
// even as finish and hardware catalogs change.
const HERO_SLAB_CODES = [
  '2PNGSS', '2PPLSS', 'CA', 'CANGSS', 'F', 'F482', 'S', 'S1NGSS', 'SO2', 'CR14',
  '3PNG', 'F48', '2PHD', '3LT', '3STEP', '4LT', '5LT', 'CR14PL', 'E1', 'F1', 'F2',
  'F3', 'F4', 'F764', 'F848', 'FO', 'FRT', 'HDAT1', 'HRT', 'N', 'N1', 'QA', 'S2',
  'S3', 'S4', 'S836', 'SAT', 'SHAK1', 'SHAK2', 'SHAK3', 'SO', 'SW',
] as const
const HERO_GLASS_OVERRIDES: Partial<Record<typeof HERO_SLAB_CODES[number], string>> = {
  FO: 'cadence',
  SAT: 'laurel',
}
const grainThumbnails: Record<string, string> = {
  Cherry: '/assets/door-lines/grains/cherry.png',
  Fir: '/assets/door-lines/grains/fir.png',
  Mahogany: '/assets/door-lines/grains/mahogany.png',
  Oak: '/assets/door-lines/grains/oak.png',
}
const signatureGrainChoices = (['Cherry', 'Fir', 'Mahogany', 'Oak'] as const).map((grain) => ({
  id: grain,
  name: grain,
  image: grainThumbnails[grain],
}))
const doorSwingOptions: DoorSwing[] = [
  { id: 'LHI', name: 'Left Hand Inswing', image: '/assets/door-swing/lhi.png' },
  { id: 'LHO', name: 'Left Hand Outswing', image: '/assets/door-swing/lho.png' },
  { id: 'RHI', name: 'Right Hand Inswing', image: '/assets/door-swing/rhi.png' },
  { id: 'RHO', name: 'Right Hand Outswing', image: '/assets/door-swing/rho.png' },
]
const hardwareStyleGroups = [...hardwareOptions.reduce((groups, option) => {
  const key = `${option.manufacturer}|${option.style}`
  const options = groups.get(key) ?? []
  options.push(option)
  groups.set(key, options)
  return groups
}, new Map<string, typeof hardwareOptions>()).values()]

type GlassOptionGroup = {
  key: string
  title: string
  options: GlassOption[]
}

function glassGroupTitle(option: GlassOption) {
  return option.name.includes(' - ') ? option.name.split(' - ')[0] : option.name
}

function glassGroupKey(option: GlassOption) {
  return glassGroupTitle(option).toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

const glassCategoryChoices: { id: GlassCategory; name: string; description: string; image: string }[] = [
  { id: 'clear', name: 'Clear Glass', description: 'Clear glass and clear grille options.', image: '/assets/glass/thumbnails/Clear.png' },
  { id: 'decorative', name: 'Decorative Glass', description: 'Decorative glass designs and caming finishes.', image: '/assets/glass/thumbnails/Decorative.png' },
  { id: 'privacy', name: 'Privacy Glass', description: 'Textured glass designed for added privacy.', image: '/assets/glass/thumbnails/Privacy.png' },
  { id: 'blinds', name: 'Mini Blinds', description: 'Glass options with integrated mini blinds.', image: '/assets/glass/thumbnails/Blinds.png' },
  { id: 'clic', name: 'CLiC Glass', description: 'CLiC enclosed-glass options.', image: '/assets/glass/thumbnails/CLIC.png' },
]
const retroGlassCategory = { id: 'retro' as const, name: 'Retro', description: 'Explore all available Retro glass options.', image: '/assets/glass/thumbnails/Retro.png' }

const clearGlassIds = new Set(['clear', 'f-clear-no-grids', 'f-clear-grids', 'clear-low-e', 'cr14-divided-lites', 'f-f10l', 'f-f15wh', 'f-prairie-internal', 'f-ten-lite', 'f-clear-f10', 'f-clear-f10l', 'f-clear-f15', 'f-clear-f15int', 'f-clear-f15intl', 'f-clear-fpraint', 'f-clear-ften', 'f-clear-nonstock', 'f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock', 'frt-clear-f17rt', 'hrt-clear-s11rt', 'n-clear-ncl', 'qa-clear-qacl', 'sat-clear-nonstock', 'so-clear-nonstock', 'so-clear-small-no-coating', 'so-clear-small-low-e', 's-clear-s5', 's-clear-s5l', 's-clear-s9', 's-clear-s9int', 's-clear-s9intl', 's-clear-sv6', 's-clear-nonstock', 'sw-clear-swg'])
clearGlassIds.add(F48_GRID_GLASS_ID)
clearGlassIds.add('f48-clear-no-grids')
const legacyFullLiteGlassIds = new Set(['clear', 'f-f10l', 'f-f15wh', 'f-prairie-internal', 'f-ten-lite', 'f-clear-f10', 'f-clear-f10l', 'f-clear-nonstock', 'f-clear-f15', 'f-clear-f15int', 'f-clear-f15intl', 'f-clear-fpraint', 'f-clear-ften', 'f-blinds-15', 'blinds-espresso', 'blinds-gray', 'blinds-sand', 'blinds-silver', 'blinds-tan', 'blinds-white'])
const legacyF48ClearGlassIds = new Set(['clear-low-e', 'f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock'])
const f48GlassOptionIds = new Set(['f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock', 'f48-blinds-white', 'f48-clic-nogrid', 'f48-clic-ext-12l', 'ashbury', 'berkley', 'briselle', 'cadence', 'calandra', 'courtyard', 'crosswalk', 'cyndi', 'dorian-nickel', 'dorian-patina', 'edgewood', 'elegant-black-white', 'elegant-nickel', 'elegant-patina', 'empire', 'fragrance', 'garrison', 'grace-nickel', 'grace-patina', 'heirlooms-brass', 'heirlooms-nickel', 'high-point', 'jameston', 'majestic-nickel', 'majestic-patina', 'margate', 'metro', 'mistify', 'mohave', 'monterey-nickel', 'monterey-patina', 'neo', 'nouveau-nickel', 'nouveau-patina', 'oak-park', 'paris', 'pembrook', 'prestige', 'rill', 'riverwood', 'sterling', 'topaz', 'vilano', 'vincraft', 'waterside', 'baroque', 'blanca', 'chinchilla', 'cumulus', 'double-water', 'micro-granite', 'rain', 'streamed', 'vapor', 'wide-reed'])
f48GlassOptionIds.add(F48_GRID_GLASS_ID)
f48GlassOptionIds.add('f48-clear-no-grids')
const privacyGlassIds = new Set(['baroque', 'blanca', 'chinchilla', 'cumulus', 'double-water', 'frosted', 'karma', 'micro-granite', 'mistify', 'privacy', 'rain', 'streamed', 'vapor', 'wide-reed', 'sw-rain-nogrid', 'sw-rain-5l'])

function glassCategory(option: GlassOption): GlassCategory {
  const key = `${option.id} ${option.name}`.toLowerCase()
  if (key.includes('clic')) return 'clic'
  if (key.includes('blind')) return 'blinds'
  if (clearGlassIds.has(option.id)) return 'clear'
  if (privacyGlassIds.has(option.id)) return 'privacy'
  return 'decorative'
}

function styleCodesForGlass(style: typeof doorStyles[number]) {
  return [...new Set([style.code, ...style.variants.map((variant) => variant.code)])]
}

function EmptyDoorPreview() {
  return (
    <div className="empty-door-preview" aria-label="No door preview selected yet">
      <span>Choose a door style to preview your design.</span>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<'home' | 'builder'>('home')
  const [step, setStep] = useState(0)
  const [styleId, setStyleId] = useState('')
  const [doorLineId, setDoorLineId] = useState('')
  const [grainId, setGrainId] = useState('')
  const [selectedFinishType, setSelectedFinishType] = useState<'' | 'paint' | 'stain'>('')
  const [selectedPaint, setSelectedPaint] = useState('')
  const [selectedStain, setSelectedStain] = useState('')
  const [selectedGlassCategory, setSelectedGlassCategory] = useState<GlassCategory | ''>('')
  const [glassId, setGlassId] = useState('')
  const [gridPathId, setGridPathId] = useState('')
  const [gridStyle, setGridStyle] = useState<GridStyle | ''>('')
  const [gridPattern, setGridPattern] = useState<GridPattern | ''>('')
  const [gridColor, setGridColor] = useState<GridColor | ''>('')
  const [gridWidth, setGridWidth] = useState<GridWidth | ''>('')
  const [hardwareId, setHardwareId] = useState('')
  const [doorSwingId, setDoorSwingId] = useState('')
  const [contact, setContact] = useState(initialContact)
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null)
  const [homeDemoIndex, setHomeDemoIndex] = useState(0)
  const [builderPreviewView, setBuilderPreviewView] = useState<'Exterior' | 'Interior'>('Exterior')
  const builderPanelRef = useRef<HTMLElement | null>(null)
  const builderOptionsRef = useRef<HTMLDivElement | null>(null)

  const selectedStyle = doorStyles.find((item) => item.id === styleId)
  const style = selectedStyle ?? doorStyles[0]
  const availableDoorLines = selectedStyle ? doorLineChoicesForStyle(style) : []
  const availableDoorLineIds = availableDoorLines.map((item) => item.id).join('|')
  const selectedDoorLine = availableDoorLines.find((item) => item.id === doorLineId)
  const compatibilitySupportsGlass = selectedStyle && selectedDoorLine
    ? doorStyleSupportsGlass(selectedStyle, selectedDoorLine.id)
    : Boolean(selectedStyle?.hasGlass)
  const isSignatureDoorLine = selectedDoorLine?.id === signatureSeriesId
  const selectedDoorLineLineIds = selectedDoorLine?.lineIds ?? []
  const selectedDoorLineLineIdsKey = selectedDoorLineLineIds.join('|')
  const signatureGrainOptions = selectedStyle && isSignatureDoorLine
    ? signatureGrainChoices.filter((item) => selectedStyle.variants.some((variant) =>
      selectedDoorLineLineIds.includes(variant.lineId) && variant.grains.includes(item.id),
    ))
    : []
  const needsGrainStep = signatureGrainOptions.length > 0
  const selectedGrain = selectedDoorLine
    ? isSignatureDoorLine
      ? needsGrainStep
        ? grainId || null
        : autoGrainForDoorLine(style, selectedDoorLine.id)
      : autoGrainForDoorLine(style, selectedDoorLine.id)
    : null
  const finishGrain = selectedGrain
  const availableFinishes = selectedDoorLine && (!needsGrainStep || selectedGrain) ? finishesForStyle(style, finishes, selectedDoorLine.id, finishGrain) : []
  const compatibleFinishTypes = (['paint', 'stain'] as const).filter((type) => availableFinishes.some((item) => item.finishType === type))
  const materialFinishTypes = selectedDoorLine ? finishTypesForDoorLine(style, selectedDoorLine.id) : []
  const matchedFinishTypes = compatibleFinishTypes.filter((type) => materialFinishTypes.includes(type))
  const effectiveFinishTypes = selectedDoorLine ? matchedFinishTypes.length ? matchedFinishTypes : compatibleFinishTypes.length ? compatibleFinishTypes : materialFinishTypes : []
  const activeFinishType = selectedFinishType || effectiveFinishTypes[0] || 'paint'
  const finishId = selectedFinishType === 'paint' ? selectedPaint : selectedFinishType === 'stain' ? selectedStain : ''
  const visibleFinishes = availableFinishes.filter((item) => item.finishType === activeFinishType)
  const selectedFinish = finishes.find((item) => item.id === finishId)
  const visibleSelectedFinish = visibleFinishes.find((item) => item.id === finishId)
  const availableFinishIds = availableFinishes.map((item) => item.id).join('|')
  const previewFinish = selectedFinish && (!selectedDoorLine || (materialFinishTypes.includes(selectedFinish.finishType) && (!availableFinishes.length || availableFinishes.some((item) => item.id === selectedFinish.id)))) ? selectedFinish : null
  const finish = selectedFinish ?? visibleFinishes[0] ?? availableFinishes[0] ?? finishes[0]
  const glass = glassOptions.find((item) => item.id === glassId) ?? null
  const selectedHardware = hardwareOptions.find((item) => item.id === hardwareId)
  const hardware = selectedHardware ?? emptyPreviewHardware
  const selectedDoorSwing = doorSwingOptions.find((item) => item.id === doorSwingId)
  const selectedStyleCodes = selectedStyle
    ? selectedDoorLine
      ? selectedStyle.variants.filter((variant) => selectedDoorLine.lineIds.includes(variant.lineId)).map((variant) => variant.code)
      : styleCodesForGlass(selectedStyle)
    : []
  const availableGlass = selectedStyle && compatibilitySupportsGlass
    ? glassOptions.filter((option) => selectedStyleCodes.some((code) => Boolean(option.overlaysByDoorStyle[code])) && !(selectedStyleCodes.includes('F') && legacyFullLiteGlassIds.has(option.id)) && !((selectedStyleCodes.includes('F48') || selectedStyleCodes.includes('F482')) && legacyF48ClearGlassIds.has(option.id)) && (!(selectedStyleCodes.includes('F48') || selectedStyleCodes.includes('F482')) || f48GlassOptionIds.has(option.id)))
    : []
  const supportsGlass = Boolean(compatibilitySupportsGlass && availableGlass.length > 0)
  const steps = supportsGlass ? glassSteps : noGlassSteps
  const selectedGlass = supportsGlass ? glass : null
  const clearOnlyGlass = !supportsGlass && compatibilitySupportsGlass
    ? availableGlass.find((option) => option.id === 'clear') ?? null
    : null
  const configuredGlass = supportsGlass ? selectedGlass : clearOnlyGlass
  const selectedGridLocation = gridLocations.find((location) => location.id === gridPathId)
  const usesFullLiteGridFlow = selectedStyleCodes.includes('F') && glassId === FULL_LITE_GRID_GLASS_ID
  const usesF48GridFlow = (selectedStyleCodes.includes('F48') || selectedStyleCodes.includes('F482')) && glassId === F48_GRID_GLASS_ID
  const usesGridFlow = usesFullLiteGridFlow || usesF48GridFlow
  const selectedGridLocationValue = gridPathId === 'sdl' ? 'SDL' : gridPathId === 'internal' ? 'Internal' : 'External'
  const standardWidthsForSelection = usesF48GridFlow
    ? !gridColor ? undefined : gridStyle === 'Prairie' ? f48StandardPrairieRules[gridColor] : gridPattern ? (gridStyle === 'Contoured' ? f48StandardContouredRules : f48StandardFlatRules)[gridPattern]?.[gridColor] : undefined
    : gridRuleWidths(gridStyle, gridPattern, gridColor, false)
  const lowEWidthsForSelection = usesF48GridFlow
    ? !gridColor ? undefined : gridStyle === 'Prairie' ? f48LowEPrairieRules[gridColor] : gridPattern ? (gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? f48LowEContouredRules : f48LowEFlatRules)[gridPattern]?.[gridColor] : undefined
    : gridRuleWidths(gridStyle, gridPattern, gridColor, true)
  const matchesSelectedWidth = (widths: GridWidth[] | undefined) => widths !== undefined && (widths.length === 0 ? !gridWidth : Boolean(gridWidth && widths.includes(gridWidth)))
  const matchesStandard = matchesSelectedWidth(standardWidthsForSelection)
  const matchesLowE = matchesSelectedWidth(lowEWidthsForSelection)
  const selectedGlassCoating: GlassCoating = gridPathId === 'sdl'
    ? 'Low-E'
    : gridPathId === 'external'
      ? gridPattern === '8 Lite' ? 'Standard / No Low-E, Low-E or Low-E Plus' : 'Low-E or Low-E Plus'
      : matchesStandard && matchesLowE ? 'Standard / No Low-E or Low-E' : matchesLowE ? 'Low-E' : 'Standard / No Low-E'
  const gridConfiguration: GridConfiguration | null = usesGridFlow && selectedGridLocation
    ? {
      glassCoating: selectedGlassCoating,
      gridLocation: selectedGridLocationValue,
      ...(gridStyle ? { gridStyle } : {}),
      ...(gridPattern ? { gridPattern } : {}),
      ...(gridColor ? { gridColor } : {}),
      ...(gridWidth ? { gridWidth } : {}),
    }
    : null
  const standardPatternRules = usesF48GridFlow
    ? gridStyle === 'Contoured' ? f48StandardContouredRules : gridStyle === 'Flat' ? f48StandardFlatRules : {}
    : gridStyle === 'Contoured' ? { '15 Lite': { Champagne: ['11/16"' as GridWidth] } } : gridStyle === 'Flat' ? flatGridRules : {}
  const lowEPatternRules = usesF48GridFlow
    ? gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? f48LowEContouredRules : gridStyle === 'Flat' ? f48LowEFlatRules : {}
    : gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? lowEContouredRules : gridStyle === 'Flat' ? lowEFlatGridRules : {}
  const compatibleGridPatterns = gridPathId === 'external'
    ? allGridPatterns.filter((item) => ['8 Lite', '10 Lite', '15 Lite'].includes(item.id))
    : gridPathId === 'sdl'
      ? allGridPatterns.filter((item) => (usesF48GridFlow ? ['4 Lite'] : ['6 Lite', '8 Lite', '15 Lite']).includes(item.id))
      : allGridPatterns.filter((item) => Object.prototype.hasOwnProperty.call(standardPatternRules, item.id) || Object.prototype.hasOwnProperty.call(lowEPatternRules, item.id))
  const compatibleGridColors: GridColor[] = gridStyle === 'Prairie'
    ? [...new Set([...Object.keys(usesF48GridFlow ? f48StandardPrairieRules : prairieGridRules), ...Object.keys(usesF48GridFlow ? f48LowEPrairieRules : lowEPrairieGridRules)])] as GridColor[]
    : gridPattern
      ? [...new Set([...Object.keys(standardPatternRules[gridPattern] ?? {}), ...Object.keys(lowEPatternRules[gridPattern] ?? {})])] as GridColor[]
      : []
  const compatibleGridWidths = gridColor
    ? gridStyle === 'Prairie'
      ? [...new Set([...((usesF48GridFlow ? f48StandardPrairieRules : prairieGridRules)[gridColor] ?? []), ...((usesF48GridFlow ? f48LowEPrairieRules : lowEPrairieGridRules)[gridColor] ?? [])])]
      : gridPattern
        ? [...new Set([...(standardPatternRules[gridPattern]?.[gridColor] ?? []), ...(lowEPatternRules[gridPattern]?.[gridColor] ?? [])])]
        : []
    : []
  const previewGridColor = gridColor || compatibleGridColors[0]
  const doorStyleDefaultGlass = selectedStyleCodes.includes('HRT')
    ? availableGlass.find((option) => option.id === 'clear') ?? null
    : null
  const selectedGridOverlay = gridStyle === 'Arts & Crafts' && gridPattern
    ? `/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FART${internalGridPatternCodes[gridPattern]}WH.png`
    : gridStyle === 'Contoured' && gridPattern && previewGridColor
      ? usesF48GridFlow ? f48InternalGridAsset(gridPattern, previewGridColor) : contouredGridAssets[gridPattern]?.[previewGridColor] ?? null
    : gridStyle === 'Prairie' && previewGridColor
      ? prairieGridAssets[previewGridColor] ?? null
      : gridPattern && previewGridColor && internalGridPatternCodes[gridPattern] && internalGridColorCodes[previewGridColor]
        ? usesF48GridFlow ? f48InternalGridAsset(gridPattern, previewGridColor) : internalGridAsset(gridPattern, previewGridColor)
        : null
  const defaultInternalGridPreview = glassOptions.find((option) => option.id === 'f-clear-f15int')
  const externalPreviewOverlay = gridPattern && internalGridPatternCodes[gridPattern]
    ? usesF48GridFlow
      ? f48InternalGridAsset(gridPattern, 'White')
      : `/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT${internalGridPatternCodes[gridPattern]}WH.png`
    : gridPathId === 'external'
      ? '/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT8LWH.png'
      : null
  const gridPreviewDoorCode = usesF48GridFlow ? selectedStyleCodes.includes('F482') ? 'F482' : 'F48' : 'F'
  const selectedGridPreview = glass && selectedGridLocationValue !== 'Internal' && externalPreviewOverlay
    ? { ...glass, overlaysByDoorStyle: { ...glass.overlaysByDoorStyle, [gridPreviewDoorCode]: externalPreviewOverlay } }
    : glass && selectedGridOverlay
    ? { ...glass, overlaysByDoorStyle: { ...glass.overlaysByDoorStyle, [gridPreviewDoorCode]: selectedGridOverlay } }
    : usesFullLiteGridFlow && glass && defaultInternalGridPreview
      ? { ...defaultInternalGridPreview, name: glass.name }
      : glass
  const previewGlass = supportsGlass ? (usesGridFlow ? selectedGridPreview : glass) ?? doorStyleDefaultGlass : selectedHardware ? clearOnlyGlass : null
  const usesRetroGlassCategory = selectedStyleCodes.some((code) => ['3LT', '3STEP', '4LT', '5LT', 'F764'].includes(code))
  const availableGlassCategories = usesRetroGlassCategory
    ? [retroGlassCategory]
    : glassCategoryChoices.filter((category) => availableGlass.some((option) => glassCategory(option) === category.id))
  const visibleGlass = selectedGlassCategory
    ? usesRetroGlassCategory && selectedGlassCategory === 'retro'
      ? availableGlass
      : availableGlass.filter((option) => glassCategory(option) === selectedGlassCategory)
    : []
  const glassOptionGroups = [...visibleGlass.reduce((groups, option) => {
    const key = glassGroupKey(option)
    const group = groups.get(key) ?? { key, title: glassGroupTitle(option), options: [] }
    group.options.push(option)
    groups.set(key, group)
    return groups
  }, new Map<string, GlassOptionGroup>()).values()]
  const availableGlassIds = availableGlass.map((item) => item.id).join('|')
  const pages: BuilderPage[] = [
    'door-style',
    'door-line',
    ...(needsGrainStep ? ['door-grain' as const] : []),
    'finish',
    ...(supportsGlass ? ['glass-type' as const, 'glass' as const] : []),
    ...(usesGridFlow ? [
      'grid-location' as const,
      ...(selectedGridLocationValue === 'Internal' ? ['grid-style' as const] : []),
      ...(gridPathId && (selectedGridLocationValue !== 'Internal' || (gridStyle && gridStyle !== 'Prairie')) ? ['grid-pattern' as const] : []),
      ...(selectedGridLocationValue === 'Internal' && (gridStyle === 'Prairie' || Boolean(gridPattern)) && compatibleGridColors.length ? ['grid-color' as const] : []),
      ...(selectedGridLocationValue === 'Internal' && gridColor && compatibleGridWidths.length ? ['grid-width' as const] : []),
    ] : []),
    'hardware',
    'door-swing',
    'review',
  ]
  const currentPage = pages[step] ?? pages[pages.length - 1]
  const currentStep = currentPage === 'door-style' || currentPage === 'door-line' || currentPage === 'door-grain'
    ? 'Door Style'
    : currentPage === 'finish'
      ? 'Finish'
      : currentPage === 'glass-type' || currentPage === 'glass' || currentPage.startsWith('grid-')
        ? 'Glass'
        : currentPage === 'hardware' || currentPage === 'door-swing'
          ? 'Hardware'
          : 'Review & Quote'
  const activeMainStepIndex = steps.indexOf(currentStep)
  const product = resolveDoorProduct(style, finish, selectedGrain ?? undefined, selectedDoorLine?.id)
  const previewConfig = {
    finish,
    tintColor: previewFinish?.color ?? null,
    applyFinish: Boolean(previewFinish),
    glass: previewGlass,
    hardware,
    doorSwing: selectedDoorSwing,
  }
  const demoStyleByCode = (code: string) => doorStyles.find((item) => item.code === code || item.variants.some((variant) => variant.code === code)) ?? doorStyles[0]
  const usedHeroFinishes = new Set<string>()
  const buildHomeDemo = (styleCode: string, presetIndex: number) => {
    const demoStyle = demoStyleByCode(styleCode)
    const compatibleDoorLines = doorLineChoicesForStyle(demoStyle)
    const finishCandidates = compatibleDoorLines.flatMap((doorLine) => {
      const grain = autoGrainForDoorLine(demoStyle, doorLine.id)
      return finishesForStyle(demoStyle, finishes, doorLine.id, grain).map((finishOption) => ({ doorLine, grain, finishOption }))
    })
    const unusedFinish = finishCandidates.find(({ finishOption }) => !usedHeroFinishes.has(finishOption.id))
    const selectedCombination = unusedFinish ?? finishCandidates[presetIndex % Math.max(finishCandidates.length, 1)]
    const demoDoorLine = selectedCombination?.doorLine ?? compatibleDoorLines[0]
    const demoGrain = demoDoorLine ? autoGrainForDoorLine(demoStyle, demoDoorLine.id) : null
    const demoFinish = selectedCombination?.finishOption ?? finishes[presetIndex % finishes.length]
    usedHeroFinishes.add(demoFinish.id)
    const demoProduct = resolveDoorProduct(demoStyle, demoFinish, demoGrain ?? undefined, demoDoorLine?.id)
    const isGlassCapable = demoProduct.styleCodes.some((code) => glassDoorCodes.has(code))
    const compatibleGlass = glassOptions.filter((option) => demoProduct.styleCodes.some((code) => option.overlaysByDoorStyle[code]))
    const preferredGlass = HERO_GLASS_OVERRIDES[styleCode as keyof typeof HERO_GLASS_OVERRIDES]
    const demoGlass = isGlassCapable
      ? compatibleGlass.find((option) => option.id === preferredGlass)
        ?? compatibleGlass[presetIndex % Math.max(compatibleGlass.length, 1)]
        ?? null
      : null
    const demoHardware = hardwareOptions[presetIndex % hardwareOptions.length]

    if (import.meta.env.DEV && (!demoFinish?.color || !demoHardware || (isGlassCapable && !demoGlass))) {
      console.warn('[hero-door-preset:incomplete]', {
        styleCode,
        doorLineChoiceId: demoDoorLine?.id,
        finish: demoFinish?.id,
        hardware: demoHardware?.id,
        glass: demoGlass?.id,
        isGlassCapable,
      })
    }
    return {
      style: demoStyle,
      finish: demoFinish,
      glass: demoGlass,
      hardware: demoHardware,
      grain: demoGrain,
      product: demoProduct,
      isGlassCapable,
    }
  }
  const homeDemoConfigurations = HERO_SLAB_CODES.map(buildHomeDemo)
  const activeHomeDemo = homeDemoConfigurations[homeDemoIndex % homeDemoConfigurations.length]

  useEffect(() => {
    if (doorLineId && !availableDoorLines.some((item) => item.id === doorLineId)) {
      setDoorLineId('')
      setGrainId('')
    }
    if (grainId && !isSignatureDoorLine) setGrainId('')
    if (grainId && needsGrainStep && !signatureGrainOptions.some((item) => item.id === grainId)) {
      setGrainId('')
    }
    if (effectiveFinishTypes.length && !effectiveFinishTypes.includes(selectedFinishType as 'paint' | 'stain')) {
      setSelectedFinishType(effectiveFinishTypes[0])
      setSelectedPaint('')
      setSelectedStain('')
    }
    if (finishId && selectedDoorLine && availableFinishes.length && !availableFinishes.some((item) => item.id === finishId)) {
      if (selectedFinishType === 'paint') setSelectedPaint('')
      if (selectedFinishType === 'stain') setSelectedStain('')
    }
    if (selectedGlassCategory && !availableGlassCategories.some((item) => item.id === selectedGlassCategory)) {
      setSelectedGlassCategory('')
      setGlassId('')
    }
    if (glassId && selectedGlassCategory && !visibleGlass.some((item) => item.id === glassId)) setGlassId('')
    if (glassId && (!supportsGlass || !availableGlass.some((item) => item.id === glassId))) setGlassId('')
    if (step >= pages.length) setStep(pages.length - 1)
  }, [styleId, doorLineId, grainId, availableDoorLineIds, isSignatureDoorLine, selectedDoorLineLineIdsKey, needsGrainStep, effectiveFinishTypes, selectedFinishType, finishId, availableFinishIds, selectedGlassCategory, glassId, availableGlassIds, supportsGlass, step, pages.length])

  useEffect(() => {
    if (screen !== 'builder') return

    requestAnimationFrame(() => {
      const selectedCard = builderOptionsRef.current?.querySelector<HTMLElement>('.option-card.selected, .glass-choice-card.selected, .hardware-option-card.selected')

      if (selectedCard) {
        selectedCard.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
        return
      }

      builderOptionsRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
    })
  }, [screen, currentPage])

  useEffect(() => {
    if (screen !== 'home') return
    const timer = window.setInterval(() => {
      setHomeDemoIndex((current) => (current + 1) % homeDemoConfigurations.length)
    }, 1800)
    return () => window.clearInterval(timer)
  }, [screen, homeDemoConfigurations.length])

  const goTo = (next: number) => {
    if (next >= 0 && next < pages.length) setStep(next)
  }

  const resetGridOptions = () => {
    setGridPathId('')
    setGridStyle('')
    setGridPattern('')
    setGridColor('')
    setGridWidth('')
  }

  const selectDoorStyle = (nextStyleId: string) => {
    const nextStyle = doorStyles.find((item) => item.id === nextStyleId)
    if (!nextStyle) return
    if (nextStyleId !== styleId) {
      setStyleId(nextStyleId)
      setDoorLineId('')
      setGrainId('')
      setSelectedGlassCategory('')
      setGlassId('')
      resetGridOptions()
    }
    if (doorStyles.length === 1) goTo(step + 1)
  }

  const startOver = () => {
    setStyleId('')
    setDoorLineId('')
    setGrainId('')
    setSelectedFinishType('')
    setSelectedPaint('')
    setSelectedStain('')
    setSelectedGlassCategory('')
    setGlassId('')
    resetGridOptions()
    setHardwareId('')
    setDoorSwingId('')
    setContact(initialContact)
    setErrors({})
    setSubmitted(false)
    setSubmitting(false)
    setSubmitError('')
    setSubmissionResult(null)
    setScreen('builder')
    goTo(0)
  }

  const resetDesign = () => {
    if (!window.confirm('Reset your door design? All current selections will be cleared.')) return
    setBuilderPreviewView('Exterior')
    startOver()
  }

  const canVisitStep = (target: number) => {
    const targetStep = steps[target]
    if (!targetStep) return false
    const targetPage = pages.findIndex((page) => (
      targetStep === 'Door Style' ? page === 'door-style'
        : targetStep === 'Finish' ? page === 'finish'
          : targetStep === 'Glass' ? page === 'glass-type'
            : targetStep === 'Hardware' ? page === 'hardware'
              : page === 'review'
    ))
    return targetPage >= 0 && targetPage <= step
  }

  const showScreen = (next: 'home' | 'builder') => {
    setScreen(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const updateContact = (key: keyof ContactForm, value: string) => {
    setContact((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const selectFinishTab = (nextTab: 'paint' | 'stain') => {
    if (nextTab === selectedFinishType) return
    setSelectedFinishType(nextTab)
    setSelectedPaint('')
    setSelectedStain('')
  }

  const selectDoorLine = (nextDoorLineId: string) => {
    if (!availableDoorLines.some((item) => item.id === nextDoorLineId)) return
    if (nextDoorLineId !== doorLineId) {
      setDoorLineId(nextDoorLineId)
      setGrainId('')
      setSelectedGlassCategory('')
      setGlassId('')
      resetGridOptions()
    }
    if (availableDoorLines.length === 1) goTo(step + 1)
  }

  const selectGrain = (nextGrain: string) => {
    if (!signatureGrainOptions.some((item) => item.id === nextGrain)) return
    if (nextGrain !== grainId) setGrainId(nextGrain)
    if (signatureGrainOptions.length === 1) goTo(step + 1)
  }

  const selectFinish = (nextFinishId: string, nextFinishType: 'paint' | 'stain') => {
    if (!visibleFinishes.some((item) => item.id === nextFinishId)) return
    if (nextFinishId !== finishId) {
      if (nextFinishType === 'paint') setSelectedPaint(nextFinishId)
      else setSelectedStain(nextFinishId)
    }
    if (visibleFinishes.length === 1) goTo(step + 1)
  }

  const selectGlass = (nextGlassId: string) => {
    if (!visibleGlass.some((item) => item.id === nextGlassId)) return
    if (nextGlassId !== glassId) {
      setGlassId(nextGlassId)
      resetGridOptions()
    }
    if (visibleGlass.length === 1) goTo(step + 1)
  }

  const selectGlassCategory = (nextCategory: GlassCategory) => {
    if (!availableGlassCategories.some((item) => item.id === nextCategory)) return
    if (nextCategory !== selectedGlassCategory) {
      setSelectedGlassCategory(nextCategory)
      setGlassId('')
      resetGridOptions()
    }
    if (availableGlassCategories.length === 1) goTo(step + 1)
  }

  const selectGridLocation = (nextLocationId: string) => {
    setGridPathId(nextLocationId)
    setGridPattern('')
    setGridStyle('')
    setGridColor('')
    setGridWidth('')
  }

  const selectGridStyle = (nextStyle: GridStyle) => {
    setGridStyle(nextStyle)
    setGridPattern('')
    setGridColor('')
    setGridWidth('')
  }

  const selectGridPattern = (nextPattern: GridPattern) => {
    setGridPattern(nextPattern)
    setGridColor('')
    setGridWidth('')
    if (compatibleGridPatterns.length === 1) goTo(step + 1)
  }

  const selectGridColor = (nextColor: GridColor) => {
    setGridColor(nextColor)
    setGridWidth('')
    if (compatibleGridColors.length === 1) goTo(step + 1)
  }

  const selectGridWidth = (nextWidth: GridWidth) => {
    setGridWidth(nextWidth)
    if (compatibleGridWidths.length === 1) goTo(step + 1)
  }

  const selectHardware = (nextHardwareId: string) => {
    if (!hardwareOptions.some((item) => item.id === nextHardwareId)) return
    if (nextHardwareId !== hardwareId) setHardwareId(nextHardwareId)
    if (hardwareStyleGroups.length === 1 && hardwareStyleGroups[0].length === 1) goTo(step + 1)
  }

  const selectDoorSwing = (nextDoorSwingId: string) => {
    if (!doorSwingOptions.some((item) => item.id === nextDoorSwingId)) return
    if (nextDoorSwingId !== doorSwingId) setDoorSwingId(nextDoorSwingId)
    if (doorSwingOptions.length === 1) goTo(step + 1)
  }

  const submit = async () => {
    if (submitting || submitted) return
    const required: (keyof ContactForm)[] = ['fullName', 'email', 'phone', 'zip']
    const nextErrors: Partial<Record<keyof ContactForm, string>> = {}
    required.forEach((key) => { if (!contact[key].trim()) nextErrors[key] = 'Please complete this field.' })
    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) nextErrors.email = 'Enter a valid email address.'
    if (contact.phone && !/^[+]?[\d\s().-]{7,20}$/.test(contact.phone)) nextErrors.phone = 'Enter a valid phone number.'
    if (contact.zip && !/^\d{5}(-\d{4})?$/.test(contact.zip)) nextErrors.zip = 'Enter a valid ZIP code.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      if (!selectedHardware) throw new Error('Please select hardware before sending your configuration.')
      if (!selectedDoorSwing) throw new Error('Please select a door swing before sending your configuration.')
      const { generateSummaryAttachment } = await import('./utils/pdf')
      const attachment = await generateSummaryAttachment(contact, product, style, selectedGrain, finish, configuredGlass, gridConfiguration, selectedHardware, selectedDoorSwing)
      const result = await submitQuote({ configuration: { product, style, grain: selectedGrain, finish, glass: configuredGlass, grid: gridConfiguration, hardware: selectedHardware, doorSwing: selectedDoorSwing }, contact, attachment, submittedAt: new Date().toISOString() })
      setSubmissionResult(result)
      setSubmitted(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const downloadPdf = async () => {
    if (!selectedHardware || !selectedDoorSwing) return
    const { downloadSummary } = await import('./utils/pdf')
    await downloadSummary(contact, product, style, selectedGrain, finish, configuredGlass, gridConfiguration, selectedHardware, selectedDoorSwing)
  }

  const configurationSummaryRows: [string, string, number][] = [
    ['Door style', style.name, pages.indexOf('door-style')],
    ['Door Line', selectedDoorLine?.name ?? product.doorType, pages.indexOf('door-line')],
    ...(selectedGrain ? [['Grain', selectedGrain, pages.indexOf('door-grain')] as [string, string, number]] : []),
    ['Finish type', selectedFinishType === 'stain' ? 'Stain' : 'Paint', pages.indexOf('finish')],
    [finish.finishType === 'paint' ? 'Finish color' : 'Stain color', finish.name, pages.indexOf('finish')],
    ...(compatibilitySupportsGlass ? [['Glass', configuredGlass?.name ?? 'Clear', pages.indexOf('glass-type')] as [string, string, number]] : []),
    ...(gridConfiguration ? [
      ...(gridConfiguration.glassCoating !== 'Standard / No Low-E' ? [['Glass Coating', gridConfiguration.glassCoating, pages.indexOf('grid-location')] as [string, string, number]] : []),
      ...(gridConfiguration.gridLocation ? [['Grid Location', gridConfiguration.gridLocation, pages.indexOf('grid-location')] as [string, string, number]] : []),
      ...(gridConfiguration.gridStyle ? [['Grid Style', gridConfiguration.gridStyle, pages.indexOf('grid-style')] as [string, string, number]] : []),
      ...(gridConfiguration.gridPattern ? [['Grid Pattern', gridConfiguration.gridPattern, pages.indexOf('grid-pattern')] as [string, string, number]] : []),
      ...(gridConfiguration.gridColor ? [['Grid Color', gridConfiguration.gridColor, pages.indexOf('grid-color')] as [string, string, number]] : []),
      ...(gridConfiguration.gridWidth ? [['Grid Width', gridConfiguration.gridWidth, pages.indexOf('grid-width')] as [string, string, number]] : []),
    ] as [string, string, number][] : []),
    ['Hardware', selectedHardware ? hardwareDisplayName(selectedHardware) : 'Not selected', pages.indexOf('hardware')],
    ['Door swing', selectedDoorSwing?.name ?? 'Not selected', pages.indexOf('door-swing')],
  ]

  return (
    <div className={`app ${screen === 'home' ? 'home-app' : ''}`}>
      <header>
        <div className="brand">
          <button className="brand-home" type="button" aria-label="Go to home page" onClick={() => showScreen('home')}>
            <img src="/assets/branding/hgi-logo-black.png" alt="Home Guard Industries Doors and Windows" />
          </button>
          <span className="app-name"><strong>Home Guard Door Builder</strong><small>Build your door. Download your order. Request a quote.</small></span>
        </div>
        <div className="header-actions">
          {screen === 'builder' && <button className="start-over" onClick={startOver}><RotateCcw size={15} /><span>Start Over</span></button>}
          <button className="home-return" aria-label="Home" onClick={() => showScreen('home')}><HomeIcon size={17} /><span>Home</span></button>
          <div className="header-help"><Phone size={16} /><span>Questions? <strong>Talk to a door expert</strong></span></div>
        </div>
      </header>

      {screen === 'home' ? <main className="home-page">
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-eyebrow">Home Guard Door Builder</span>
            <h1>Build Your Home Guard Door</h1>
            <h2>Design your ideal entry door with real styles, finishes, glass, and hardware options.</h2>
            <p>Preview your selections instantly, save your configuration, and request a quote when you’re ready.</p>
            <button className="start-building" onClick={() => showScreen('builder')}>Start Building <ArrowRight size={18} /></button>
            <span className="home-trust"><ShieldCheck size={15} /> Built for your home. Backed by Home Guard Industries.</span>
          </div>
          <div className="home-hero-visual">
            <div className="home-entryway-demo hero-composite" aria-label="Animated examples of configurable entry doors">
              <div className="hero-composite-stage">
                <img className="home-entryway-image" src="/assets/hero/hero-entryway.png" alt="Welcoming home entryway with a customizable door preview" />
                <div className="home-entryway-overlay" aria-hidden="true">
                  <div className="home-entryway-door-slot hero-door-stack entryway-door-stack hero-door-overlay" style={heroDoorOpeningStyle}>
                    {homeDemoConfigurations.map((demo, index) => (
                      <div className={`home-demo-door-layer ${index === homeDemoIndex % homeDemoConfigurations.length ? 'active' : ''}`} key={`${demo.style.code}-${demo.finish.id}-${demo.glass?.id ?? 'glass'}-${demo.hardware.id}`}>
                        <DoorPreview style={demo.style} finish={demo.finish} glass={demo.glass} hardware={demo.hardware} grain={demo.grain} product={demo.product} tintColor={demo.finish.color} applyFinish compact />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="home-preview-label">
                <span>Preview as you build</span>
                <small>{activeHomeDemo.style.name} · {activeHomeDemo.finish.name} · {activeHomeDemo.glass?.name ?? 'No glass'} · {hardwareDisplayName(activeHomeDemo.hardware)}</small>
              </div>
            </div>
          </div>
        </section>
      </main> : <>
      <nav className="stepper" aria-label="Configuration progress">
        {steps.map((label, index) => {
          const isReachable = canVisitStep(index)
          const targetPage = pages.findIndex((page) => label === 'Door Style' ? page === 'door-style' : label === 'Finish' ? page === 'finish' : label === 'Glass' ? page === 'glass-type' : label === 'Hardware' ? page === 'hardware' : page === 'review')
          return <button key={label} className={`${index === activeMainStepIndex ? 'active' : ''} ${index < activeMainStepIndex ? 'done' : ''}`} disabled={!isReachable} aria-current={index === activeMainStepIndex ? 'step' : undefined} onClick={() => isReachable && goTo(targetPage)}><span>{index < activeMainStepIndex ? <Check size={13} /> : index + 1}</span><em>{label}</em></button>
        })}
      </nav>
      <main>
        {currentStep !== 'Review & Quote' && <div className="mobile-live-preview">{selectedStyle ? <DoorPreview style={style} finish={previewConfig.finish} glass={previewConfig.glass} hardware={previewConfig.hardware} grain={selectedGrain} product={product} tintColor={previewConfig.tintColor} doorSwing={previewConfig.doorSwing} applyFinish={previewConfig.applyFinish} /> : <EmptyDoorPreview />}</div>}
        <section ref={builderPanelRef} className={`builder-panel ${currentStep !== 'Review & Quote' ? 'configuration-step' : 'review-step'}`}>
          {currentStep !== 'Review & Quote' && <>
            <div className="section-heading step-heading">
              <div className="step-heading-copy">
                <div className="step-label-row">
                  <span>Step {activeMainStepIndex + 1} of {steps.length}</span>
                </div>
                <div className="step-title-row">
                  <h1>{currentPage === 'door-style' ? 'Choose a Door Style' : currentPage === 'door-line' ? 'Choose Your Door Line' : currentPage === 'door-grain' ? 'Choose Your Door Grain' : currentPage === 'finish' ? 'Choose Your Finish' : currentPage === 'glass-type' ? 'Choose Your Glass Type' : currentPage === 'glass' ? 'Choose Your Glass' : currentPage === 'grid-location' ? 'Choose Grid Location' : currentPage === 'grid-style' ? 'Choose Internal Grid Style' : currentPage === 'grid-pattern' ? 'Choose Grid Pattern' : currentPage === 'grid-color' ? 'Choose Grid Color' : currentPage === 'grid-width' ? 'Choose Grid Width' : currentPage === 'hardware' ? 'Choose Your Hardware' : 'Choose Your Door Swing'}</h1>
                  <div className="section-resets">
                    {currentPage === 'door-style' && <button type="button" aria-label="Reset Design" onClick={resetDesign}><RotateCcw size={20} /><span>Reset Design</span></button>}
                  </div>
                </div>
                <p>{currentPage === 'door-style' ? 'Browse all available door styles and choose the one that feels right for your home.' : currentPage === 'door-line' ? 'Choose the compatible material line for this door style.' : currentPage === 'door-grain' ? 'Choose the Signature Series grain for this door.' : currentPage === 'finish' ? 'Pick from the valid paint or stain finishes.' : currentPage === 'glass-type' ? 'Choose the kind of glass you want to explore.' : currentPage === 'glass' ? 'Balance natural light, privacy, and personality.' : currentPage === 'grid-location' ? 'Choose where the grids are installed.' : currentPage === 'grid-style' ? 'Choose the profile of your internal grids.' : currentPage === 'grid-pattern' ? 'Choose a pattern compatible with your selected grid style.' : currentPage === 'grid-color' ? 'Choose the confirmed color for this grid pattern.' : currentPage === 'grid-width' ? 'Choose the confirmed grid width.' : currentPage === 'hardware' ? 'Complete your entry with hardware.' : 'Choose the direction your door will swing when viewed from the outside.'}</p>
              </div>
            </div>
            <div ref={builderOptionsRef} className="builder-options-scroll">
              {currentPage === 'finish' && selectedDoorLine && <div className="finish-toolbar">
                <div className="finish-tabs" role="tablist" aria-label="Finish type">{effectiveFinishTypes.map((type) => <button type="button" role="tab" aria-selected={activeFinishType === type} className={activeFinishType === type ? 'active' : ''} key={type} onClick={() => selectFinishTab(type)}>{type === 'paint' ? 'Paint' : 'Stain'}</button>)}</div>
                <div className="finish-logo-slot">
                  {currentPage === 'finish' && activeFinishType === 'paint' && <img src="/assets/branding/pro-match-logo.png" alt="Pro Match paint colors" loading="lazy" decoding="async" />}
                  {currentPage === 'finish' && activeFinishType === 'stain' && <img src="/assets/branding/timberstain-logo.png" alt="TimberStain" loading="lazy" decoding="async" />}
                </div>
              </div>}
              <div className={`options-grid step-${step} ${currentPage === 'door-style' || currentPage === 'door-grain' || currentPage === 'finish' || currentPage === 'glass-type' || currentPage.startsWith('grid-') ? 'door-style-grid' : ''}`}>
                {currentPage === 'door-style' && doorStyles.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.eyebrow} selected={styleId === item.id} onClick={() => selectDoorStyle(item.id)} visual={<DoorStyleThumbnail style={item} />} badge={item.variants.some((variant) => variant.lineId.startsWith('signature-')) ? <img src="/assets/branding/signature-series-logo.png" alt="Available in Signature Series" loading="lazy" decoding="async" /> : undefined} />)}
                {currentPage === 'door-line' && availableDoorLines.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow="Door Line" selected={doorLineId === item.id} onClick={() => selectDoorLine(item.id)} visual={<span className="door-line-card-image"><img src={item.image} alt="" loading="lazy" decoding="async" /></span>} />)}
                {currentPage === 'door-grain' && signatureGrainOptions.map((item) => <OptionCard key={item.id} title={item.name} eyebrow="Signature grain" selected={selectedGrain === item.id} onClick={() => selectGrain(item.id)} visual={<img className="grain-card-image" src={item.image} alt="" loading="lazy" decoding="async" />} />)}
                {currentPage === 'finish' && visibleFinishes.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.finishType} selected={finishId === item.id} onClick={() => selectFinish(item.id, item.finishType)} visual={<span className="finish-tile-wrap" style={{ '--fallback-finish': item.color } as CSSProperties}><img className="finish-tile-image" src={item.image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} /></span>} />)}
                {currentPage === 'glass-type' && availableGlassCategories.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow="Glass type" selected={selectedGlassCategory === item.id} onClick={() => selectGlassCategory(item.id)} visual={<img className={`glass-option-thumbnail${item.id === 'retro' || item.id === 'clic' ? ' retro-glass-thumbnail' : ''}`} src={item.image} alt="" loading="lazy" decoding="async" />} />)}
                {currentPage === 'glass' && glassOptionGroups.map((group) => <GlassOptionCard group={group} selectedId={glassId} onSelect={(item) => selectGlass(item.id)} key={group.key} />)}
                {currentPage === 'grid-location' && gridLocations.filter((item) => !usesF48GridFlow || item.id !== 'external').map((item) => <OptionCard key={item.id} title={item.name} selected={gridPathId === item.id} onClick={() => selectGridLocation(item.id)} visual={<img className="grid-option-thumbnail" src={item.image} alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'grid-style' && lowEGridStyles.map((item) => <OptionCard key={item.id} title={item.id} selected={gridStyle === item.id} onClick={() => selectGridStyle(item.id)} visual={<img className="grid-option-thumbnail" src={item.image} alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'grid-pattern' && compatibleGridPatterns.map((item) => <OptionCard key={item.id} title={item.id} selected={gridPattern === item.id} onClick={() => selectGridPattern(item.id)} visual={<img className="grid-pattern-thumbnail" src="/assets/grid-options/All Lites.png" alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'grid-color' && compatibleGridColors.map((color) => <OptionCard key={color} title={color} eyebrow="Grid color" selected={gridColor === color} onClick={() => selectGridColor(color)} visual={<span className="finish-tile-wrap grid-color-tile" style={{ '--fallback-finish': gridColorValues[color] ?? '#efeee8' } as CSSProperties} />} />)}
                {currentPage === 'grid-width' && gridColor && compatibleGridWidths.map((width) => <OptionCard key={width} className="bar-size-option-card" title={width} eyebrow="Bar size" selected={gridWidth === width} onClick={() => selectGridWidth(width)} />)}
                {currentPage === 'hardware' && hardwareStyleGroups.map((options) => <HardwareOptionCard key={`${options[0].manufacturer}-${options[0].style}`} options={options} selectedId={hardwareId} onSelect={(option) => selectHardware(option.id)} />)}
                {currentPage === 'door-swing' && doorSwingOptions.map((item) => <OptionCard key={item.id} title={`${item.id} – ${item.name}`} eyebrow="Door swing" selected={doorSwingId === item.id} onClick={() => selectDoorSwing(item.id)} visual={<img className="door-swing-image" src={item.image} alt="" loading="lazy" decoding="async" />} />)}
              </div>
            </div>
          </>}

          {currentPage === 'review' && !submitted && <>
            <div className="section-heading review-heading"><span>Final step</span><h1>Find a Home Guard Dealer</h1><p>Submit your contact information and door configuration. A Home Guard dealer or team member will follow up with next steps.</p></div>
            <div className="mobile-review-preview"><DoorPreview style={style} finish={previewConfig.finish} glass={previewConfig.glass} hardware={previewConfig.hardware} grain={selectedGrain} product={product} tintColor={previewConfig.tintColor} doorSwing={previewConfig.doorSwing} applyFinish={previewConfig.applyFinish} /></div>
            <div className="summary-card">
              <div className="summary-title"><h2>Configuration Summary</h2></div>
              {configurationSummaryRows.map(([label, value, target]) => <div className="summary-row" key={label}><span>{label}<strong>{value}</strong></span>{target >= 0 && <button onClick={() => goTo(target)}>Edit</button>}</div>)}
            </div>
            <div className="review-download-form">
              <div className="attachment-card">
                <span className="attachment-icon"><FileText size={25} /></span>
                <span className="attachment-copy"><strong>{configurationPdfName}</strong></span>
                <button type="button" onClick={downloadPdf}><Download size={16} /> Download PDF</button>
              </div>
              <div className="form-card">
                <h2>Your Contact Information</h2><p>We’ll use your ZIP code to help connect you with the right Home Guard dealer.</p>
                <QuoteForm values={contact} errors={errors} onChange={updateContact} />
                <label className="consent"><input type="checkbox" defaultChecked /> <span>I agree to be contacted about this door configuration.</span></label>
                {submitError && <p className="submit-error" role="alert">{submitError}</p>}
                <button className="submit-button" type="button" disabled={submitting} onClick={submit}><Send size={18} /> {submitting ? 'Preparing & Sending...' : 'Send My Door Configuration'}</button>
                <p className="privacy"><ShieldCheck size={15} /> Your information is kept private and never sold.</p>
              </div>
            </div>
          </>}

          {submitted && <div className="success">
            <span><Check size={32} /></span><small>{submissionResult?.mode === 'demo' ? 'Demo complete' : 'Configuration sent'}</small><h1>Thanks, {contact.fullName}.</h1>
            <p>{submissionResult?.message}</p>
            <button onClick={downloadPdf}><Download size={17} /> Download Your Summary</button>
          </div>}

          {currentPage !== 'review' && <div className="builder-actions"><button className="back" disabled={step === 0} onClick={() => goTo(step - 1)}><ArrowLeft size={17} /> Previous</button><button className="next" disabled={(currentPage === 'door-style' && !selectedStyle) || (currentPage === 'door-line' && !selectedDoorLine) || (currentPage === 'door-grain' && !selectedGrain) || (currentPage === 'finish' && !visibleSelectedFinish) || (currentPage === 'glass-type' && !selectedGlassCategory) || (currentPage === 'glass' && visibleGlass.length > 0 && !selectedGlass) || (currentPage === 'grid-location' && !gridPathId) || (currentPage === 'grid-style' && !gridStyle) || (currentPage === 'grid-pattern' && !gridPattern) || (currentPage === 'grid-color' && !gridColor) || (currentPage === 'grid-width' && !gridWidth) || (currentPage === 'hardware' && !selectedHardware) || (currentPage === 'door-swing' && !selectedDoorSwing)} onClick={() => goTo(step + 1)}>Next <ArrowRight size={17} /></button></div>}
        </section>

        {!submitted && <aside>
          <div className="aside-top">
            <span>Your design</span>
            {selectedStyle && <div className="preview-view-toggle" role="group" aria-label="Preview view">
              {(['Exterior', 'Interior'] as const).map((view) => <button type="button" className={builderPreviewView === view ? 'active' : ''} aria-pressed={builderPreviewView === view} key={view} onClick={() => setBuilderPreviewView(view)}>{view}</button>)}
            </div>}
          </div>
          <div className="aside-preview-area">
            {selectedStyle ? <DoorPreview style={style} finish={previewConfig.finish} glass={previewConfig.glass} hardware={previewConfig.hardware} grain={selectedGrain} product={product} tintColor={previewConfig.tintColor} doorSwing={previewConfig.doorSwing} applyFinish={previewConfig.applyFinish} view={builderPreviewView} onViewChange={setBuilderPreviewView} showViewToggle={false} /> : <EmptyDoorPreview />}
          </div>
          <div className="mini-summary">
            <span><b>Door style</b><strong>{selectedStyle?.name ?? 'Not selected'}</strong></span>
            <span><b>Door Line</b><strong>{selectedDoorLine?.name ?? 'Not selected'}</strong></span>
            {selectedGrain && <span><b>Grain</b><strong>{selectedGrain}</strong></span>}
            <span><b>Paint or stain</b><strong>{selectedStyle ? (activeFinishType === 'paint' ? 'Paint' : 'Stain') : 'Not selected'}</strong></span>
            <span><b>Finish</b><strong>{selectedFinish?.name ?? 'Not selected'}</strong></span>
            <span><b>Glass</b><strong>{compatibilitySupportsGlass ? (configuredGlass?.name ?? 'Clear') : 'Not applicable'}</strong></span>
            {gridConfiguration && <>{gridConfiguration.gridLocation && <span><b>Grid location</b><strong>{gridConfiguration.gridLocation}</strong></span>}{gridConfiguration.gridStyle && <span><b>Grid style</b><strong>{gridConfiguration.gridStyle}</strong></span>}{gridConfiguration.gridPattern && <span><b>Grid pattern</b><strong>{gridConfiguration.gridPattern}</strong></span>}{gridConfiguration.gridColor && <span><b>Grid color</b><strong>{gridConfiguration.gridColor}</strong></span>}{gridConfiguration.gridWidth && <span><b>Grid width</b><strong>{gridConfiguration.gridWidth}</strong></span>}</>}
            <span><b>Hardware</b><strong>{selectedHardware ? hardwareDisplayName(selectedHardware) : 'Not selected'}</strong></span>
            <span><b>Door swing</b><strong>{selectedDoorSwing?.name ?? 'Not selected'}</strong></span>
          </div>
        </aside>}
      </main>
      </>}
      <footer><span>Copyright 2026 Home Guard Industries</span><span>Built for your home. Backed for years.</span></footer>
    </div>
  )
}
