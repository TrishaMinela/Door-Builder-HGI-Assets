import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, Check, Download, ExternalLink, Eye, FileText, Globe, HelpCircle, Home as HomeIcon, Mail, MapPin, Phone, RotateCcw, Send, ShieldCheck } from 'lucide-react'
import { DoorPreview, type DoorPreviewProps } from './components/DoorPreview'
import { DoorStyleThumbnail } from './components/DoorStyleThumbnail'
import { HardwareOptionCard } from './components/HardwareOptionCard'
import { OptionCard } from './components/OptionCard'
import { QuoteForm } from './components/QuoteForm'
import { doorStyles, finishes, glassOptions } from './data/options'
import { hardwareDisplayName, hardwareOptions } from './data/hardware'
import { autoGrainForDoorLine, doorLineChoicesForStyle, doorStyleSupportsGlass, finishesForStyle, finishTypesForDoorLine, glassDoorCodes, resolveDoorProduct } from './data/productCatalog'
import { approvedPrivacyGlassIds } from './data/privacyGlass'
import type { ContactForm, DoorSwing, GlassCoating, GlassOption, GridColor, GridConfiguration, GridPattern, GridStyle, GridWidth, HardwareView, PreviewHardware, SideliteConfiguration, SideliteGlassConfiguration } from './types'
import { configurationPdfName } from './utils/pdfConfig'
import { submitQuote } from './utils/submission'
import { fslGlassCategories, fslGlassOptions, fslGridAsset, fslLowEStyleRules, fslStandardStyleRules, type SideliteGlassCategory, type SideliteGlassOption } from './data/fslGlass'
import { f48slGlassCategories, f48slGlassOptions, f48slGridAsset, f48slLowEStyleRules, f48slStandardStyleRules } from './data/f48slGlass'
import { sslGlassCategories, sslGlassOptions, sslGridAsset, sslLowEStyleRules, sslStandardStyleRules } from './data/sslGlass'
import { s2slGlassCategories, s2slGlassOptions, s2slStyleRules } from './data/s2slGlass'
import { cr14slGlassCategories, cr14slGlassOptions, cr14slGridAsset, cr14slStyleRules } from './data/cr14slGlass'
import { glassSelectionThumbnail } from './data/glassOptions'
import { cladColors } from './data/finishes'
import { HomeVisualizer } from './features/home-visualizer/HomeVisualizer'
import { HERO_PRESETS, heroDoorFilename, type HeroPreset } from './data/heroPresets'
import { HeroDoorGenerator } from './features/hero/HeroDoorGenerator'

const glassSteps = ['Door Style', 'Finish', 'Glass', 'Hardware', 'Review & Quote']
const noGlassSteps = ['Door Style', 'Finish', 'Hardware', 'Review & Quote']
type BuilderPage = 'door-style' | 'door-line' | 'door-grain' | 'sidelites' | 'sidelite-style' | 'door-finish' | 'jamb-type' | 'jamb-finish' | 'glass-type' | 'glass' | 'glass-variant' | 'grid-location' | 'grid-style' | 'grid-pattern' | 'grid-color' | 'grid-width' | 'sidelite-glass-type' | 'sidelite-glass' | 'sidelite-glass-variant' | 'sidelite-grid-location' | 'sidelite-grid-style' | 'sidelite-grid-pattern' | 'sidelite-grid-color' | 'sidelite-grid-width' | 'hardware' | 'door-swing' | 'review'
const mainDoorGlassPages = new Set<BuilderPage>(['glass-type', 'glass', 'glass-variant', 'grid-location', 'grid-style', 'grid-pattern', 'grid-color', 'grid-width'])
const sideliteGlassPages = new Set<BuilderPage>(['sidelite-glass-type', 'sidelite-glass', 'sidelite-glass-variant', 'sidelite-grid-location', 'sidelite-grid-style', 'sidelite-grid-pattern', 'sidelite-grid-color', 'sidelite-grid-width'])
type GlassCategory = 'clear' | 'decorative' | 'privacy' | 'blinds' | 'clic' | 'retro'
const initialContact: ContactForm = { fullName: '', email: '', phone: '', zip: '' }
const emptyPreviewHardware: PreviewHardware = { color: '#191919', type: 'long' }
const proMatchTooltipTitle = 'About ProMatch® Colors'
const proMatchTooltipText = 'ProMatch® colors are custom-blended to coordinate across select HGI products. Each painted door is carefully prepared, finished with two coats of enamel, and oven-baked for a smooth, durable finish backed by a 15-year warranty.'
const timberStainTooltipTitle = 'About TimberStain®'
const timberStainTooltipText = 'TimberStain® finishes use nature-inspired colors and are hand-applied to enhance the door’s natural texture and grain. Each finish is oven-cured, protected with a durable clear coat, and backed by a 15-year warranty.'
const proMatchNote = 'Colors may appear differently depending on the material, lighting, and screen. Confirm your final selection with an official color sample.'

function FinishInfoTooltip({ title, body, ariaLabel, tooltipId }: { title: string; body: string; ariaLabel: string; tooltipId: string }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 12, top: 12 })
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const updatePosition = () => {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const tooltipWidth = Math.min(340, window.innerWidth - 24)
    const estimatedHeight = 116
    const left = Math.max(12, Math.min(rect.right - tooltipWidth, window.innerWidth - tooltipWidth - 12))
    const top = rect.bottom + 8 + estimatedHeight <= window.innerHeight
      ? rect.bottom + 8
      : Math.max(12, rect.top - estimatedHeight - 8)
    setPosition({ left, top })
  }

  const showTooltip = () => {
    updatePosition()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const reposition = () => updatePosition()
    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open])

  return <span
    ref={wrapperRef}
    className="promatch-help"
    onMouseEnter={showTooltip}
    onMouseLeave={() => setOpen(false)}
  >
    <button
      ref={buttonRef}
      type="button"
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-controls={tooltipId}
      onClick={() => open ? setOpen(false) : showTooltip()}
      onFocus={showTooltip}
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <HelpCircle size={16} aria-hidden="true" />
    </button>
    {open && <span
      id={tooltipId}
      className="promatch-tooltip"
      role="tooltip"
      style={{ left: position.left, top: position.top }}
    >
      <strong>{title}</strong>
      <span>{body}</span>
    </span>}
  </span>
}

function ProMatchInfo() {
  return <FinishInfoTooltip title={proMatchTooltipTitle} body={proMatchTooltipText} ariaLabel="What are ProMatch colors?" tooltipId="promatch-colors-tooltip" />
}

function TimberStainInfo() {
  return <FinishInfoTooltip title={timberStainTooltipTitle} body={timberStainTooltipText} ariaLabel="What are TimberStain finishes?" tooltipId="timberstain-finishes-tooltip" />
}

