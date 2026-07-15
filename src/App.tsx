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
import type { ContactForm, DoorSwing, GlassOption, PreviewHardware } from './types'
import { configurationPdfName } from './utils/pdfConfig'
import { submitQuote, type SubmissionResult } from './utils/submission'

const glassSteps = ['Door Style', 'Finish', 'Glass', 'Hardware', 'Review & Quote']
const noGlassSteps = ['Door Style', 'Finish', 'Hardware', 'Review & Quote']
type BuilderPage = 'door-style' | 'door-line' | 'door-grain' | 'finish' | 'glass' | 'hardware' | 'door-swing' | 'review'
const initialContact: ContactForm = { fullName: '', email: '', phone: '', zip: '' }
const emptyPreviewHardware: PreviewHardware = { color: '#191919', type: 'long' }
const signatureSeriesId = 'signature-series'
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
const HERO_DOOR_PRESETS = [
  ['S', 'signature-series', 'paint-positive-red', 'grace-nickel', 'Century Trim with Latitude Lever', 'Matte Black'],
  ['F', 'signature-series', 'stain-toasted-caramel', 'heirlooms-nickel', 'Camelot Handleset', 'Satin Nickel'],
  ['CR14', 'signature-series', 'stain-natural-gold', 'oak-park', 'Plymouth Handleset', 'Bright Brass'],
  ['S', 'signature-series', 'stain-black-cherry', 'rain', 'Camelot Handleset', 'Matte Black'],
  ['F', 'signature-series', 'stain-auburn', 'linen', 'Plymouth Handleset', 'Satin Nickel'],
  ['5LT', '22-gauge-steel', 'stain-french-roast', 'chinchilla', 'Latitude Lever with Deadbolt', 'Satin Nickel'],
  ['F848', 'textured-fiberglass', 'stain-nutmeg', 'berkley', 'Century Handleset', 'Matte Black'],
  ['FO', '20-gauge-smooth-steel', 'paint-black', 'cadence', 'Camelot Handleset', 'Satin Nickel'],
  ['S836', '20-gauge-smooth-steel', 'paint-white', 'rain', 'Plymouth Handleset', 'Matte Black'],
  ['3LT', '20-gauge-smooth-steel', 'paint-navy', 'frosted', 'Century Trim with Latitude Lever', 'Satin Nickel'],
  ['4LT', '20-gauge-smooth-steel', 'paint-coastal-plain', 'clear', 'Camelot Handleset', 'Bright Brass'],
  ['SW', 'textured-fiberglass', 'stain-harvest-wheat', 'renewed-impressions', 'Plymouth Handleset', 'Satin Nickel'],
  ['2PNGSS', 'signature-series', 'stain-french-roast', null, 'Camelot Handleset', 'Matte Black'],
  ['S1', '20-gauge-smooth-steel', 'paint-desert-tan', null, 'Century Trim with Latitude Lever', 'Satin Nickel'],
  ['F', 'signature-series', 'stain-french-roast', 'rain', 'Latitude Lever with Deadbolt', 'Satin Nickel'],
  ['S', 'signature-series', 'stain-natural-gold', 'clear', 'Camelot Handleset', 'Bright Brass'],
  ['CR14', 'signature-series', 'stain-toasted-caramel', 'linen', 'Century Trim with Latitude Lever', 'Matte Black'],
  ['F848', 'textured-fiberglass', 'stain-auburn', 'clear', 'Plymouth Handleset', 'Satin Nickel'],
  ['S1', 'textured-fiberglass', 'stain-nutmeg', null, 'Century Handleset', 'Satin Nickel'],
  ['SAT', '22-gauge-steel', 'stain-toasted-caramel', 'rain', 'Camelot Handleset', 'Matte Black'],
  ['N', 'textured-fiberglass', 'stain-nutmeg', 'nouveau-nickel', 'Century Handleset', 'Satin Nickel'],
  ['SO2', 'signature-series', 'stain-black-cherry', 'cadence', 'Plymouth Handleset', 'Bright Brass'],
  ['FRT', '22-gauge-steel', 'stain-auburn', 'clear', 'Camelot Handleset', 'Satin Nickel'],
  ['SHAK2', '22-gauge-steel', 'stain-natural-gold', null, 'Century Trim with Latitude Lever', 'Matte Black'],
] as const
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
  const [glassId, setGlassId] = useState('')
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
    ? glassOptions.filter((option) => selectedStyleCodes.some((code) => Boolean(option.overlaysByDoorStyle[code])))
    : []
  const supportsGlass = Boolean(compatibilitySupportsGlass && availableGlass.some((option) => option.id !== 'clear'))
  const steps = supportsGlass ? glassSteps : noGlassSteps
  const selectedGlass = supportsGlass ? glass : null
  const clearOnlyGlass = !supportsGlass && compatibilitySupportsGlass
    ? availableGlass.find((option) => option.id === 'clear') ?? null
    : null
  const configuredGlass = supportsGlass ? selectedGlass : clearOnlyGlass
  const doorStyleDefaultGlass = selectedStyleCodes.includes('HRT')
    ? availableGlass.find((option) => option.id === 'clear') ?? null
    : null
  const previewGlass = supportsGlass ? glass ?? doorStyleDefaultGlass : selectedHardware ? clearOnlyGlass : null
  const glassOptionGroups = [...availableGlass.reduce((groups, option) => {
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
    ...(supportsGlass ? ['glass' as const] : []),
    'hardware',
    'door-swing',
    'review',
  ]
  const currentPage = pages[step] ?? pages[pages.length - 1]
  const currentStep = currentPage === 'door-style' || currentPage === 'door-line' || currentPage === 'door-grain'
    ? 'Door Style'
    : currentPage === 'finish'
      ? 'Finish'
      : currentPage === 'glass'
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
  const demoFinishById = (id: string) => finishes.find((item) => item.id === id) ?? finishes[0]
  const demoGlassById = (id: string) => glassOptions.find((item) => item.id === id) ?? null
  const demoHardwareBySelection = (styleName: string, finishName: string) =>
    hardwareOptions.find((item) => item.manufacturer === 'Schlage' && item.style === styleName && item.finish === finishName)
    ?? hardwareOptions.find((item) => item.manufacturer === 'Schlage')
    ?? hardwareOptions[0]
  const buildHomeDemo = (styleCode: string, doorLineChoiceId: string, finishChoiceId: string, glassChoiceId: string | null, hardwareStyle: string, hardwareFinish: string) => {
    const demoStyle = demoStyleByCode(styleCode)
    const demoDoorLine = doorLineChoicesForStyle(demoStyle).find((item) => item.id === doorLineChoiceId) ?? doorLineChoicesForStyle(demoStyle)[0]
    const demoGrain = demoDoorLine ? autoGrainForDoorLine(demoStyle, demoDoorLine.id) : null
    const compatibleFinishes = demoDoorLine ? finishesForStyle(demoStyle, finishes, demoDoorLine.id, demoGrain) : finishes
    const requestedFinish = demoFinishById(finishChoiceId)
    const demoFinish = compatibleFinishes.find((item) => item.id === requestedFinish.id)
      ?? compatibleFinishes.find((item) => item.finishType === requestedFinish.finishType)
      ?? compatibleFinishes[0]
      ?? requestedFinish
    const demoProduct = resolveDoorProduct(demoStyle, demoFinish, demoGrain ?? undefined, demoDoorLine?.id)
    const isGlassCapable = demoProduct.styleCodes.some((code) => glassDoorCodes.has(code))
    const compatibleGlass = glassOptions.filter((option) => demoProduct.styleCodes.some((code) => option.overlaysByDoorStyle[code]))
    const requestedGlass = glassChoiceId ? demoGlassById(glassChoiceId) : null
    const demoGlass = isGlassCapable
      ? requestedGlass && compatibleGlass.some((option) => option.id === requestedGlass.id)
        ? requestedGlass
        : compatibleGlass.find((option) => option.id === 'clear') ?? compatibleGlass[0] ?? null
      : null
    const demoHardware = demoHardwareBySelection(hardwareStyle, hardwareFinish)

    if (import.meta.env.DEV && (!demoFinish?.color || !demoHardware || (isGlassCapable && !demoGlass))) {
      console.warn('[hero-door-preset:incomplete]', {
        styleCode,
        doorLineChoiceId,
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
  const homeDemoConfigurations = HERO_DOOR_PRESETS.map(([styleCode, doorLineId, finishId, glassId, hardwareStyle, hardwareFinish]) =>
    buildHomeDemo(styleCode, doorLineId, finishId, glassId, hardwareStyle, hardwareFinish),
  )
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
    if (glassId && (!supportsGlass || !availableGlass.some((item) => item.id === glassId))) setGlassId('')
    if (step >= pages.length) setStep(pages.length - 1)
  }, [styleId, doorLineId, grainId, availableDoorLineIds, isSignatureDoorLine, selectedDoorLineLineIdsKey, needsGrainStep, effectiveFinishTypes, selectedFinishType, finishId, availableFinishIds, glassId, availableGlassIds, supportsGlass, step, pages.length])

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

  const selectDoorStyle = (nextStyleId: string) => {
    const nextStyle = doorStyles.find((item) => item.id === nextStyleId)
    if (!nextStyle) return
    if (nextStyleId !== styleId) {
      setStyleId(nextStyleId)
      setDoorLineId('')
      setGrainId('')
      if (styleCodesForGlass(nextStyle).includes('SW')) setGlassId('')
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
    setGlassId('')
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
          : targetStep === 'Glass' ? page === 'glass'
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
    if (!availableGlass.some((item) => item.id === nextGlassId)) return
    if (nextGlassId !== glassId) setGlassId(nextGlassId)
    if (availableGlass.length === 1) goTo(step + 1)
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
      const attachment = await generateSummaryAttachment(contact, product, style, selectedGrain, finish, configuredGlass, selectedHardware, selectedDoorSwing)
      const result = await submitQuote({ configuration: { product, style, grain: selectedGrain, finish, glass: configuredGlass, hardware: selectedHardware, doorSwing: selectedDoorSwing }, contact, attachment, submittedAt: new Date().toISOString() })
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
    await downloadSummary(contact, product, style, selectedGrain, finish, configuredGlass, selectedHardware, selectedDoorSwing)
  }

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
          const targetPage = pages.findIndex((page) => label === 'Door Style' ? page === 'door-style' : label === 'Finish' ? page === 'finish' : label === 'Glass' ? page === 'glass' : label === 'Hardware' ? page === 'hardware' : page === 'review')
          return <button key={label} className={`${index === activeMainStepIndex ? 'active' : ''} ${index < activeMainStepIndex ? 'done' : ''}`} disabled={!isReachable} aria-current={index === activeMainStepIndex ? 'step' : undefined} onClick={() => isReachable && goTo(targetPage)}><span>{index < activeMainStepIndex ? <Check size={13} /> : index + 1}</span><em>{label}</em></button>
        })}
      </nav>
      <main>
        {currentStep !== 'Review & Quote' && <div className="mobile-live-preview">{selectedStyle ? <DoorPreview style={style} finish={previewConfig.finish} glass={previewConfig.glass} hardware={previewConfig.hardware} product={product} tintColor={previewConfig.tintColor} doorSwing={previewConfig.doorSwing} applyFinish={previewConfig.applyFinish} /> : <EmptyDoorPreview />}</div>}
        <section ref={builderPanelRef} className={`builder-panel ${currentStep !== 'Review & Quote' ? 'configuration-step' : 'review-step'}`}>
          {currentStep !== 'Review & Quote' && <>
            <div className="section-heading step-heading">
              <div className="step-heading-copy">
                <div className="step-label-row">
                  <span>Step {activeMainStepIndex + 1} of {steps.length}</span>
                </div>
                <div className="step-title-row">
                  <h1>{currentPage === 'door-style' ? 'Choose a Door Style' : currentPage === 'door-line' ? 'Choose Your Door Line' : currentPage === 'door-grain' ? 'Choose Your Door Grain' : currentPage === 'finish' ? 'Choose Your Finish' : currentPage === 'glass' ? 'Choose Your Glass' : currentPage === 'hardware' ? 'Choose Your Hardware' : 'Choose Your Door Swing'}</h1>
                  <div className="section-resets">
                    {currentPage === 'door-style' && <button type="button" aria-label="Reset Design" onClick={resetDesign}><RotateCcw size={20} /><span>Reset Design</span></button>}
                  </div>
                </div>
                <p>{currentPage === 'door-style' ? 'Browse all available door styles and choose the one that feels right for your home.' : currentPage === 'door-line' ? 'Choose the compatible material line for this door style.' : currentPage === 'door-grain' ? 'Choose the Signature Series grain for this door.' : currentPage === 'finish' ? 'Pick from the valid paint or stain finishes.' : currentPage === 'glass' ? 'Balance natural light, privacy, and personality.' : currentPage === 'hardware' ? 'Complete your entry with hardware.' : 'Choose the direction your door will swing when viewed from the outside.'}</p>
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
              <div className={`options-grid step-${step} ${currentPage === 'door-style' || currentPage === 'door-grain' || currentPage === 'finish' ? 'door-style-grid' : ''}`}>
                {currentPage === 'door-style' && doorStyles.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.eyebrow} selected={styleId === item.id} onClick={() => selectDoorStyle(item.id)} visual={<DoorStyleThumbnail style={item} />} badge={item.variants.some((variant) => variant.lineId.startsWith('signature-')) ? <img src="/assets/branding/signature-series-logo.png" alt="Available in Signature Series" loading="lazy" decoding="async" /> : undefined} />)}
                {currentPage === 'door-line' && availableDoorLines.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow="Door Line" selected={doorLineId === item.id} onClick={() => selectDoorLine(item.id)} visual={<span className="door-line-card-image"><img src={item.image} alt="" loading="lazy" decoding="async" /></span>} />)}
                {currentPage === 'door-grain' && signatureGrainOptions.map((item) => <OptionCard key={item.id} title={item.name} eyebrow="Signature grain" selected={selectedGrain === item.id} onClick={() => selectGrain(item.id)} visual={<img className="grain-card-image" src={item.image} alt="" loading="lazy" decoding="async" />} />)}
                {currentPage === 'finish' && visibleFinishes.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.finishType} selected={finishId === item.id} onClick={() => selectFinish(item.id, item.finishType)} visual={<span className="finish-tile-wrap" style={{ '--fallback-finish': item.color } as CSSProperties}><img className="finish-tile-image" src={item.image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} /></span>} />)}
                {currentPage === 'glass' && glassOptionGroups.map((group) => <GlassOptionCard group={group} selectedId={glassId} onSelect={(item) => selectGlass(item.id)} key={group.key} />)}
                {currentPage === 'hardware' && hardwareStyleGroups.map((options) => <HardwareOptionCard key={`${options[0].manufacturer}-${options[0].style}`} options={options} selectedId={hardwareId} onSelect={(option) => selectHardware(option.id)} />)}
                {currentPage === 'door-swing' && doorSwingOptions.map((item) => <OptionCard key={item.id} title={`${item.id} – ${item.name}`} eyebrow="Door swing" selected={doorSwingId === item.id} onClick={() => selectDoorSwing(item.id)} visual={<img className="door-swing-image" src={item.image} alt="" loading="lazy" decoding="async" />} />)}
              </div>
            </div>
          </>}

          {currentPage === 'review' && !submitted && <>
            <div className="section-heading review-heading"><span>Final step</span><h1>Find a Home Guard Dealer</h1><p>Submit your contact information and door configuration. A Home Guard dealer or team member will follow up with next steps.</p></div>
            <div className="mobile-review-preview"><DoorPreview style={style} finish={previewConfig.finish} glass={previewConfig.glass} hardware={previewConfig.hardware} product={product} tintColor={previewConfig.tintColor} doorSwing={previewConfig.doorSwing} applyFinish={previewConfig.applyFinish} /></div>
            <div className="summary-card">
              <div className="summary-title"><h2>Configuration Summary</h2></div>
              {[['Door style', style.name, pages.indexOf('door-style')], ['Door Line', selectedDoorLine?.name ?? product.doorType, pages.indexOf('door-line')], ...(selectedGrain ? [['Grain', selectedGrain, pages.indexOf('door-grain')]] : []), ['Finish type', selectedFinishType === 'stain' ? 'Stain' : 'Paint', pages.indexOf('finish')], [finish.finishType === 'paint' ? 'Finish color' : 'Stain color', finish.name, pages.indexOf('finish')], ...(compatibilitySupportsGlass ? [['Glass', configuredGlass?.name ?? 'Clear', pages.indexOf('glass')]] : []), ['Hardware', hardwareDisplayName(selectedHardware!), pages.indexOf('hardware')], ['Door swing', selectedDoorSwing?.name ?? 'Not selected', pages.indexOf('door-swing')]].map(([label, value, target]) => <div className="summary-row" key={String(label)}><span>{label}<strong>{value}</strong></span>{Number(target) >= 0 && <button onClick={() => goTo(Number(target))}>Edit</button>}</div>)}
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

          {currentPage !== 'review' && <div className="builder-actions"><button className="back" disabled={step === 0} onClick={() => goTo(step - 1)}><ArrowLeft size={17} /> Previous</button><button className="next" disabled={(currentPage === 'door-style' && !selectedStyle) || (currentPage === 'door-line' && !selectedDoorLine) || (currentPage === 'door-grain' && !selectedGrain) || (currentPage === 'finish' && !visibleSelectedFinish) || (currentPage === 'glass' && availableGlass.length > 0 && !selectedGlass) || (currentPage === 'hardware' && !selectedHardware) || (currentPage === 'door-swing' && !selectedDoorSwing)} onClick={() => goTo(step + 1)}>Next <ArrowRight size={17} /></button></div>}
        </section>

        {!submitted && <aside>
          <div className="aside-top">
            <span>Your design</span>
            {selectedStyle && <div className="preview-view-toggle" role="group" aria-label="Preview view">
              {(['Exterior', 'Interior'] as const).map((view) => <button type="button" className={builderPreviewView === view ? 'active' : ''} aria-pressed={builderPreviewView === view} key={view} onClick={() => setBuilderPreviewView(view)}>{view}</button>)}
            </div>}
          </div>
          <div className="aside-preview-area">
            {selectedStyle ? <DoorPreview style={style} finish={previewConfig.finish} glass={previewConfig.glass} hardware={previewConfig.hardware} product={product} tintColor={previewConfig.tintColor} doorSwing={previewConfig.doorSwing} applyFinish={previewConfig.applyFinish} view={builderPreviewView} onViewChange={setBuilderPreviewView} showViewToggle={false} /> : <EmptyDoorPreview />}
          </div>
          <div className="mini-summary">
            <span><b>Door style</b><strong>{selectedStyle?.name ?? 'Not selected'}</strong></span>
            <span><b>Door Line</b><strong>{selectedDoorLine?.name ?? 'Not selected'}</strong></span>
            {selectedGrain && <span><b>Grain</b><strong>{selectedGrain}</strong></span>}
            <span><b>Paint or stain</b><strong>{selectedStyle ? (activeFinishType === 'paint' ? 'Paint' : 'Stain') : 'Not selected'}</strong></span>
            <span><b>Finish</b><strong>{selectedFinish?.name ?? 'Not selected'}</strong></span>
            <span><b>Glass</b><strong>{compatibilitySupportsGlass ? (configuredGlass?.name ?? 'Clear') : 'Not applicable'}</strong></span>
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