const sideliteOptions: { id: SideliteConfiguration; name: string; image: string }[] = [
  { id: 'none', name: 'No Sidelites', image: '/assets/hgi-assets/Sidelites/options/No Side Lite.png' },
  { id: 'hinge-side', name: 'Hinge-Side Sidelite', image: '/assets/hgi-assets/Sidelites/options/Hinge Side - Sidelite.png' },
  { id: 'lock-side', name: 'Lock-Side Sidelite', image: '/assets/hgi-assets/Sidelites/options/Lock Side - Sidelite.png' },
  { id: 'both-sides', name: 'Sidelites on Both Sides', image: '/assets/hgi-assets/Sidelites/options/Both Sides - Sidelite.png' },
]
const sideliteLabels = Object.fromEntries(sideliteOptions.map((option) => [option.id, option.name])) as Record<SideliteConfiguration, string>
const sideliteStyleOptions = [
  { id: 'fsl', name: 'FSL', image: '/assets/hgi-assets/Sidelites/22 Gauge/options/FSL.png', mask: '/assets/masks/Sidelites/FSL.png' },
  { id: 'f48sl', name: 'F48SL', image: '/assets/hgi-assets/Sidelites/22 Gauge/options/F48SL.png', mask: '/assets/masks/Sidelites/F48SL.png' },
  { id: 'ssl', name: 'SSL', image: '/assets/hgi-assets/Sidelites/22 Gauge/options/SSL.png', mask: '/assets/masks/Sidelites/SSL.png' },
  { id: 's2sl', name: 'S2SL', image: '/assets/hgi-assets/Sidelites/22 Gauge/options/S2SL.png', mask: '/assets/masks/Sidelites/S2SL.png' },
  { id: 'cr14sl', name: 'CR14SL', image: '/assets/hgi-assets/Sidelites/Signature/options/CR14SL.png', mask: '/assets/masks/Sidelites/CR14SL.png' },
] as const
const sideliteGlassCatalogs = {
  fsl: { categories: fslGlassCategories, options: fslGlassOptions, standardRules: fslStandardStyleRules, lowERules: fslLowEStyleRules, gridAsset: fslGridAsset, prairiePattern: '5 Lite' as GridPattern, sdlPatterns: ['3 Lite', '4 Lite', '5 Lite'] as GridPattern[] },
  f48sl: { categories: f48slGlassCategories, options: f48slGlassOptions, standardRules: f48slStandardStyleRules, lowERules: f48slLowEStyleRules, gridAsset: f48slGridAsset, prairiePattern: '4 Lite' as GridPattern, sdlPatterns: ['2 Lite', '3 Lite', '4 Lite'] as GridPattern[] },
  ssl: { categories: sslGlassCategories, options: sslGlassOptions, standardRules: sslStandardStyleRules, lowERules: sslLowEStyleRules, gridAsset: sslGridAsset, prairiePattern: '3 Lite' as GridPattern, sdlPatterns: ['3 Lite'] as GridPattern[] },
  s2sl: { categories: s2slGlassCategories, options: s2slGlassOptions, standardRules: s2slStyleRules, lowERules: s2slStyleRules, gridAsset: () => '', prairiePattern: '3 Lite' as GridPattern, sdlPatterns: [] as GridPattern[] },
  cr14sl: { categories: cr14slGlassCategories, options: cr14slGlassOptions, standardRules: cr14slStyleRules, lowERules: cr14slStyleRules, gridAsset: cr14slGridAsset, prairiePattern: '3 Lite' as GridPattern, sdlPatterns: [] as GridPattern[] },
}
const groupSideliteGlassOptions = (options: SideliteGlassOption[]) => [...options.reduce((groups, option) => {
  const title = option.name.split(/\s+[–-]\s+/)[0]
  const key = title.toLowerCase()
  const existing = groups.get(key)
  if (existing) existing.options.push(option)
  else groups.set(key, { key, title, options: [option] })
  return groups
}, new Map<string, { key: string; title: string; options: SideliteGlassOption[] }>()).values()]
const glassVariantLabel = (name: string) => name.split(/\s+[–-]\s+/)[1] ?? name
const signatureSeriesId = 'signature-series'
const FULL_LITE_GRID_GLASS_ID = 'f-clear-grids'
const F48_GRID_GLASS_ID = 'f48-clear-grids'
const S_GRID_GLASS_ID = 's-clear-grids'
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
const allGridPatterns: { id: GridPattern; image: string }[] = [
  { id: '2 Lite', image: '/assets/grid-options/All Lites.png' },
  { id: '3 Lite', image: '/assets/grid-options/All Lites.png' },
  ...flatGridPatterns.slice(0, 4),
  { id: '9 Lite', image: '/assets/grid-options/All Lites.png' },
  ...flatGridPatterns.slice(4),
]
const internalGridPatternCodes: Partial<Record<GridPattern, string>> = { '2 Lite': '2L', '3 Lite': '3L', '4 Lite': '4L', '4 Lite Horizontal': '4LH', '6 Lite': '6L', '8 Lite': '8L', '9 Lite': '9L', '10 Lite': '10L', '12 Lite': '12L', '15 Lite': '15L' }
const internalGridColorCodes: Partial<Record<GridColor, string>> = { Beige: 'BE', Black: 'BK', Bronze: 'BZ', 'Bronze/White': 'WH', Champagne: 'CH', Tan: 'TA', White: 'WH' }
const internalGridAsset = (pattern: GridPattern, color: GridColor) => `/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT${internalGridPatternCodes[pattern]}${internalGridColorCodes[color]}.png`
const f48GridColorCodes: Partial<Record<GridColor, string>> = { Beige: 'BE', Black: 'BL', Bronze: 'BR', 'Bronze/White': 'WH', Champagne: 'CH', Tan: 'TA', White: 'WH' }
const f48InternalGridAsset = (pattern: GridPattern, color: GridColor) => `/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT${internalGridPatternCodes[pattern]}${f48GridColorCodes[color]}.png`
const sGridColorCodes: Partial<Record<GridColor, string>> = { Beige: 'BE', Black: 'BL', Bronze: 'BR', 'Bronze/White': 'WH', Champagne: 'CH', Tan: 'TA', White: 'WH' }
const sInternalGridAsset = (pattern: GridPattern, color: GridColor) => `/assets/hgi-assets/Glass/S/INTERNAL GRIDS/SINT${internalGridPatternCodes[pattern]}${sGridColorCodes[color]}.png`
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
const sStandardFlatRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '4 Lite': { Beige: ['5/8"'], Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: ['7/8"'], White: ['5/8"', '7/8"'] },
  '9 Lite': { Beige: bothFlatWidths, Bronze: ['5/8"'], Champagne: ['5/8"'], Tan: bothFlatWidths, White: ['7/8"'] },
}
const sLowEFlatRules: Partial<Record<GridPattern, GridWidthRules>> = {
  '2 Lite': { Tan: ['7/8"'] },
  '4 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: ['7/8"'], White: bothFlatWidths },
  '9 Lite': { Beige: bothFlatWidths, Black: bothFlatWidths, Bronze: ['5/8"'], 'Bronze/White': bothFlatWidths, Champagne: ['5/8"'], Tan: bothFlatWidths, White: ['7/8"'] },
}
const sStandardContouredRules: Partial<Record<GridPattern, GridWidthRules>> = { '9 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } }
const sLowEContouredRules: Partial<Record<GridPattern, GridWidthRules>> = { '4 Lite': { White: ['11/16"'] }, '9 Lite': { Champagne: ['11/16"'], White: ['11/16"'] } }
const sStandardPrairieRules: GridWidthRules = { White: ['5/8"', '7/8"', '11/16"'] }
const sLowEPrairieRules: GridWidthRules = { Beige: [], Champagne: ['5/8"', '11/16"'], Tan: ['7/8"'], White: ['5/8"', '7/8"', '11/16"'] }
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
const HERO_FINISH_SPECS: Record<HeroPreset['finishKey'], { baseId: string; name: string; colorId?: string }> = {
  'black-paint': { baseId: 'paint-black', name: 'Black Paint' },
  'white-paint': { baseId: 'paint-white', name: 'White Paint' },
  'natural-stain': { baseId: 'stain-natural-gold', name: 'Natural Stain' },
  'harvest-stain': { baseId: 'stain-harvest-wheat', name: 'Harvest Stain' },
  'nutmeg-stain': { baseId: 'stain-nutmeg', name: 'Nutmeg Stain' },
  'toasted-caramel-stain': { baseId: 'stain-toasted-caramel', name: 'Toasted Caramel Stain' },
  'brown-stain': { baseId: 'stain-cinnamon', colorId: 'paint-brown', name: 'Brown Stain' },
  'black-cherry-stain': { baseId: 'stain-black-cherry', name: 'Black Cherry Stain' },
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
clearGlassIds.add(S_GRID_GLASS_ID)
clearGlassIds.add('s-clear-no-grids')
const legacyFullLiteGlassIds = new Set(['clear', 'f-f10l', 'f-f15wh', 'f-prairie-internal', 'f-ten-lite', 'f-clear-f10', 'f-clear-f10l', 'f-clear-nonstock', 'f-clear-f15', 'f-clear-f15int', 'f-clear-f15intl', 'f-clear-fpraint', 'f-clear-ften', 'f-blinds-15', 'blinds-espresso', 'blinds-gray', 'blinds-sand', 'blinds-silver', 'blinds-tan', 'blinds-white'])
const legacyF48ClearGlassIds = new Set(['clear-low-e', 'f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock'])
const legacySHalfLiteClearGlassIds = new Set(['clear', 'clear-low-e', 's-clear-s5', 's-clear-s5l', 's-clear-s9', 's-clear-s9int', 's-clear-s9intl', 's-clear-sv6', 's-clear-nonstock'])
const f48GlassOptionIds = new Set(['f48-clear-f1248', 'f48-clear-f1248l', 'f48-clear-f648l', 'f48-clear-nonstock', 'f48-blinds-white', 'f48-clic-nogrid', 'f48-clic-ext-12l', 'ashbury', 'berkley', 'briselle', 'cadence', 'calandra', 'courtyard', 'crosswalk', 'cyndi', 'dorian-nickel', 'dorian-patina', 'edgewood', 'elegant-black-white', 'elegant-nickel', 'elegant-patina', 'empire', 'fragrance', 'garrison', 'grace-nickel', 'grace-patina', 'heirlooms-brass', 'heirlooms-nickel', 'high-point', 'jameston', 'majestic-nickel', 'majestic-patina', 'margate', 'metro', 'mistify', 'mohave', 'monterey-nickel', 'monterey-patina', 'neo', 'nouveau-nickel', 'nouveau-patina', 'oak-park', 'paris', 'pembrook', 'prestige', 'rill', 'riverwood', 'sterling', 'topaz', 'vilano', 'vincraft', 'waterside', 'baroque', 'blanca', 'chinchilla', 'cumulus', 'double-water', 'micro-granite', 'rain', 'streamed', 'vapor', 'wide-reed'])
f48GlassOptionIds.add(F48_GRID_GLASS_ID)
f48GlassOptionIds.add('f48-clear-no-grids')
const privacyGlassIds = approvedPrivacyGlassIds

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
  const [screen, setScreen] = useState<'home' | 'builder' | 'visualizer'>('home')
  const [step, setStep] = useState(0)
  const [showEntrywayGuidance, setShowEntrywayGuidance] = useState(false)
  const [hasShownEntrywayGuidance, setHasShownEntrywayGuidance] = useState(false)
  const [styleId, setStyleId] = useState('')
  const [doorLineId, setDoorLineId] = useState('')
  const [grainId, setGrainId] = useState('')
  const [sidelites, setSidelites] = useState<SideliteConfiguration | ''>('')
  const [sideliteStyleId, setSideliteStyleId] = useState('')
  const [sideliteGlassCategory, setSideliteGlassCategory] = useState<SideliteGlassCategory | ''>('')
  const [sideliteGlassId, setSideliteGlassId] = useState('')
  const [sideliteGlassGroupKey, setSideliteGlassGroupKey] = useState('')
  const [sideliteGlassVariantConfirmed, setSideliteGlassVariantConfirmed] = useState(false)
  const [sideliteGridLocation, setSideliteGridLocation] = useState<'' | 'internal' | 'sdl'>('')
  const [sideliteGridStyle, setSideliteGridStyle] = useState<GridStyle | ''>('')
  const [sideliteGridPattern, setSideliteGridPattern] = useState<GridPattern | ''>('')
  const [sideliteGridColor, setSideliteGridColor] = useState<GridColor | ''>('')
  const [sideliteGridWidth, setSideliteGridWidth] = useState<GridWidth | ''>('')
  const [selectedFinishType, setSelectedFinishType] = useState<'' | 'paint' | 'stain'>('')
  const [selectedPaint, setSelectedPaint] = useState('')
  const [selectedStain, setSelectedStain] = useState('')
  const [jambType, setJambType] = useState<'' | 'timber' | 'clad'>('')
  const [jambFinishType, setJambFinishType] = useState<'' | 'paint' | 'stain' | 'clad'>('')
  const [jambFinishColor, setJambFinishColor] = useState('')
  const [jambFinishOverridden, setJambFinishOverridden] = useState(false)
  const [selectedGlassCategory, setSelectedGlassCategory] = useState<GlassCategory | ''>('')
  const [glassId, setGlassId] = useState('')
  const [selectedGlassGroupKey, setSelectedGlassGroupKey] = useState('')
  const [glassVariantConfirmed, setGlassVariantConfirmed] = useState(false)
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
  const [testMode, setTestMode] = useState(true)
  const [homeDemoIndex, setHomeDemoIndex] = useState(0)
  const [heroImageError, setHeroImageError] = useState('')
  const [builderPreviewView, setBuilderPreviewView] = useState<'Exterior' | 'Interior' | 'Both'>('Exterior')
  const builderPanelRef = useRef<HTMLElement | null>(null)
  const builderOptionsRef = useRef<HTMLDivElement | null>(null)
  const entrywayDialogRef = useRef<HTMLDivElement | null>(null)
  const entrywayStartButtonRef = useRef<HTMLButtonElement | null>(null)

  const closeEntrywayGuidance = () => {
    setShowEntrywayGuidance(false)
    requestAnimationFrame(() => builderOptionsRef.current?.querySelector<HTMLButtonElement>('.option-card')?.focus())
  }

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
  const cladFinishes = finishes.filter((item) => item.finishType === 'paint' && cladColors.some((color) => `paint-${color.id}` === item.id))
  const jambFinishOptions = jambType === 'clad'
    ? cladFinishes
    : availableFinishes.filter((item) => item.finishType === (jambFinishType || selectedFinishType))
  const jambFinish = finishes.find((item) => item.id === jambFinishColor) ?? null
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
    ? glassOptions.filter((option) => selectedStyleCodes.some((code) => Boolean(option.overlaysByDoorStyle[code])) && !(selectedStyleCodes.includes('F') && legacyFullLiteGlassIds.has(option.id)) && !(selectedStyleCodes.includes('S') && legacySHalfLiteClearGlassIds.has(option.id)) && !((selectedStyleCodes.includes('F48') || selectedStyleCodes.includes('F482')) && legacyF48ClearGlassIds.has(option.id)) && (!(selectedStyleCodes.includes('F48') || selectedStyleCodes.includes('F482')) || f48GlassOptionIds.has(option.id)))
    : []
  const supportsGlass = Boolean(compatibilitySupportsGlass && availableGlass.length > 0)
  const isCherrySignatureSidelite = selectedDoorLine?.id === signatureSeriesId && selectedGrain === 'Cherry'
  const isFirSignatureSidelite = selectedDoorLine?.id === signatureSeriesId && selectedGrain === 'Fir'
  const isMahoganySignatureSidelite = selectedDoorLine?.id === signatureSeriesId && selectedGrain === 'Mahogany'
  const isOakSignatureSidelite = selectedDoorLine?.id === signatureSeriesId && selectedGrain === 'Oak'
  const supportsSideliteLine = selectedDoorLine?.id === '20-gauge-smooth-steel' || selectedDoorLine?.id === '22-gauge-steel' || selectedDoorLine?.id === 'brushed-smooth-fiberglass' || selectedDoorLine?.id === 'textured-fiberglass' || isCherrySignatureSidelite || isFirSignatureSidelite || isMahoganySignatureSidelite || isOakSignatureSidelite
  const hasSideliteGlass = supportsSideliteLine && Boolean(sidelites && sidelites !== 'none' && sideliteStyleId)
  const steps = supportsGlass || hasSideliteGlass ? glassSteps : noGlassSteps
  const selectedGlass = supportsGlass ? glass : null
  const clearOnlyGlass = !supportsGlass && compatibilitySupportsGlass
    ? availableGlass.find((option) => option.id === 'clear') ?? null
    : null
  const configuredGlass = supportsGlass ? selectedGlass : clearOnlyGlass
  const selectedGridLocation = gridLocations.find((location) => location.id === gridPathId)
  const usesFullLiteGridFlow = selectedStyleCodes.includes('F') && glassId === FULL_LITE_GRID_GLASS_ID
  const usesF48GridFlow = (selectedStyleCodes.includes('F48') || selectedStyleCodes.includes('F482')) && glassId === F48_GRID_GLASS_ID
  const usesSGridFlow = selectedStyleCodes.includes('S') && glassId === S_GRID_GLASS_ID
  const usesGridFlow = usesFullLiteGridFlow || usesF48GridFlow || usesSGridFlow
  const availableGridLocations = gridLocations.filter((item) => !usesF48GridFlow || item.id !== 'external')
  const usesMappedSidelites = supportsSideliteLine && Boolean(sidelites && sidelites !== 'none')
  const visibleSideliteStyleOptions = isFirSignatureSidelite
    ? sideliteStyleOptions.filter((option) => option.id === 'cr14sl' || option.id === 'fsl')
    : isOakSignatureSidelite
      ? sideliteStyleOptions.filter((option) => option.id === 'f48sl' || option.id === 'ssl')
    : selectedDoorLine?.id === 'brushed-smooth-fiberglass' || isCherrySignatureSidelite || isMahoganySignatureSidelite
    ? sideliteStyleOptions.filter((option) => option.id === 'fsl' || option.id === 'f48sl' || option.id === 'ssl')
    : sideliteStyleOptions.filter((option) => option.id !== 'cr14sl')
  const selectedSideliteStyle = sideliteStyleOptions.find((option) => option.id === sideliteStyleId)
  const selectedSidelitePreview = selectedSideliteStyle && supportsSideliteLine
    ? isFirSignatureSidelite
      ? `/assets/hgi-assets/Sidelites/Signature/Fir/${selectedSideliteStyle.id.toUpperCase()}.png`
      : isMahoganySignatureSidelite
        ? `/assets/hgi-assets/Sidelites/Signature/Mahogany/${selectedSideliteStyle.id.toUpperCase()}.png`
      : isOakSignatureSidelite
        ? `/assets/hgi-assets/Sidelites/Signature/Oak/${selectedSideliteStyle.id.toUpperCase()}.png`
      : isCherrySignatureSidelite
      ? `/assets/hgi-assets/Sidelites/Signature/Cherry/${selectedSideliteStyle.id.toUpperCase()}.png`
      : selectedDoorLine?.id === '22-gauge-steel' && selectedSideliteStyle.id === 'ssl'
        ? '/assets/hgi-assets/Sidelites/Signature/Mahogany/SSL.png'
      : `/assets/hgi-assets/Sidelites/${selectedDoorLine?.id === '20-gauge-smooth-steel' || selectedDoorLine?.id === 'brushed-smooth-fiberglass' ? '20 Gauge' : '22 Gauge'}/${selectedSideliteStyle.id.toUpperCase()}.png`
    : undefined
  const selectedSideliteCatalog = selectedSideliteStyle ? sideliteGlassCatalogs[selectedSideliteStyle.id] : null
  const usesFslGlassFlow = Boolean(selectedSideliteCatalog)
  const visibleFslGlass = sideliteGlassCategory ? selectedSideliteCatalog?.options.filter((option) => option.category === sideliteGlassCategory) ?? [] : []
  const sideliteGlassOptionGroups = groupSideliteGlassOptions(visibleFslGlass)
  const selectedSideliteGlassGroup = sideliteGlassOptionGroups.find((group) => group.key === sideliteGlassGroupKey)
  const selectedFslGlass = selectedSideliteCatalog?.options.find((option) => option.id === sideliteGlassId)
  const usesFslGridFlow = usesFslGlassFlow && sideliteGlassId === 'clear-grids'
  const fslGridStyles = (['Arts & Crafts', 'Contoured', 'Flat', 'Prairie'] as GridStyle[]).filter((styleName) => selectedSideliteCatalog?.standardRules[styleName] || selectedSideliteCatalog?.lowERules[styleName])
  const fslStandardRules = sideliteGridStyle ? selectedSideliteCatalog?.standardRules[sideliteGridStyle] ?? {} : {}
  const fslLowERules = sideliteGridStyle ? selectedSideliteCatalog?.lowERules[sideliteGridStyle] ?? {} : {}
  const fslPatterns = sideliteGridLocation === 'sdl'
    ? selectedSideliteCatalog?.sdlPatterns ?? []
    : ([...new Set([...Object.keys(fslStandardRules), ...Object.keys(fslLowERules)])] as GridPattern[])
  const effectiveSidelitePattern = sideliteGridStyle === 'Prairie' ? selectedSideliteCatalog?.prairiePattern : sideliteGridPattern
  const fslColors = effectiveSidelitePattern
    ? ([...new Set([...Object.keys(fslStandardRules[effectiveSidelitePattern] ?? {}), ...Object.keys(fslLowERules[effectiveSidelitePattern] ?? {})])] as GridColor[])
    : []
  const fslWidths = effectiveSidelitePattern && sideliteGridColor
    ? ([...new Set([...(fslStandardRules[effectiveSidelitePattern]?.[sideliteGridColor] ?? []), ...(fslLowERules[effectiveSidelitePattern]?.[sideliteGridColor] ?? [])])] as GridWidth[])
    : []
  const fslMatches = (rules: typeof fslStandardRules) => {
    if (!effectiveSidelitePattern || !sideliteGridColor) return false
    const widths = rules[effectiveSidelitePattern]?.[sideliteGridColor]
    return widths !== undefined && (widths.length === 0 ? !sideliteGridWidth : Boolean(sideliteGridWidth && widths.includes(sideliteGridWidth)))
  }
  const fslCoating = sideliteGridLocation === 'sdl' ? 'Standard / No Low-E or Low-E' : fslMatches(fslLowERules) && !fslMatches(fslStandardRules) ? 'Low-E' : fslMatches(fslLowERules) ? 'Standard / No Low-E or Low-E' : 'Standard / No Low-E'
  const sideliteGlassPreview = selectedFslGlass?.asset ?? (usesFslGridFlow && effectiveSidelitePattern && selectedSideliteCatalog ? selectedSideliteCatalog.gridAsset(effectiveSidelitePattern, sideliteGridLocation === 'sdl' ? 'White' : sideliteGridColor || 'White') : undefined)
  const sideliteGlassConfiguration: SideliteGlassConfiguration | null = selectedFslGlass ? {
    glass: selectedFslGlass.name,
    glassCategory: sideliteGlassCategory === 'decorative' ? 'Decorative Glass' : sideliteGlassCategory === 'privacy' ? 'Privacy Glass' : sideliteGlassCategory === 'clic' ? 'CLiC Glass' : sideliteGlassCategory === 'blinds' ? 'Mini Blinds' : 'Clear Glass',
    ...(selectedFslGlass.asset ? { glassAsset: selectedFslGlass.asset } : {}),
    ...(usesFslGridFlow ? {
      glassCoating: fslCoating,
      gridLocation: sideliteGridLocation === 'sdl' ? 'SDL' as const : 'Internal' as const,
      ...(sideliteGridStyle ? { gridStyle: sideliteGridStyle } : {}),
      ...(sideliteGridPattern ? { gridPattern: sideliteGridPattern } : {}),
      ...(sideliteGridColor ? { gridColor: sideliteGridColor } : {}),
      ...(sideliteGridWidth ? { gridWidth: sideliteGridWidth } : {}),
    } : {}),
  } : null
  const selectedGridLocationValue = gridPathId === 'sdl' ? 'SDL' : gridPathId === 'internal' ? 'Internal' : 'External'
  const standardWidthsForSelection = usesSGridFlow
    ? !gridColor ? undefined : gridStyle === 'Prairie' ? sStandardPrairieRules[gridColor] : gridPattern ? (gridStyle === 'Contoured' ? sStandardContouredRules : sStandardFlatRules)[gridPattern]?.[gridColor] : undefined
    : usesF48GridFlow
    ? !gridColor ? undefined : gridStyle === 'Prairie' ? f48StandardPrairieRules[gridColor] : gridPattern ? (gridStyle === 'Contoured' ? f48StandardContouredRules : f48StandardFlatRules)[gridPattern]?.[gridColor] : undefined
    : gridRuleWidths(gridStyle, gridPattern, gridColor, false)
  const lowEWidthsForSelection = usesSGridFlow
    ? !gridColor ? undefined : gridStyle === 'Prairie' ? sLowEPrairieRules[gridColor] : gridPattern ? (gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? sLowEContouredRules : sLowEFlatRules)[gridPattern]?.[gridColor] : undefined
    : usesF48GridFlow
    ? !gridColor ? undefined : gridStyle === 'Prairie' ? f48LowEPrairieRules[gridColor] : gridPattern ? (gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? f48LowEContouredRules : f48LowEFlatRules)[gridPattern]?.[gridColor] : undefined
    : gridRuleWidths(gridStyle, gridPattern, gridColor, true)
  const matchesSelectedWidth = (widths: GridWidth[] | undefined) => widths !== undefined && (widths.length === 0 ? !gridWidth : Boolean(gridWidth && widths.includes(gridWidth)))
  const matchesStandard = matchesSelectedWidth(standardWidthsForSelection)
  const matchesLowE = matchesSelectedWidth(lowEWidthsForSelection)
  const selectedGlassCoating: GlassCoating = gridPathId === 'sdl'
    ? 'Low-E'
    : gridPathId === 'external'
      ? usesSGridFlow ? gridPattern === '4 Lite' ? 'Standard / No Low-E or Low-E' : 'Low-E' : gridPattern === '8 Lite' ? 'Standard / No Low-E, Low-E or Low-E Plus' : 'Low-E or Low-E Plus'
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
  const standardPatternRules = usesSGridFlow
    ? gridStyle === 'Contoured' ? sStandardContouredRules : gridStyle === 'Flat' ? sStandardFlatRules : {}
    : usesF48GridFlow
    ? gridStyle === 'Contoured' ? f48StandardContouredRules : gridStyle === 'Flat' ? f48StandardFlatRules : {}
    : gridStyle === 'Contoured' ? { '15 Lite': { Champagne: ['11/16"' as GridWidth] } } : gridStyle === 'Flat' ? flatGridRules : {}
  const lowEPatternRules = usesSGridFlow
    ? gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? sLowEContouredRules : gridStyle === 'Flat' ? sLowEFlatRules : {}
    : usesF48GridFlow
    ? gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? f48LowEContouredRules : gridStyle === 'Flat' ? f48LowEFlatRules : {}
    : gridStyle === 'Arts & Crafts' ? lowEArtsRules : gridStyle === 'Contoured' ? lowEContouredRules : gridStyle === 'Flat' ? lowEFlatGridRules : {}
  const compatibleGridPatterns = gridPathId === 'external'
    ? allGridPatterns.filter((item) => (usesSGridFlow ? ['4 Lite', '9 Lite'] : ['8 Lite', '10 Lite', '15 Lite']).includes(item.id))
    : gridPathId === 'sdl'
      ? allGridPatterns.filter((item) => (usesSGridFlow ? ['9 Lite'] : usesF48GridFlow ? ['4 Lite'] : ['6 Lite', '8 Lite', '15 Lite']).includes(item.id))
      : allGridPatterns.filter((item) => Object.prototype.hasOwnProperty.call(standardPatternRules, item.id) || Object.prototype.hasOwnProperty.call(lowEPatternRules, item.id))
  const compatibleGridColors: GridColor[] = gridStyle === 'Prairie'
    ? [...new Set([...Object.keys(usesSGridFlow ? sStandardPrairieRules : usesF48GridFlow ? f48StandardPrairieRules : prairieGridRules), ...Object.keys(usesSGridFlow ? sLowEPrairieRules : usesF48GridFlow ? f48LowEPrairieRules : lowEPrairieGridRules)])] as GridColor[]
    : gridPattern
      ? [...new Set([...Object.keys(standardPatternRules[gridPattern] ?? {}), ...Object.keys(lowEPatternRules[gridPattern] ?? {})])] as GridColor[]
      : []
  const compatibleGridWidths = gridColor
    ? gridStyle === 'Prairie'
      ? [...new Set([...((usesSGridFlow ? sStandardPrairieRules : usesF48GridFlow ? f48StandardPrairieRules : prairieGridRules)[gridColor] ?? []), ...((usesSGridFlow ? sLowEPrairieRules : usesF48GridFlow ? f48LowEPrairieRules : lowEPrairieGridRules)[gridColor] ?? [])])]
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
      ? usesSGridFlow ? sInternalGridAsset(gridPattern, previewGridColor) : usesF48GridFlow ? f48InternalGridAsset(gridPattern, previewGridColor) : contouredGridAssets[gridPattern]?.[previewGridColor] ?? null
    : gridStyle === 'Prairie' && previewGridColor
      ? prairieGridAssets[previewGridColor] ?? null
      : gridPattern && previewGridColor && internalGridPatternCodes[gridPattern] && internalGridColorCodes[previewGridColor]
        ? usesSGridFlow ? sInternalGridAsset(gridPattern, previewGridColor) : usesF48GridFlow ? f48InternalGridAsset(gridPattern, previewGridColor) : internalGridAsset(gridPattern, previewGridColor)
        : null
  const externalPreviewOverlay = gridPattern && internalGridPatternCodes[gridPattern]
    ? usesSGridFlow
      ? sInternalGridAsset(gridPattern, 'White')
      : usesF48GridFlow
      ? f48InternalGridAsset(gridPattern, 'White')
      : `/assets/hgi-assets/Glass/F/INTERNAL GRIDS/FINT${internalGridPatternCodes[gridPattern]}WH.png`
    : null
  const gridPreviewDoorCode = usesSGridFlow ? 'S' : usesF48GridFlow ? selectedStyleCodes.includes('F482') ? 'F482' : 'F48' : 'F'
  const gridClearGlass = glassOptions.find((option) => option.id === (usesSGridFlow ? 's-clear-no-grids' : usesF48GridFlow ? 'f48-clear-no-grids' : 'f-clear-no-grids'))
  const gridClearOverlay = gridClearGlass?.overlaysByDoorStyle[gridPreviewDoorCode]
  const selectedGridPreview = glass && selectedGridLocationValue !== 'Internal' && externalPreviewOverlay
    ? { ...glass, overlaysByDoorStyle: { ...glass.overlaysByDoorStyle, [gridPreviewDoorCode]: externalPreviewOverlay } }
    : glass && selectedGridOverlay
    ? { ...glass, overlaysByDoorStyle: { ...glass.overlaysByDoorStyle, [gridPreviewDoorCode]: selectedGridOverlay } }
    : glass && gridClearOverlay
      ? { ...glass, overlaysByDoorStyle: { ...glass.overlaysByDoorStyle, [gridPreviewDoorCode]: gridClearOverlay } }
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
  const selectedGlassGroup = glassOptionGroups.find((group) => group.key === selectedGlassGroupKey)
  const availableGlassIds = availableGlass.map((item) => item.id).join('|')
  const pages: BuilderPage[] = [
    'door-style',
    'door-line',
    ...(needsGrainStep ? ['door-grain' as const] : []),
    ...(supportsSideliteLine ? ['sidelites' as const] : []),
    ...(usesMappedSidelites ? ['sidelite-style' as const] : []),
    'door-finish',
    'jamb-type',
    'jamb-finish',
    ...(supportsGlass ? ['glass-type' as const, 'glass' as const] : []),
    ...(selectedGlassGroup && selectedGlassGroup.options.length > 1 ? ['glass-variant' as const] : []),
    ...(usesGridFlow ? [
      'grid-location' as const,
      ...(selectedGridLocationValue === 'Internal' ? ['grid-style' as const] : []),
      ...(gridPathId && (selectedGridLocationValue !== 'Internal' || (gridStyle && gridStyle !== 'Prairie')) ? ['grid-pattern' as const] : []),
      ...(selectedGridLocationValue === 'Internal' && (gridStyle === 'Prairie' || Boolean(gridPattern)) && compatibleGridColors.length ? ['grid-color' as const] : []),
      ...(selectedGridLocationValue === 'Internal' && gridColor && compatibleGridWidths.length ? ['grid-width' as const] : []),
    ] : []),
    ...(usesFslGlassFlow ? [
      'sidelite-glass-type' as const,
      'sidelite-glass' as const,
      ...(selectedSideliteGlassGroup && selectedSideliteGlassGroup.options.length > 1 ? ['sidelite-glass-variant' as const] : []),
      ...(usesFslGridFlow ? [
        'sidelite-grid-location' as const,
        ...(sideliteGridLocation === 'internal' ? ['sidelite-grid-style' as const] : []),
        ...(sideliteGridLocation && (sideliteGridLocation === 'sdl' || (sideliteGridStyle && sideliteGridStyle !== 'Prairie')) ? ['sidelite-grid-pattern' as const] : []),
        ...(sideliteGridLocation === 'internal' && (sideliteGridStyle === 'Prairie' || Boolean(sideliteGridPattern)) ? ['sidelite-grid-color' as const] : []),
        ...(sideliteGridLocation === 'internal' && sideliteGridColor && fslWidths.length ? ['sidelite-grid-width' as const] : []),
      ] : []),
    ] : []),
    'hardware',
    'door-swing',
    'review',
  ]
  const currentPage = pages[step] ?? pages[pages.length - 1]
  const glassSelectionTarget = mainDoorGlassPages.has(currentPage) ? 'main-door' : sideliteGlassPages.has(currentPage) ? 'sidelite' : null
  const currentStep = currentPage === 'door-style' || currentPage === 'door-line' || currentPage === 'door-grain' || currentPage === 'sidelites' || currentPage === 'sidelite-style'
    ? 'Door Style'
    : currentPage === 'door-finish' || currentPage === 'jamb-type' || currentPage === 'jamb-finish'
      ? 'Finish'
      : currentPage.startsWith('glass') || currentPage.startsWith('grid-') || currentPage.startsWith('sidelite-glass') || currentPage.startsWith('sidelite-grid')
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
  // SDL bars are supplied as white alpha artwork, so both the main door and
  // sidelite previews tint those bars with the resolved slab finish.
  const mainDoorSdlMatchesFinish = usesGridFlow && gridPathId === 'sdl'
  const sideliteSdlMatchesFinish = usesFslGridFlow && sideliteGridLocation === 'sdl'
  const previewModes = ['Exterior', 'Interior', 'Both'] as const
  const configuredDoorPreview: DoorPreviewProps = {
    style,
    finish: previewConfig.finish,
    glass: previewConfig.glass,
    hardware: previewConfig.hardware,
    grain: selectedGrain,
    product,
    tintColor: previewConfig.tintColor,
    doorSwing: previewConfig.doorSwing,
    applyFinish: previewConfig.applyFinish,
    gridMatchesFinish: mainDoorSdlMatchesFinish,
    showViewToggle: false,
    sidelites: sidelites || 'none',
    sideliteAssetSrc: selectedSidelitePreview,
    sideliteMaskSrc: selectedSideliteStyle?.mask,
    sideliteGlassSrc: sideliteGlassPreview,
    sideliteClearGlassBase: usesFslGridFlow || selectedFslGlass?.id === 'clear-no-grids',
    sideliteGridMatchesFinish: sideliteSdlMatchesFinish,
    jambFinish,
    jambType: jambType || 'timber',
  }
  const configuredDoorKey = JSON.stringify({
    style: style.id,
    finish: previewConfig.finish.id,
    tint: previewConfig.tintColor,
    glass: previewConfig.glass?.id,
    hardware: previewConfig.hardware.id,
    grain: selectedGrain,
    product: product?.styleCodes.join('|'),
    swing: previewConfig.doorSwing?.id,
    sidelites,
    sideliteStyle: selectedSideliteStyle?.id,
    sideliteGlass: selectedFslGlass?.id,
    sideliteGlassPreview,
    jambFinish: jambFinish?.id,
    jambType,
  })
  const renderConfiguredDoorPreview = (previewView: HardwareView, sharedComparisonCanvas = false) => <DoorPreview {...configuredDoorPreview} view={previewView} sharedComparisonCanvas={sharedComparisonCanvas} />
  const renderConfiguredPreviewMode = () => builderPreviewView === 'Both'
    ? <div className="preview-comparison" aria-label="Exterior and interior door previews">
        {(['Exterior', 'Interior'] as const).map((previewView) => <div className="preview-comparison-item" key={previewView}>
          <span className="preview-comparison-label">{previewView}</span>
          {renderConfiguredDoorPreview(previewView, true)}
        </div>)}
      </div>
    : renderConfiguredDoorPreview(builderPreviewView)
  const demoStyleByCode = (code: string) => doorStyles.find((item) => item.code === code || item.variants.some((variant) => variant.code === code)) ?? doorStyles[0]
  const buildHomeDemo = (preset: HeroPreset, presetIndex: number) => {
    const { styleCode } = preset
    const demoStyle = demoStyleByCode(styleCode)
    const compatibleDoorLines = doorLineChoicesForStyle(demoStyle)
    const finishSpec = HERO_FINISH_SPECS[preset.finishKey]
    const baseHeroFinish = finishes.find((finishOption) => finishOption.id === finishSpec.baseId) ?? finishes[0]
    const heroColorFinish = finishes.find((finishOption) => finishOption.id === finishSpec.colorId)
    const requestedHeroFinish = {
      ...baseHeroFinish,
      id: `hero-${preset.finishKey}`,
      name: finishSpec.name,
      color: heroColorFinish?.color ?? baseHeroFinish.color,
      accent: heroColorFinish?.accent ?? baseHeroFinish.accent,
    }
    const finishCandidates = compatibleDoorLines.flatMap((doorLine) => {
      const grain = autoGrainForDoorLine(demoStyle, doorLine.id)
      return finishesForStyle(demoStyle, finishes, doorLine.id, grain).map((finishOption) => ({ doorLine, grain, finishOption }))
    })
    const preferredFinishCandidates = finishCandidates.filter(({ finishOption }) => finishOption.finishType === requestedHeroFinish.finishType)
    const selectedCombination = preferredFinishCandidates[presetIndex % Math.max(preferredFinishCandidates.length, 1)]
      ?? finishCandidates[presetIndex % Math.max(finishCandidates.length, 1)]
    const demoDoorLine = selectedCombination?.doorLine ?? compatibleDoorLines[0]
    const demoGrain = demoDoorLine ? autoGrainForDoorLine(demoStyle, demoDoorLine.id) : null
    const demoFinish = requestedHeroFinish
    const demoProduct = resolveDoorProduct(demoStyle, demoFinish, demoGrain ?? undefined, demoDoorLine?.id)
    const isGlassCapable = demoProduct.styleCodes.some((code) => glassDoorCodes.has(code))
    const preferredGlass = preset.glassId
    const compatibleGlass = glassOptions.filter((option) =>
      demoProduct.styleCodes.some((code) => Boolean(option.overlaysByDoorStyle[code]))
      && !(demoProduct.styleCodes.includes('F') && legacyFullLiteGlassIds.has(option.id))
      && !(demoProduct.styleCodes.includes('S') && legacySHalfLiteClearGlassIds.has(option.id))
      && !((demoProduct.styleCodes.includes('F48') || demoProduct.styleCodes.includes('F482')) && legacyF48ClearGlassIds.has(option.id))
      && (!(demoProduct.styleCodes.includes('F48') || demoProduct.styleCodes.includes('F482')) || f48GlassOptionIds.has(option.id)),
    )
    const requestedGlass = compatibleGlass.find((option) => option.id === preferredGlass)
    const fallbackGlass = compatibleGlass.find((option) => glassCategory(option) === 'decorative')
      ?? compatibleGlass.find((option) => option.id === 'clear')
      ?? compatibleGlass.find((option) => option.name.toLowerCase().includes('clear'))
      ?? compatibleGlass[0]
    const isStrictNoGlassStyle = demoProduct.styleCodes.every((code) => !glassDoorCodes.has(code))
    const demoGlass = isGlassCapable && !isStrictNoGlassStyle
      ? requestedGlass
        ? {
            ...requestedGlass,
            name: preset.glassName ?? requestedGlass.name,
          }
        : fallbackGlass ?? null
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
      gridMatchesFinish: false,
    }
  }
  const homeDemoConfigurations = HERO_PRESETS.map((preset, index) => buildHomeDemo(preset, index))
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

    switch (currentPage) {
      case 'door-style':
        if (!selectedStyle && doorStyles[0]) setStyleId(doorStyles[0].id)
        break
      case 'door-line':
        if (!selectedDoorLine && availableDoorLines[0]) setDoorLineId(availableDoorLines[0].id)
        break
      case 'door-grain':
        if (!selectedGrain && signatureGrainOptions[0]) setGrainId(signatureGrainOptions[0].id)
        break
      case 'sidelites':
        if (!sidelites && sideliteOptions[0]) setSidelites(sideliteOptions[0].id)
        break
      case 'sidelite-style':
        if (!selectedSideliteStyle && visibleSideliteStyleOptions[0]) setSideliteStyleId(visibleSideliteStyleOptions[0].id)
        break
      case 'door-finish': {
        const firstFinish = visibleFinishes[0]
        if (!visibleSelectedFinish && firstFinish) {
          if (firstFinish.finishType === 'paint') setSelectedPaint(firstFinish.id)
          else setSelectedStain(firstFinish.id)
        }
        break
      }
      case 'jamb-type':
        if (!jambType) setJambType('timber')
        break
      case 'jamb-finish':
        if (!jambFinish && jambFinishOptions[0]) setJambFinishColor(jambFinishOptions[0].id)
        break
      case 'glass-type':
        if (!selectedGlassCategory && availableGlassCategories[0]) setSelectedGlassCategory(availableGlassCategories[0].id)
        break
      case 'glass': {
        const firstGroup = glassOptionGroups[0]
        if (!selectedGlassGroup && firstGroup) {
          setSelectedGlassGroupKey(firstGroup.key)
          setGlassId(firstGroup.options[0]?.id ?? '')
          setGlassVariantConfirmed(firstGroup.options.length === 1)
        }
        break
      }
      case 'glass-variant':
        if (!glassVariantConfirmed && selectedGlassGroup?.options[0]) {
          setGlassId(selectedGlassGroup.options[0].id)
          setGlassVariantConfirmed(true)
        }
        break
      case 'grid-location':
        if (!gridPathId && availableGridLocations[0]) setGridPathId(availableGridLocations[0].id)
        break
      case 'grid-style':
        if (!gridStyle && lowEGridStyles[0]) setGridStyle(lowEGridStyles[0].id)
        break
      case 'grid-pattern':
        if (!gridPattern && compatibleGridPatterns[0]) setGridPattern(compatibleGridPatterns[0].id)
        break
      case 'grid-color':
        if (!gridColor && compatibleGridColors[0]) setGridColor(compatibleGridColors[0])
        break
      case 'grid-width':
        if (!gridWidth && compatibleGridWidths[0]) setGridWidth(compatibleGridWidths[0])
        break
      case 'sidelite-glass-type':
        if (!sideliteGlassCategory && selectedSideliteCatalog?.categories[0]) setSideliteGlassCategory(selectedSideliteCatalog.categories[0].id)
        break
      case 'sidelite-glass': {
        const firstGroup = sideliteGlassOptionGroups[0]
        if (!selectedSideliteGlassGroup && firstGroup) {
          setSideliteGlassGroupKey(firstGroup.key)
          setSideliteGlassId(firstGroup.options[0]?.id ?? '')
          setSideliteGlassVariantConfirmed(firstGroup.options.length === 1)
        }
        break
      }
      case 'sidelite-glass-variant':
        if (!sideliteGlassVariantConfirmed && selectedSideliteGlassGroup?.options[0]) {
          setSideliteGlassId(selectedSideliteGlassGroup.options[0].id)
          setSideliteGlassVariantConfirmed(true)
        }
        break
      case 'sidelite-grid-location':
        if (!sideliteGridLocation) setSideliteGridLocation('internal')
        break
      case 'sidelite-grid-style':
        if (!sideliteGridStyle && fslGridStyles[0]) setSideliteGridStyle(fslGridStyles[0])
        break
      case 'sidelite-grid-pattern':
        if (!sideliteGridPattern && fslPatterns[0]) setSideliteGridPattern(fslPatterns[0])
        break
      case 'sidelite-grid-color':
        if (!sideliteGridColor && fslColors[0]) setSideliteGridColor(fslColors[0])
        break
      case 'sidelite-grid-width':
        if (!sideliteGridWidth && fslWidths[0]) setSideliteGridWidth(fslWidths[0])
        break
      case 'hardware':
        if (!selectedHardware && hardwareStyleGroups[0]?.[0]) setHardwareId(hardwareStyleGroups[0][0].id)
        break
      case 'door-swing':
        if (!selectedDoorSwing && doorSwingOptions[0]) setDoorSwingId(doorSwingOptions[0].id)
        break
    }
  }, [screen, currentPage, selectedStyle, selectedDoorLine, selectedGrain, sidelites, selectedSideliteStyle, visibleSideliteStyleOptions, visibleSelectedFinish, visibleFinishes, jambType, jambFinish, jambFinishOptions, selectedGlassCategory, availableGlassCategories, selectedGlassGroup, glassOptionGroups, glassVariantConfirmed, selectedGlassGroupKey, gridPathId, availableGridLocations, gridStyle, gridPattern, compatibleGridPatterns, gridColor, compatibleGridColors, gridWidth, compatibleGridWidths, sideliteGlassCategory, selectedSideliteCatalog, selectedSideliteGlassGroup, sideliteGlassOptionGroups, sideliteGlassVariantConfirmed, sideliteGridLocation, sideliteGridStyle, fslGridStyles, sideliteGridPattern, fslPatterns, sideliteGridColor, fslColors, sideliteGridWidth, fslWidths, selectedHardware, hardwareStyleGroups, selectedDoorSwing])

  useEffect(() => {
    if (!selectedFinish || jambFinishOverridden) return
    if (!jambType) setJambType('timber')
    if (!jambType || jambType === 'timber') {
      setJambFinishType(selectedFinish.finishType)
      setJambFinishColor(selectedFinish.id)
      return
    }
    const match = cladFinishes.find((item) => item.name === selectedFinish.name)
    setJambFinishType('clad')
    setJambFinishColor(match?.id ?? '')
  }, [selectedFinish?.id, jambType, jambFinishOverridden])

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

  useEffect(() => setHeroImageError(''), [homeDemoIndex])

  useEffect(() => {
    if (!showEntrywayGuidance) return
    entrywayStartButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeEntrywayGuidance()
        return
      }
      if (event.key !== 'Tab') return
      const buttons = [...(entrywayDialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
      if (!buttons.length) return
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showEntrywayGuidance])

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
      setSelectedGlassGroupKey('')
      setGlassVariantConfirmed(false)
      resetGridOptions()
    }
    if (doorStyles.length === 1) goTo(step + 1)
  }

  const startOver = () => {
    setBuilderPreviewView('Exterior')
    setStyleId('')
    setDoorLineId('')
    setGrainId('')
    setSidelites('')
    setSideliteStyleId('')
    setSelectedFinishType('')
    setSelectedPaint('')
    setSelectedStain('')
    setJambType('')
    setJambFinishType('')
    setJambFinishColor('')
    setJambFinishOverridden(false)
    setSelectedGlassCategory('')
    setGlassId('')
    setSelectedGlassGroupKey('')
    setSideliteGlassGroupKey('')
    setGlassVariantConfirmed(false)
    setSideliteGlassVariantConfirmed(false)
    resetGridOptions()
    setHardwareId('')
    setDoorSwingId('')
    setContact(initialContact)
    setErrors({})
    setSubmitted(false)
    setSubmitting(false)
    setSubmitError('')
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
        : targetStep === 'Finish' ? page === 'door-finish'
          : targetStep === 'Glass' ? page === 'glass-type'
            : targetStep === 'Hardware' ? page === 'hardware'
              : page === 'review'
    ))
    return targetPage >= 0 && targetPage <= step
  }

  const showScreen = (next: 'home' | 'builder' | 'visualizer') => {
    if (next === 'builder') setBuilderPreviewView('Exterior')
    if (next === 'builder' && screen === 'home' && !hasShownEntrywayGuidance) {
      setHasShownEntrywayGuidance(true)
      setShowEntrywayGuidance(true)
    }
    if (next !== 'builder') setShowEntrywayGuidance(false)
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
      if (nextDoorLineId === 'brushed-smooth-fiberglass' && sideliteStyleId === 's2sl') {
        setSideliteStyleId('')
        setSideliteGlassCategory('')
        setSideliteGlassId('')
        resetSideliteGrid()
      }
      if (nextDoorLineId !== '20-gauge-smooth-steel' && nextDoorLineId !== '22-gauge-steel' && nextDoorLineId !== 'brushed-smooth-fiberglass' && nextDoorLineId !== 'textured-fiberglass') {
        setSidelites('none')
        setSideliteStyleId('')
        setSideliteGlassCategory('')
        setSideliteGlassId('')
        setSideliteGridLocation('')
        setSideliteGridStyle('')
        setSideliteGridPattern('')
        setSideliteGridColor('')
        setSideliteGridWidth('')
      }
      setGrainId('')
      setSelectedGlassCategory('')
      setGlassId('')
      resetGridOptions()
    }
    if (availableDoorLines.length === 1) goTo(step + 1)
  }

  const selectGrain = (nextGrain: string) => {
    if (!signatureGrainOptions.some((item) => item.id === nextGrain)) return
    if (nextGrain !== grainId) {
      setGrainId(nextGrain)
      setSidelites('none')
      setSideliteStyleId('')
      setSideliteGlassCategory('')
      setSideliteGlassId('')
      resetSideliteGrid()
    }
    if (signatureGrainOptions.length === 1) goTo(step + 1)
  }

  const selectSidelites = (nextSidelites: SideliteConfiguration) => {
    setSidelites(nextSidelites)
    if (nextSidelites === 'none') {
      setSideliteStyleId('')
      setSideliteGlassCategory(''); setSideliteGlassId('')
      setSideliteGridLocation(''); setSideliteGridStyle(''); setSideliteGridPattern(''); setSideliteGridColor(''); setSideliteGridWidth('')
    }
  }

  const resetSideliteGrid = () => {
    setSideliteGridLocation(''); setSideliteGridStyle(''); setSideliteGridPattern(''); setSideliteGridColor(''); setSideliteGridWidth('')
  }
  const selectSideliteStyle = (styleId: string) => {
    if (!visibleSideliteStyleOptions.some((option) => option.id === styleId)) return
    if (styleId !== sideliteStyleId) {
      setSideliteStyleId(styleId)
      setSideliteGlassCategory('')
      setSideliteGlassId('')
      resetSideliteGrid()
    }
  }
  const selectSideliteGlassCategory = (category: SideliteGlassCategory) => { setSideliteGlassCategory(category); setSideliteGlassId(''); setSideliteGlassGroupKey(''); setSideliteGlassVariantConfirmed(false); resetSideliteGrid() }
  const selectSideliteGlass = (id: string) => { setSideliteGlassId(id); resetSideliteGrid() }
  const selectSideliteGlassGroup = (group: { key: string; options: SideliteGlassOption[] }) => {
    setSideliteGlassGroupKey(group.key)
    setSideliteGlassId(group.options[0]?.id ?? '')
    setSideliteGlassVariantConfirmed(group.options.length === 1)
    resetSideliteGrid()
  }
  const selectSideliteGlassVariant = (id: string) => { selectSideliteGlass(id); setSideliteGlassVariantConfirmed(true) }
  const selectSideliteGridLocation = (location: 'internal' | 'sdl') => { setSideliteGridLocation(location); setSideliteGridStyle(''); setSideliteGridPattern(''); setSideliteGridColor(''); setSideliteGridWidth('') }
  const selectSideliteGridStyle = (styleName: GridStyle) => { setSideliteGridStyle(styleName); setSideliteGridPattern(''); setSideliteGridColor(''); setSideliteGridWidth('') }
  const selectSideliteGridPattern = (pattern: GridPattern) => { setSideliteGridPattern(pattern); setSideliteGridColor(''); setSideliteGridWidth('') }
  const selectSideliteGridColor = (color: GridColor) => { setSideliteGridColor(color); setSideliteGridWidth('') }

  const selectFinish = (nextFinishId: string, nextFinishType: 'paint' | 'stain') => {
    if (!visibleFinishes.some((item) => item.id === nextFinishId)) return
    if (nextFinishId !== finishId) {
      if (nextFinishType === 'paint') setSelectedPaint(nextFinishId)
      else setSelectedStain(nextFinishId)
    }
    if (visibleFinishes.length === 1) goTo(step + 1)
  }

  const selectJambType = (nextType: 'timber' | 'clad') => {
    setJambType(nextType)
    setJambFinishType(nextType === 'clad' ? 'clad' : selectedFinish?.finishType ?? 'paint')
    const match = nextType === 'clad'
      ? cladFinishes.find((item) => item.name === selectedFinish?.name)
      : selectedFinish
    setJambFinishColor(match?.id ?? '')
    setJambFinishOverridden(false)
  }

  const selectJambFinish = (id: string) => {
    if (!jambFinishOptions.some((item) => item.id === id)) return
    setJambFinishColor(id)
    setJambFinishOverridden(id !== selectedFinish?.id || jambType === 'clad')
  }

  const selectGlass = (nextGlassId: string) => {
    if (!visibleGlass.some((item) => item.id === nextGlassId)) return
    if (nextGlassId !== glassId) {
      setGlassId(nextGlassId)
      resetGridOptions()
    }
    if (visibleGlass.length === 1) goTo(step + 1)
  }

  const selectGlassGroup = (group: GlassOptionGroup) => {
    setSelectedGlassGroupKey(group.key)
    setGlassId(group.options[0]?.id ?? '')
    setGlassVariantConfirmed(group.options.length === 1)
    resetGridOptions()
  }
  const selectGlassVariant = (id: string) => { selectGlass(id); setGlassVariantConfirmed(true) }

  const selectGlassCategory = (nextCategory: GlassCategory) => {
    if (!availableGlassCategories.some((item) => item.id === nextCategory)) return
    if (nextCategory !== selectedGlassCategory) {
      setSelectedGlassCategory(nextCategory)
      setGlassId('')
      setSelectedGlassGroupKey('')
      setGlassVariantConfirmed(false)
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
      const jambSummary = { jambType: jambType || 'timber', jambFinishType: jambType === 'clad' ? 'clad' as const : jambFinish?.finishType ?? 'paint', jambFinishColor: jambFinish?.name ?? '', jambFinishOverridden }
      const attachment = await generateSummaryAttachment(contact, product, style, selectedGrain, finish, configuredGlass, gridConfiguration, selectedHardware, selectedDoorSwing, sidelites || 'none', selectedSideliteStyle?.name ?? null, sideliteGlassConfiguration, jambSummary)
      await submitQuote({ configuration: { product, style, grain: selectedGrain, finish, doorFinishType: finish.finishType, doorFinishColor: finish.name, ...jambSummary, glass: configuredGlass, mainDoorGlass: configuredGlass, grid: gridConfiguration, hardware: selectedHardware, doorSwing: selectedDoorSwing, sidelites: sidelites || 'none', sidelitePlacement: sidelites || 'none', ...(selectedSideliteStyle ? { sideliteStyle: selectedSideliteStyle.name, sideliteSlab: selectedSideliteStyle.id } : {}), ...(sideliteGlassConfiguration ? { sideliteGlass: sideliteGlassConfiguration } : {}) }, contact, attachment, submittedAt: new Date().toISOString() })
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
    await downloadSummary(contact, product, style, selectedGrain, finish, configuredGlass, gridConfiguration, selectedHardware, selectedDoorSwing, sidelites || 'none', selectedSideliteStyle?.name ?? null, sideliteGlassConfiguration, { jambType: jambType || 'timber', jambFinishType: jambType === 'clad' ? 'clad' : jambFinish?.finishType ?? 'paint', jambFinishColor: jambFinish?.name ?? '', jambFinishOverridden })
  }

  const configurationSummaryRows: [string, string, number][] = [
    ['Door style', style.name, pages.indexOf('door-style')],
    ['Door Line', selectedDoorLine?.name ?? product.doorType, pages.indexOf('door-line')],
    ['Sidelite Placement', sideliteLabels[sidelites || 'none'], pages.indexOf('sidelites')],
    ...(selectedSideliteStyle ? [['Sidelite Slab', selectedSideliteStyle.name, pages.indexOf('sidelite-style')] as [string, string, number]] : []),
    ...(selectedFslGlass ? [
      ['Sidelite Glass', selectedFslGlass.name, pages.indexOf('sidelite-glass')] as [string, string, number],
      ...(usesFslGridFlow ? [
        ['Sidelite glass coating', fslCoating, pages.indexOf('sidelite-grid-location')] as [string, string, number],
        ['Sidelite grid location', sideliteGridLocation === 'sdl' ? 'SDL' : 'Internal', pages.indexOf('sidelite-grid-location')] as [string, string, number],
        ...(sideliteGridStyle ? [['Sidelite grid style', sideliteGridStyle, pages.indexOf('sidelite-grid-style')] as [string, string, number]] : []),
        ...(sideliteGridPattern ? [['Sidelite grid pattern', sideliteGridPattern, pages.indexOf('sidelite-grid-pattern')] as [string, string, number]] : []),
        ...(sideliteGridColor ? [['Sidelite grid color', sideliteGridColor, pages.indexOf('sidelite-grid-color')] as [string, string, number]] : []),
        ...(sideliteGridWidth ? [['Sidelite grid width', sideliteGridWidth, pages.indexOf('sidelite-grid-width')] as [string, string, number]] : []),
      ] : []),
    ] : []),
    ...(selectedGrain ? [['Grain', selectedGrain, pages.indexOf('door-grain')] as [string, string, number]] : []),
    ['Door finish type', selectedFinishType === 'stain' ? 'Stain' : 'Paint', pages.indexOf('door-finish')],
    ['Door finish color', finish.name, pages.indexOf('door-finish')],
    ['Jamb type', jambType === 'clad' ? 'Clad' : 'Timber', pages.indexOf('jamb-type')],
    ['Jamb finish type', jambType === 'clad' ? 'Clad' : jambFinishType === 'stain' ? 'Stain' : 'Paint', pages.indexOf('jamb-finish')],
    ['Jamb finish color', jambFinish?.name ?? 'Not selected', pages.indexOf('jamb-finish')],
    ...(compatibilitySupportsGlass ? [['Main Door Glass', configuredGlass?.name ?? 'Clear', pages.indexOf('glass-type')] as [string, string, number]] : []),
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

  const heroGenerationParam = new URLSearchParams(window.location.search).get('generateHeroDoor')
  if (heroGenerationParam !== null) {
    const generationIndex = Number.parseInt(heroGenerationParam, 10)
    const generationDemo = homeDemoConfigurations[generationIndex]
    if (!generationDemo || !HERO_PRESETS[generationIndex]) return <pre>Invalid hero door index: {heroGenerationParam}</pre>
    return <HeroDoorGenerator
      label={heroDoorFilename(HERO_PRESETS[generationIndex], generationIndex)}
      previewProps={{ style: generationDemo.style, finish: generationDemo.finish, glass: generationDemo.glass, hardware: generationDemo.hardware, grain: generationDemo.grain, product: generationDemo.product, tintColor: generationDemo.finish.color, applyFinish: true, gridMatchesFinish: generationDemo.gridMatchesFinish }}
    />
  }

  return (
    <div className={`app ${screen === 'home' ? 'home-app' : screen === 'visualizer' ? 'visualizer-app' : ''} ${screen === 'builder' && currentPage === 'review' && submitted ? 'review-confirmation-centered' : ''}`}>
      <header>
        <div className="brand">
          <button className="brand-home" type="button" aria-label="Go to home page" onClick={() => showScreen('home')}>
            <img src="/assets/branding/hgi-logo-black.png" alt="Home Guard Industries Doors and Windows" />
          </button>
          <span className="app-name"><strong>Home Guard Door Builder</strong></span>
        </div>
        <div className="header-actions">
          <button type="button" className={`test-flow-toggle ${testMode ? 'active' : ''}`} role="switch" aria-label="Test current review experience" aria-checked={testMode} onClick={() => { setTestMode((value) => !value); setSubmitted(false); setSubmitError('') }}><span>Test</span><i aria-hidden="true"/></button>
          <button className="home-return" aria-label="Home" onClick={() => showScreen('home')}><HomeIcon size={17} /><span>Home</span></button>
          <div className="header-dealer-cta"><span>Want this door? <strong>Connect with a Dealer</strong></span><a href="https://homeguardindustries.com/find-a-home-guard-dealer-hub/" target="_blank" rel="noreferrer">Find a Dealer <ExternalLink size={14} /></a></div>
        </div>
      </header>

      {showEntrywayGuidance && <div className="entryway-guidance-backdrop" role="presentation">
        <div ref={entrywayDialogRef} className="entryway-guidance-dialog" role="dialog" aria-modal="true" aria-labelledby="entryway-guidance-title" aria-describedby="entryway-guidance-description">
          <span>Before you begin</span>
          <h2 id="entryway-guidance-title">Match Your Current Entryway</h2>
          <p id="entryway-guidance-description">You’re about to configure the door you want to view on your home. For the most accurate visualization, choose a door layout that matches the opening you plan to replace, including the number and placement of any sidelites.</p>
          <p className="entryway-guidance-note">Transoms are not currently replaced in the visualizer and will remain visible in your uploaded photo.</p>
          <div className="entryway-guidance-actions">
            <button type="button" className="entryway-guidance-back" onClick={() => showScreen('home')}>Back</button>
            <button ref={entrywayStartButtonRef} type="button" className="entryway-guidance-start" onClick={closeEntrywayGuidance}>Start Configuring <ArrowRight size={17} /></button>
          </div>
        </div>
      </div>}

      {screen === 'home' ? <main className="home-page">
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-eyebrow">Home Guard Door Builder</span>
            <h1>Build a Door Made for Your Home.</h1>
            <p>Choose your door style, finish, glass, and hardware, then preview your exact combination before requesting a quote.</p>
            <button className="start-building" onClick={() => showScreen('builder')}>Start Building <ArrowRight size={18} /></button>
          </div>
          <div className="home-hero-visual">
            <div className="home-entryway-demo hero-composite" aria-label="Animated examples of configurable entry doors">
              <div className="hero-composite-stage">
                <img className="home-entryway-image" src="/assets/hero/hero-entryway.png" alt="Welcoming home entryway with a customizable door preview" />
                <div className="home-entryway-overlay" aria-hidden="true">
                  <div className="home-entryway-door-slot hero-door-stack entryway-door-stack hero-door-overlay" style={heroDoorOpeningStyle}>
                    <div className="home-demo-door-layer active" key={`${activeHomeDemo.style.code}-${activeHomeDemo.finish.id}-${activeHomeDemo.glass?.id ?? 'no-glass'}-${activeHomeDemo.hardware.id}`}>
                      <img
                        className="hero-static-door-image"
                        src={`/assets/generated/hero-doors/${heroDoorFilename(HERO_PRESETS[homeDemoIndex % HERO_PRESETS.length], homeDemoIndex % HERO_PRESETS.length)}`}
                        alt={`${activeHomeDemo.style.name} in ${activeHomeDemo.finish.name}${activeHomeDemo.glass ? ` with ${activeHomeDemo.glass.name} glass` : ''}`}
                        width="484"
                        height="1100"
                        loading={homeDemoIndex === 0 ? 'eager' : 'lazy'}
                        decoding={homeDemoIndex === 0 ? 'sync' : 'async'}
                        fetchPriority={homeDemoIndex === 0 ? 'high' : 'auto'}
                        onLoad={() => setHeroImageError('')}
                        onError={(event) => {
                          const message = `Missing generated hero door: ${event.currentTarget.currentSrc || event.currentTarget.src}`
                          if (import.meta.env.DEV) { console.error(`[hero-door-image:missing] ${message}`); setHeroImageError(message) }
                        }}
                      />
                      {import.meta.env.DEV && heroImageError && <span className="hero-image-warning" role="alert">{heroImageError}</span>}
                    </div>
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
      </main> : screen === 'visualizer' ? <HomeVisualizer
        onBack={() => showScreen('builder')}
        onReturnToReview={() => { goTo(pages.indexOf('review')); showScreen('builder') }}
        configuredDoorPreview={configuredDoorPreview}
        configurationKey={configuredDoorKey}
      /> : <>
      <div className={`builder-toolbar ${currentPage === 'review' && submitted ? 'confirmation-toolbar' : ''}`}>
        <nav className="stepper" aria-label="Configuration progress">
          {steps.map((label, index) => {
            const isReachable = canVisitStep(index)
            const targetPage = pages.findIndex((page) => label === 'Door Style' ? page === 'door-style' : label === 'Finish' ? page === 'door-finish' : label === 'Glass' ? page === 'glass-type' : label === 'Hardware' ? page === 'hardware' : page === 'review')
            return <button key={label} className={`${index === activeMainStepIndex ? 'active' : ''} ${index < activeMainStepIndex ? 'done' : ''}`} disabled={!isReachable} aria-current={index === activeMainStepIndex ? 'step' : undefined} onClick={() => isReachable && goTo(targetPage)}><span>{index < activeMainStepIndex ? <Check size={13} /> : index + 1}</span><em>{label}</em></button>
          })}
        </nav>
        {!(currentPage === 'review' && submitted) && <div className="preview-toolbar">
          <span>Preview</span>
          {selectedStyle && <div className="preview-view-toggle" role="group" aria-label="Preview view">
            {previewModes.map((view) => <button type="button" className={builderPreviewView === view ? 'active' : ''} aria-pressed={builderPreviewView === view} key={view} onClick={() => setBuilderPreviewView(view)}>{view}</button>)}
          </div>}
        </div>}
      </div>
      <main>
        {currentStep !== 'Review & Quote' && <div className="mobile-live-preview">
          {selectedStyle && <div className="preview-view-toggle mobile-preview-view-toggle" role="group" aria-label="Preview view">
            {previewModes.map((view) => <button type="button" className={builderPreviewView === view ? 'active' : ''} aria-pressed={builderPreviewView === view} key={view} onClick={() => setBuilderPreviewView(view)}>{view}</button>)}
          </div>}
          {selectedStyle ? renderConfiguredPreviewMode() : <EmptyDoorPreview />}
        </div>}
        <section ref={builderPanelRef} className={`builder-panel ${currentStep !== 'Review & Quote' ? 'configuration-step' : 'review-step'}`}>
          {testMode && currentPage === 'review' && !submitted && <button className="floating-visualizer-launch" type="button" onClick={() => showScreen('visualizer')} aria-label="Launch Door Visualizer"><Eye size={19} /><span>Launch Door Visualizer</span><ArrowRight size={16} /></button>}
          {currentStep !== 'Review & Quote' && <>
            <div className="section-heading step-heading">
              <div className="step-heading-copy">
                <div className="step-label-row">
                  <span>Step {activeMainStepIndex + 1} of {steps.length}</span>
                </div>
                <div className="step-title-row">
                  <h1>{currentPage === 'door-style' ? 'Choose a Door Style' : currentPage === 'door-line' ? 'Choose Your Door Line' : currentPage === 'door-grain' ? 'Choose Your Door Grain' : currentPage === 'sidelites' ? 'Choose Your Sidelites' : currentPage === 'sidelite-style' ? 'Choose Your Sidelite Slab' : currentPage === 'door-finish' ? 'Choose Your Door Finish' : currentPage === 'jamb-type' ? 'Choose Your Jamb Type' : currentPage === 'jamb-finish' ? 'Choose Your Jamb Finish' : currentPage === 'glass-type' ? 'Choose Main Door Glass Type' : currentPage === 'glass' ? 'Choose Main Door Glass' : currentPage === 'glass-variant' ? `Choose ${selectedGlassGroup?.title ?? 'Glass'} Finish` : currentPage === 'grid-location' ? 'Choose Main Door Grid Location' : currentPage === 'grid-style' ? 'Choose Main Door Grid Style' : currentPage === 'grid-pattern' ? 'Choose Main Door Grid Pattern' : currentPage === 'grid-color' ? 'Choose Main Door Grid Color' : currentPage === 'grid-width' ? 'Choose Main Door Grid Width' : currentPage === 'sidelite-glass-type' ? 'Choose Sidelite Glass Type' : currentPage === 'sidelite-glass' ? 'Choose Sidelite Glass' : currentPage === 'sidelite-glass-variant' ? `Choose ${selectedSideliteGlassGroup?.title ?? 'Sidelite Glass'} Finish` : currentPage === 'sidelite-grid-location' ? 'Choose Sidelite Grid Location' : currentPage === 'sidelite-grid-style' ? 'Choose Sidelite Grid Style' : currentPage === 'sidelite-grid-pattern' ? 'Choose Sidelite Grid Pattern' : currentPage === 'sidelite-grid-color' ? 'Choose Sidelite Grid Color' : currentPage === 'sidelite-grid-width' ? 'Choose Sidelite Grid Width' : currentPage === 'hardware' ? 'Choose Your Hardware' : 'Choose Your Door Swing'}</h1>
                  <div className="section-resets">
                    {currentPage === 'door-style' && <button type="button" aria-label="Reset Design" onClick={resetDesign}><RotateCcw size={20} /><span>Reset Design</span></button>}
                  </div>
                </div>
                <p>{currentPage === 'door-style' ? 'Browse all available door styles and choose the one that feels right for your home.' : currentPage === 'door-line' ? 'Choose the compatible material line for this door style.' : currentPage === 'door-grain' ? 'Choose the Signature Series grain for this door.' : currentPage === 'sidelites' ? 'Choose whether sidelites appear beside your selected door.' : currentPage === 'sidelite-style' ? `Select the sidelite slab for your ${selectedDoorLine?.name ?? 'steel'} entry unit.` : currentPage === 'door-finish' ? 'Choose the paint or stain applied to the door slab and sidelites.' : currentPage === 'jamb-type' ? 'Choose timber or clad for the frame, jambs, casing, brickmould, and mullions.' : currentPage === 'jamb-finish' ? 'Choose the finish applied only to the jamb and frame system.' : currentPage === 'glass-type' ? 'Choose the kind of glass you want to explore for the main door.' : currentPage === 'glass' ? 'Choose glass for the main door before selecting sidelite glass.' : currentPage === 'glass-variant' ? 'Choose the available finish for this glass design.' : currentPage.startsWith('sidelite-') ? `Choose the compatible ${selectedSideliteStyle?.name ?? ''} sidelite option.` : currentPage === 'grid-location' ? 'Choose where the grids are installed.' : currentPage === 'grid-style' ? 'Choose the profile of your internal grids.' : currentPage === 'grid-pattern' ? 'Choose a pattern compatible with your selected grid style.' : currentPage === 'grid-color' ? 'Choose the confirmed color for this grid pattern.' : currentPage === 'grid-width' ? 'Choose the confirmed grid width.' : currentPage === 'hardware' ? 'Complete your entry with hardware.' : 'Choose the direction your door will swing when viewed from the outside.'}</p>
              </div>
            </div>
            <div ref={builderOptionsRef} className="builder-options-scroll">
              {glassSelectionTarget && <div className={`glass-target-banner glass-target-${glassSelectionTarget}`} role="status" aria-live="polite">
                <span className="glass-target-icon" aria-hidden="true">{glassSelectionTarget === 'main-door' ? 'D' : 'SL'}</span>
                <span><small>You are choosing glass for</small><strong>{glassSelectionTarget === 'main-door' ? 'Main Door' : 'Sidelite'}</strong>{glassSelectionTarget === 'sidelite' && <em>{selectedSideliteStyle?.name}{sidelites && sidelites !== 'none' ? ` · ${sideliteLabels[sidelites]}` : ''}</em>}</span>
              </div>}
              {(currentPage === 'door-finish' || (currentPage === 'jamb-finish' && jambType === 'timber')) && selectedDoorLine && <div className="finish-toolbar">
                <div className="finish-tabs" role="tablist" aria-label="Finish type">{effectiveFinishTypes.map((type) => <button type="button" role="tab" aria-selected={(currentPage === 'door-finish' ? activeFinishType : jambFinishType) === type} className={(currentPage === 'door-finish' ? activeFinishType : jambFinishType) === type ? 'active' : ''} key={type} onClick={() => currentPage === 'door-finish' ? selectFinishTab(type) : (setJambFinishType(type), setJambFinishColor(''), setJambFinishOverridden(true))}>{type === 'paint' ? 'Paint' : 'Stain'}</button>)}</div>
                <div className="finish-logo-slot">
                  {(currentPage === 'door-finish' ? activeFinishType : jambFinishType) === 'paint' && <div className="promatch-group">
                    <div className="promatch-brand"><img src="/assets/branding/pro-match-logo.png" alt="ProMatch paint colors" loading="lazy" decoding="async" /><ProMatchInfo /></div>
                    <p>{proMatchNote}</p>
                  </div>}
                  {(currentPage === 'door-finish' ? activeFinishType : jambFinishType) === 'stain' && <div className="timberstain-group"><div className="timberstain-brand"><img src="/assets/branding/timberstain-logo.png" alt="TimberStain®" loading="lazy" decoding="async" /><TimberStainInfo /></div><p>{proMatchNote}</p></div>}
                </div>
              </div>}
              <div className={`options-grid step-${step} ${currentPage === 'door-style' || currentPage === 'door-grain' || currentPage === 'door-finish' || currentPage === 'jamb-type' || currentPage === 'jamb-finish' || currentPage === 'glass-type' || currentPage === 'glass-variant' || currentPage.startsWith('grid-') || currentPage.startsWith('sidelite-') ? 'door-style-grid' : ''} ${currentPage === 'glass' || currentPage === 'glass-variant' || currentPage === 'sidelite-glass' || currentPage === 'sidelite-glass-variant' ? 'glass-options-grid' : ''}`}>
                {currentPage === 'door-style' && doorStyles.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.eyebrow} selected={styleId === item.id} onClick={() => selectDoorStyle(item.id)} visual={<DoorStyleThumbnail style={item} />} />)}
                {currentPage === 'door-line' && availableDoorLines.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow="Door Line" selected={doorLineId === item.id} onClick={() => selectDoorLine(item.id)} visual={<span className="door-line-card-image"><img src={item.image} alt="" loading="lazy" decoding="async" /></span>} />)}
                {currentPage === 'door-grain' && signatureGrainOptions.map((item) => <OptionCard key={item.id} title={item.name} eyebrow="Signature grain" selected={selectedGrain === item.id} onClick={() => selectGrain(item.id)} visual={<img className="grain-card-image" src={item.image} alt="" loading="lazy" decoding="async" />} />)}
                {currentPage === 'sidelites' && sideliteOptions.map((item) => <OptionCard key={item.id} title={item.name} eyebrow="Sidelites" selected={sidelites === item.id} onClick={() => selectSidelites(item.id)} visual={<img className="sidelite-option-image" src={item.image} alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'sidelite-style' && visibleSideliteStyleOptions.map((item) => <OptionCard key={item.id} title={item.name} eyebrow={`${selectedDoorLine?.name ?? 'Door'} Sidelite`} selected={sideliteStyleId === item.id} onClick={() => selectSideliteStyle(item.id)} visual={<img className="sidelite-style-image" src={item.image} alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'door-finish' && visibleFinishes.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.finishType} selected={finishId === item.id} onClick={() => selectFinish(item.id, item.finishType)} visual={<span className="finish-tile-wrap" style={{ '--fallback-finish': item.color } as CSSProperties}><img className="finish-tile-image" src={item.image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} /></span>} />)}
                {currentPage === 'jamb-type' && <>
                  <OptionCard title="Timber" description="Choose from available paint and stain finishes. The jamb defaults to match your door but can be changed." eyebrow="Jamb type" selected={jambType === 'timber'} onClick={() => selectJambType('timber')} visual={<span className="jamb-type-visual jamb-type-timber" />} />
                  <OptionCard title="Clad" description="Choose from available Home Guard clad colors. Stain finishes are not available for clad jambs." eyebrow="Jamb type" selected={jambType === 'clad'} onClick={() => selectJambType('clad')} visual={<span className="jamb-type-visual jamb-type-clad" />} />
                </>}
                {currentPage === 'jamb-finish' && jambFinishOptions.map((item) => <OptionCard key={`${jambType}-${item.id}`} title={item.name} description={jambType === 'clad' ? 'Home Guard clad color.' : item.description} eyebrow={jambType === 'clad' ? 'Clad' : item.finishType} selected={jambFinishColor === item.id} onClick={() => selectJambFinish(item.id)} visual={<span className="finish-tile-wrap" style={{ '--fallback-finish': item.color } as CSSProperties}><img className="finish-tile-image" src={item.image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} /></span>} />)}
                {currentPage === 'glass-type' && availableGlassCategories.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow="Glass type" selected={selectedGlassCategory === item.id} onClick={() => selectGlassCategory(item.id)} visual={<img className={`glass-option-thumbnail${item.id === 'retro' ? ' retro-glass-thumbnail' : item.id === 'clic' ? ' clic-glass-thumbnail' : ''}`} src={item.image} alt="" loading="lazy" decoding="async" />} />)}
                {currentPage === 'glass' && glassOptionGroups.map((group) => {
                  const displayOption = group.options.find((item) => item.id === glassId) ?? group.options[0]
                  return <OptionCard key={group.key} title={group.title} eyebrow="Glass" selected={selectedGlassGroupKey === group.key} onClick={() => selectGlassGroup(group)} visual={displayOption.thumbnailPath ? <img className="glass-option-thumbnail" src={displayOption.thumbnailPath} alt="" loading="lazy" decoding="async" /> : undefined} />
                })}
                {currentPage === 'glass-variant' && selectedGlassGroup?.options.map((item) => <OptionCard key={item.id} title={glassVariantLabel(item.name)} eyebrow={selectedGlassGroup.title} selected={glassVariantConfirmed && glassId === item.id} onClick={() => selectGlassVariant(item.id)} visual={item.thumbnailPath ? <img className="glass-option-thumbnail" src={item.thumbnailPath} alt="" loading="lazy" decoding="async" /> : undefined} />)}
                {currentPage === 'grid-location' && availableGridLocations.map((item) => <OptionCard key={item.id} title={item.name} selected={gridPathId === item.id} onClick={() => selectGridLocation(item.id)} visual={<img className="grid-option-thumbnail" src={item.image} alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'grid-style' && lowEGridStyles.map((item) => <OptionCard key={item.id} title={item.id} selected={gridStyle === item.id} onClick={() => selectGridStyle(item.id)} visual={<img className="grid-option-thumbnail" src={item.image} alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'grid-pattern' && compatibleGridPatterns.map((item) => <OptionCard key={item.id} title={item.id} selected={gridPattern === item.id} onClick={() => selectGridPattern(item.id)} visual={<img className="grid-pattern-thumbnail" src="/assets/grid-options/All Lites.png" alt="" loading="eager" decoding="async" />} />)}
                {currentPage === 'grid-color' && compatibleGridColors.map((color) => <OptionCard key={color} title={color} eyebrow="Grid color" selected={gridColor === color} onClick={() => selectGridColor(color)} visual={<span className="finish-tile-wrap grid-color-tile" style={{ '--fallback-finish': gridColorValues[color] ?? '#efeee8' } as CSSProperties} />} />)}
                {currentPage === 'grid-width' && gridColor && compatibleGridWidths.map((width) => <OptionCard key={width} className="bar-size-option-card" title={width} eyebrow="Bar size" selected={gridWidth === width} onClick={() => selectGridWidth(width)} />)}
                {currentPage === 'sidelite-glass-type' && selectedSideliteCatalog?.categories.map((item) => <OptionCard key={item.id} title={item.name} eyebrow={`${selectedSideliteStyle?.name} glass`} selected={sideliteGlassCategory === item.id} onClick={() => selectSideliteGlassCategory(item.id)} visual={<img className={`glass-option-thumbnail${item.id === 'clic' ? ' clic-glass-thumbnail' : ''}`} src={glassCategoryChoices.find((category) => category.id === item.id)?.image ?? item.image} alt="" loading="lazy" decoding="async" />} />)}
                {currentPage === 'sidelite-glass' && sideliteGlassOptionGroups.map((group) => {
                  const displayOption = group.options.find((item) => item.id === sideliteGlassId) ?? group.options[0]
                  const thumbnail = glassSelectionThumbnail(displayOption.name) ?? displayOption.asset ?? (displayOption.id === 'clear-grids' ? '/assets/grid-options/Internal Grids.png' : '/assets/glass/thumbnails/Clear-option.png')
                  return <OptionCard key={group.key} title={group.title} eyebrow={`${selectedSideliteStyle?.name ?? ''} Glass`} selected={sideliteGlassGroupKey === group.key} onClick={() => selectSideliteGlassGroup(group)} visual={<img className={`glass-option-thumbnail${group.title.toLowerCase().startsWith('clic') ? ' clic-glass-thumbnail' : ''}`} src={thumbnail} alt="" loading="lazy" decoding="async" />} />
                })}
                {currentPage === 'sidelite-glass-variant' && selectedSideliteGlassGroup?.options.map((item) => <OptionCard key={item.id} title={glassVariantLabel(item.name)} eyebrow={selectedSideliteGlassGroup.title} selected={sideliteGlassVariantConfirmed && sideliteGlassId === item.id} onClick={() => selectSideliteGlassVariant(item.id)} visual={item.asset ? <img className="glass-option-thumbnail" src={item.asset} alt="" loading="lazy" decoding="async" /> : undefined} />)}
                {currentPage === 'sidelite-grid-location' && ([{ id: 'internal', name: 'Internal Grids', image: '/assets/grid-options/Internal Grids.png' }, { id: 'sdl', name: 'SDL Grids', image: '/assets/grid-options/SDL Grids.png' }] as const).map((item) => <OptionCard key={item.id} title={item.name} selected={sideliteGridLocation === item.id} onClick={() => selectSideliteGridLocation(item.id)} visual={<img className="grid-option-thumbnail" src={item.image} alt="" />} />)}
                {currentPage === 'sidelite-grid-style' && fslGridStyles.map((item) => <OptionCard key={item} title={item} selected={sideliteGridStyle === item} onClick={() => selectSideliteGridStyle(item)} visual={<img className="grid-option-thumbnail" src={`/assets/grid-options/${item === 'Arts & Crafts' ? 'Arts & Crafts Grid' : `${item} Grids`}.png`} alt="" />} />)}
                {currentPage === 'sidelite-grid-pattern' && fslPatterns.map((item) => <OptionCard key={item} title={item} selected={sideliteGridPattern === item} onClick={() => selectSideliteGridPattern(item)} visual={<img className="grid-pattern-thumbnail" src="/assets/grid-options/All Lites.png" alt="" />} />)}
                {currentPage === 'sidelite-grid-color' && fslColors.map((color) => <OptionCard key={color} title={color} eyebrow="Grid color" selected={sideliteGridColor === color} onClick={() => selectSideliteGridColor(color)} visual={<span className="finish-tile-wrap grid-color-tile" style={{ '--fallback-finish': gridColorValues[color] ?? '#efeee8' } as CSSProperties} />} />)}
                {currentPage === 'sidelite-grid-width' && fslWidths.map((width) => <OptionCard key={width} className="bar-size-option-card" title={width} eyebrow="Bar size" selected={sideliteGridWidth === width} onClick={() => setSideliteGridWidth(width)} />)}
                {currentPage === 'hardware' && hardwareStyleGroups.map((options) => <HardwareOptionCard key={`${options[0].manufacturer}-${options[0].style}`} options={options} selectedId={hardwareId} onSelect={(option) => selectHardware(option.id)} />)}
                {currentPage === 'door-swing' && doorSwingOptions.map((item) => <OptionCard key={item.id} title={`${item.id} – ${item.name}`} eyebrow="Door swing" selected={doorSwingId === item.id} onClick={() => selectDoorSwing(item.id)} visual={<img className="door-swing-image" src={item.image} alt="" loading="lazy" decoding="async" />} />)}
              </div>
            </div>
          </>}

          {currentPage === 'review' && !submitted && <>
            <div className="section-heading review-heading"><span>Final step</span><h1>Find a Home Guard Dealer</h1><p>Submit your contact information and door configuration. A Home Guard dealer or team member will follow up with next steps.</p></div>
            <div className="mobile-review-preview">{renderConfiguredPreviewMode()}</div>
            {testMode && <section className="visualizer-promo-card visualizer-promo-card-mobile" aria-labelledby="mobile-visualizer-promo-title">
              <div className="visualizer-promo-graphic" aria-hidden="true"><img src="/assets/visualizer/view-on-your-home-tablet.png" alt="" /></div>
              <div className="visualizer-promo-copy"><span className="visualizer-promo-eyebrow">Home Visualizer</span><h2 id="mobile-visualizer-promo-title">View on your home</h2><p>Upload a photo and see this door on your entryway.</p><button type="button" onClick={() => showScreen('visualizer')}>Launch Visualizer <ArrowRight size={16} /></button><small>It’s fast, easy, and helps you buy with confidence.</small></div>
            </section>}
            <div className="summary-card">
              <div className="summary-title"><h2>Configuration Summary</h2></div>
              {configurationSummaryRows.map(([label, value, target]) => <div className="summary-row" key={label}><span>{label}<strong>{value}</strong></span>{target >= 0 && <button onClick={() => goTo(target)}>Edit</button>}</div>)}
            </div>
            <div className={`review-download-form ${testMode ? '' : 'form-only'}`}>
              {testMode && <div className="attachment-card">
                <span className="attachment-icon"><FileText size={25} /></span>
                <span className="attachment-copy"><strong>{configurationPdfName}</strong></span>
                <button type="button" onClick={downloadPdf}><Download size={16} /> Download PDF</button>
              </div>}
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

          {submitted && <div className="success post-submit-visualizer">
            <span><Check size={32} /></span><small>Configuration received</small><h1>Thanks, {contact.fullName}.</h1>
            <p>Your configuration PDF will be sent to <strong>{contact.email}</strong>.</p>
            <p>While you wait, see how your configured door could look on your own home.</p>
            <button className="post-submit-visualizer-button" onClick={() => showScreen('visualizer')}><Eye size={19} /> Try the Door Visualizer <ArrowRight size={17} /></button>
          </div>}

          {currentPage !== 'review' && <div className="builder-actions"><button className="back" disabled={step === 0} onClick={() => goTo(step - 1)}><ArrowLeft size={17} /> Previous</button><button className="next" disabled={(currentPage === 'door-style' && !selectedStyle) || (currentPage === 'door-line' && !selectedDoorLine) || (currentPage === 'door-grain' && !selectedGrain) || (currentPage === 'sidelites' && !sidelites) || (currentPage === 'sidelite-style' && !selectedSideliteStyle) || (currentPage === 'door-finish' && !visibleSelectedFinish) || (currentPage === 'jamb-type' && !jambType) || (currentPage === 'jamb-finish' && !jambFinish) || (currentPage === 'glass-type' && !selectedGlassCategory) || (currentPage === 'glass' && visibleGlass.length > 0 && !selectedGlass && !selectedGlassGroup) || (currentPage === 'glass-variant' && !glassVariantConfirmed) || (currentPage === 'grid-location' && !gridPathId) || (currentPage === 'grid-style' && !gridStyle) || (currentPage === 'grid-pattern' && !gridPattern) || (currentPage === 'grid-color' && !gridColor) || (currentPage === 'grid-width' && !gridWidth) || (currentPage === 'sidelite-glass-type' && !sideliteGlassCategory) || (currentPage === 'sidelite-glass' && !selectedFslGlass && !selectedSideliteGlassGroup) || (currentPage === 'sidelite-glass-variant' && !sideliteGlassVariantConfirmed) || (currentPage === 'sidelite-grid-location' && !sideliteGridLocation) || (currentPage === 'sidelite-grid-style' && !sideliteGridStyle) || (currentPage === 'sidelite-grid-pattern' && !sideliteGridPattern) || (currentPage === 'sidelite-grid-color' && !sideliteGridColor) || (currentPage === 'sidelite-grid-width' && !sideliteGridWidth) || (currentPage === 'hardware' && !selectedHardware) || (currentPage === 'door-swing' && !selectedDoorSwing)} onClick={() => goTo(step + 1)}>Next <ArrowRight size={17} /></button></div>}
        </section>

        {!submitted && <aside className={currentPage === 'review' ? 'review-preview-panel' : undefined}>
          <div className="aside-preview-area">
            {selectedStyle ? renderConfiguredPreviewMode() : <EmptyDoorPreview />}
          </div>
          {testMode && currentPage === 'review' && <section className="visualizer-promo-card visualizer-promo-card-desktop" aria-labelledby="desktop-visualizer-promo-title">
            <div className="visualizer-promo-graphic" aria-hidden="true"><img src="/assets/visualizer/view-on-your-home-tablet.png" alt="" /></div>
            <div className="visualizer-promo-copy"><span className="visualizer-promo-eyebrow">Home Visualizer</span><h2 id="desktop-visualizer-promo-title">View on your home</h2><p>Upload a photo and see this door on your entryway.</p><button type="button" onClick={() => showScreen('visualizer')}>Launch Visualizer <ArrowRight size={16} /></button><small>It’s fast, easy, and helps you buy with confidence.</small></div>
          </section>}
          {currentPage !== 'review' && <div className="mini-summary">
            <span><b>Door style</b><strong>{selectedStyle?.name ?? 'Not selected'}</strong></span>
            <span><b>Door Line</b><strong>{selectedDoorLine?.name ?? 'Not selected'}</strong></span>
            {selectedGrain && <span><b>Grain</b><strong>{selectedGrain}</strong></span>}
            <span><b>Sidelite Placement</b><strong>{sideliteLabels[sidelites || 'none']}</strong></span>
            {selectedSideliteStyle && <span><b>Sidelite Slab</b><strong>{selectedSideliteStyle.name}</strong></span>}
            {selectedFslGlass && <span><b>Sidelite glass</b><strong>{selectedFslGlass.name}</strong></span>}
            {usesFslGridFlow && <><span><b>Sidelite glass coating</b><strong>{fslCoating}</strong></span><span><b>Sidelite grid location</b><strong>{sideliteGridLocation === 'sdl' ? 'SDL' : 'Internal'}</strong></span>{sideliteGridStyle && <span><b>Sidelite grid style</b><strong>{sideliteGridStyle}</strong></span>}{sideliteGridPattern && <span><b>Sidelite grid pattern</b><strong>{sideliteGridPattern}</strong></span>}{sideliteGridColor && <span><b>Sidelite grid color</b><strong>{sideliteGridColor}</strong></span>}{sideliteGridWidth && <span><b>Sidelite grid width</b><strong>{sideliteGridWidth}</strong></span>}</>}
            <span><b>Paint or stain</b><strong>{selectedStyle ? (activeFinishType === 'paint' ? 'Paint' : 'Stain') : 'Not selected'}</strong></span>
            <span><b>Finish</b><strong>{selectedFinish?.name ?? 'Not selected'}</strong></span>
            <span><b>Main Door Glass</b><strong>{compatibilitySupportsGlass ? (configuredGlass?.name ?? 'Clear') : 'Not applicable'}</strong></span>
            {gridConfiguration && <>{gridConfiguration.gridLocation && <span><b>Grid location</b><strong>{gridConfiguration.gridLocation}</strong></span>}{gridConfiguration.gridStyle && <span><b>Grid style</b><strong>{gridConfiguration.gridStyle}</strong></span>}{gridConfiguration.gridPattern && <span><b>Grid pattern</b><strong>{gridConfiguration.gridPattern}</strong></span>}{gridConfiguration.gridColor && <span><b>Grid color</b><strong>{gridConfiguration.gridColor}</strong></span>}{gridConfiguration.gridWidth && <span><b>Grid width</b><strong>{gridConfiguration.gridWidth}</strong></span>}</>}
            <span><b>Hardware</b><strong>{selectedHardware ? hardwareDisplayName(selectedHardware) : 'Not selected'}</strong></span>
            <span><b>Door swing</b><strong>{selectedDoorSwing?.name ?? 'Not selected'}</strong></span>
          </div>}
        </aside>}
      </main>
      </>}
      <footer className="site-footer">
        <div className="site-footer-contact">
          <div className="site-footer-direct"><a href="tel:+18005251885"><Phone size={15} /><span>1-800-525-1885</span></a><a href="mailto:getintouch@homeguardindustries.com"><Mail size={15} /><span>getintouch@homeguardindustries.com</span></a></div>
          <div className="site-footer-location"><a href="https://www.google.com/maps/place/13101+Main+St,+Grabill,+IN+46741/@41.20679,-84.9711317,17z/data=!3m1!4b1!4m5!3m4!1s0x8816004dd3ac2ac5:0x8788f6dae643c569!8m2!3d41.20679!4d-84.968943" target="_blank" rel="noreferrer"><MapPin size={15} /><span>13101 Main Street, Grabill, IN 46741</span></a><a href="https://homeguardindustries.com" target="_blank" rel="noreferrer"><Globe size={15} /><span>homeguardindustries.com</span></a></div>
        </div>
        <div className="site-footer-meta">
          <span>© 2026 Home Guard Industries</span>
          <span>Built with 🤍 by <a href="https://schoolradius.co/" target="_blank" rel="noreferrer">School Radius</a></span>
        </div>
      </footer>
    </div>
  )
}
