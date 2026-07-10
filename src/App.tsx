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
import { autoGrainForDoorLine, doorLineChoicesForStyle, doorStyleSupportsGlass, finishesForStyle, finishTypesForDoorLine, resolveDoorProduct } from './data/productCatalog'
import type { ContactForm, DoorSwing, GlassOption, PreviewHardware } from './types'
import { configurationPdfName } from './utils/pdfConfig'
import { submitQuote, type SubmissionResult } from './utils/submission'

const glassSteps = ['Door Style', 'Finish', 'Glass', 'Hardware', 'Review & Quote']
const noGlassSteps = ['Door Style', 'Finish', 'Hardware', 'Review & Quote']
const initialContact: ContactForm = { fullName: '', email: '', phone: '', zip: '' }
const emptyPreviewHardware: PreviewHardware = { color: '#191919', type: 'long' }
const signatureSeriesId = 'signature-series'
const HERO_DOOR_OPENING = {
  leftPct: 44.85,
  topPct: 49.85,
  widthPct: 9.25,
  heightPct: 38.1,
} as const
const heroDoorOpeningStyle = {
  left: `${HERO_DOOR_OPENING.leftPct}%`,
  top: `${HERO_DOOR_OPENING.topPct}%`,
  width: `${HERO_DOOR_OPENING.widthPct}%`,
  height: `${HERO_DOOR_OPENING.heightPct}%`,
} as CSSProperties
const grainThumbnails: Record<string, string> = {
  Cherry: '/assets/door-lines/grains/cherry.jpg',
  Fir: '/assets/door-lines/grains/fir.jpg',
  Mahogany: '/assets/door-lines/grains/mahogany.jpg',
  Oak: '/assets/door-lines/grains/oak.jpg',
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
const fixedGlassPreviewCodes = new Set(['5LT', 'F764', 'FRT', 'HRT', 'N', 'S2', 'S3', 'S4', 'SAT'])
const includedGlassOption: GlassOption = {
  id: 'included-glass',
  name: 'Included clear glass',
  thumbnailPath: '',
  overlaysByDoorStyle: {},
}
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
  const [finishId, setFinishId] = useState('')
  const [finishTab, setFinishTab] = useState<'paint' | 'stain'>('paint')
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
  const builderPanelRef = useRef<HTMLElement | null>(null)
  const builderOptionsRef = useRef<HTMLDivElement | null>(null)
  const advanceTimerRef = useRef<number | null>(null)

  const selectedStyle = doorStyles.find((item) => item.id === styleId)
  const style = selectedStyle ?? doorStyles[0]
  const availableDoorLines = selectedStyle ? doorLineChoicesForStyle(style) : []
  const availableDoorLineIds = availableDoorLines.map((item) => item.id).join('|')
  const selectedDoorLine = availableDoorLines.find((item) => item.id === doorLineId)
  const supportsGlass = selectedStyle && selectedDoorLine
    ? doorStyleSupportsGlass(selectedStyle, selectedDoorLine.id)
    : Boolean(selectedStyle?.hasGlass)
  const steps = supportsGlass && glassOptions.length ? glassSteps : noGlassSteps
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
  const effectiveFinishTypes = selectedDoorLine ? compatibleFinishTypes.filter((type) => materialFinishTypes.includes(type)) : []
  const activeFinishType = effectiveFinishTypes.includes(finishTab) ? finishTab : effectiveFinishTypes[0] ?? 'paint'
  const visibleFinishes = availableFinishes.filter((item) => item.finishType === activeFinishType)
  const selectedFinish = visibleFinishes.find((item) => item.id === finishId)
  const finish = selectedFinish ?? visibleFinishes[0] ?? availableFinishes[0] ?? finishes[0]
  const glass = glassOptions.find((item) => item.id === glassId) ?? null
  const selectedHardware = hardwareOptions.find((item) => item.id === hardwareId)
  const hardware = selectedHardware ?? emptyPreviewHardware
  const selectedDoorSwing = doorSwingOptions.find((item) => item.id === doorSwingId)
  const selectedStyleCodes = selectedStyle ? styleCodesForGlass(selectedStyle) : []
  const hasFixedGlassPreview = selectedStyleCodes.some((code) => fixedGlassPreviewCodes.has(code))
  const selectedGlass = supportsGlass ? hasFixedGlassPreview ? includedGlassOption : glass : null
  // Overlay mappings control the door preview, not whether an option is selectable.
  const availableGlass = selectedStyle && supportsGlass ? glassOptions : []
  const glassOptionGroups = [...availableGlass.reduce((groups, option) => {
    const key = glassGroupKey(option)
    const group = groups.get(key) ?? { key, title: glassGroupTitle(option), options: [] }
    group.options.push(option)
    groups.set(key, group)
    return groups
  }, new Map<string, GlassOptionGroup>()).values()]
  const availableGlassIds = availableGlass.map((item) => item.id).join('|')
  const currentStep = steps[step] ?? steps[steps.length - 1]
  const product = resolveDoorProduct(style, finish, selectedGrain ?? undefined, selectedDoorLine?.id)
  const previewTintColor = selectedFinish ? finish.color : null
  const demoStyleByCode = (code: string) => doorStyles.find((item) => item.code === code || item.variants.some((variant) => variant.code === code)) ?? doorStyles[0]
  const demoFinishById = (id: string) => finishes.find((item) => item.id === id) ?? finishes[0]
  const demoGlassById = (id: string) => glassOptions.find((item) => item.id === id) ?? null
  const demoHardwareBySelection = (styleName: string, finishName: string) =>
    hardwareOptions.find((item) => item.manufacturer === 'Schlage' && item.style === styleName && item.finish === finishName)
    ?? hardwareOptions.find((item) => item.manufacturer === 'Schlage')
    ?? hardwareOptions[0]
  const buildHomeDemo = (styleCode: string, doorLineChoiceId: string, finishChoiceId: string, glassChoiceId: string, hardwareStyle: string, hardwareFinish: string) => {
    const demoStyle = demoStyleByCode(styleCode)
    const demoFinish = demoFinishById(finishChoiceId)
    const demoDoorLine = doorLineChoicesForStyle(demoStyle).find((item) => item.id === doorLineChoiceId) ?? doorLineChoicesForStyle(demoStyle)[0]
    const demoGrain = demoDoorLine ? autoGrainForDoorLine(demoStyle, demoDoorLine.id) : null
    const demoProduct = resolveDoorProduct(demoStyle, demoFinish, demoGrain ?? undefined, demoDoorLine?.id)
    return {
      style: demoStyle,
      finish: demoFinish,
      glass: demoGlassById(glassChoiceId),
      hardware: demoHardwareBySelection(hardwareStyle, hardwareFinish),
      grain: demoGrain,
      product: demoProduct,
    }
  }
  const homeDemoConfigurations = [
    buildHomeDemo('F482', 'signature-series', 'paint-positive-red', 'grace-nickel', 'Century Trim with Latitude Lever', 'Matte Black'),
    buildHomeDemo('5LT', '22-gauge-steel', 'paint-navy', 'rain', 'Latitude Lever with Deadbolt', 'Satin Nickel'),
    buildHomeDemo('CR14PL', 'signature-series', 'stain-natural-gold', 'oak-park', 'Plymouth Handleset', 'Bright Brass'),
    buildHomeDemo('CA', 'signature-series', 'stain-toasted-caramel', 'heirlooms-nickel', 'Camelot Handleset', 'Satin Nickel'),
  ]
  const activeHomeDemo = homeDemoConfigurations[homeDemoIndex % homeDemoConfigurations.length]

  useEffect(() => {
    if (doorLineId && !availableDoorLines.some((item) => item.id === doorLineId)) {
      setDoorLineId('')
      setGrainId('')
      setFinishId('')
      setFinishTab('paint')
    }
    if (grainId && !isSignatureDoorLine) setGrainId('')
    if (grainId && needsGrainStep && !signatureGrainOptions.some((item) => item.id === grainId)) {
      setGrainId('')
      setFinishId('')
    }
    if (effectiveFinishTypes.length && !effectiveFinishTypes.includes(finishTab)) setFinishTab(effectiveFinishTypes[0])
    if (glassId && !availableGlass.some((item) => item.id === glassId)) setGlassId('')
    if (step >= steps.length) setStep(steps.length - 1)
  }, [styleId, doorLineId, grainId, availableDoorLineIds, isSignatureDoorLine, selectedDoorLineLineIdsKey, needsGrainStep, effectiveFinishTypes, finishTab, glassId, availableGlassIds, step, steps.length])

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
  }, [screen, currentStep, styleId, doorLineId, grainId, finishId, glassId, hardwareId, doorSwingId])

  useEffect(() => {
    if (screen !== 'home') return
    const timer = window.setInterval(() => {
      setHomeDemoIndex((current) => (current + 1) % homeDemoConfigurations.length)
    }, 1800)
    return () => window.clearInterval(timer)
  }, [screen, homeDemoConfigurations.length])

  useEffect(() => () => {
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current)
  }, [])

  const goTo = (next: number) => {
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = null
    setStep(next)
  }

  const advanceAfterSelection = (target: number) => {
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null
      setStep(target)
    }, 200)
  }

  const resetStyle = () => {
    setStyleId('')
    setDoorLineId('')
    setGrainId('')
    setFinishId('')
    setFinishTab('paint')
    goTo(0)
  }

  const selectDoorStyle = (nextStyleId: string) => {
    if (nextStyleId === styleId || !doorStyles.some((item) => item.id === nextStyleId)) return
    setStyleId(nextStyleId)
    setDoorLineId('')
    setGrainId('')
    setFinishId('')
    setFinishTab('paint')
  }

  const resetFinish = () => {
    setDoorLineId('')
    setGrainId('')
    setFinishId('')
    setFinishTab('paint')
  }

  const startOver = () => {
    setStyleId('')
    setDoorLineId('')
    setGrainId('')
    setFinishId('')
    setFinishTab('paint')
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

  const canVisitStep = (target: number) => {
    const targetStep = steps[target]
    if (!targetStep) return false
    if (targetStep === 'Door Style') return true
    if (!selectedStyle || !selectedDoorLine || (needsGrainStep && !selectedGrain)) return false
    if (targetStep === 'Finish') return true
    if (!selectedFinish) return false
    if (targetStep === 'Glass') return true
    if (targetStep === 'Hardware') return !availableGlass.length || Boolean(selectedGlass)
    if (targetStep !== 'Review & Quote') return true
    return Boolean(selectedDoorLine && selectedFinish && selectedHardware && selectedDoorSwing && (!availableGlass.length || selectedGlass))
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
    setFinishTab(nextTab)
    if (selectedFinish?.finishType !== nextTab) setFinishId('')
  }

  const selectDoorLine = (nextDoorLineId: string) => {
    if (nextDoorLineId === doorLineId || !availableDoorLines.some((item) => item.id === nextDoorLineId)) return
    const nextNeedsGrain = nextDoorLineId === signatureSeriesId
    const nextGrain = nextNeedsGrain ? undefined : autoGrainForDoorLine(style, nextDoorLineId)
    const nextFinishes = nextNeedsGrain ? [] : finishesForStyle(style, finishes, nextDoorLineId, nextGrain)
    const nextMaterialTypes = finishTypesForDoorLine(style, nextDoorLineId)
    const nextTypes = (['paint', 'stain'] as const).filter((type) =>
      nextMaterialTypes.includes(type) && (nextNeedsGrain || nextFinishes.some((item) => item.finishType === type)),
    )
    setDoorLineId(nextDoorLineId)
    setGrainId('')
    setFinishId('')
    setFinishTab(nextTypes[0] ?? nextMaterialTypes[0] ?? 'paint')
    if (!nextNeedsGrain) advanceAfterSelection(steps.indexOf('Finish'))
  }

  const selectGrain = (nextGrain: string) => {
    if (nextGrain === grainId || !signatureGrainOptions.some((item) => item.id === nextGrain)) return
    const nextFinishes = finishesForStyle(style, finishes, doorLineId, nextGrain)
    const nextMaterialTypes = finishTypesForDoorLine(style, doorLineId)
    const nextTypes = (['paint', 'stain'] as const).filter((type) =>
      nextMaterialTypes.includes(type) && nextFinishes.some((item) => item.finishType === type),
    )
    setGrainId(nextGrain)
    setFinishId('')
    setFinishTab(nextTypes[0] ?? 'paint')
    advanceAfterSelection(steps.indexOf('Finish'))
  }

  const selectFinish = (nextFinishId: string, nextFinishType: 'paint' | 'stain') => {
    if (nextFinishId === finishId || !visibleFinishes.some((item) => item.id === nextFinishId)) return
    setFinishId(nextFinishId)
    setFinishTab(nextFinishType)
    advanceAfterSelection(steps.indexOf('Glass') >= 0 ? steps.indexOf('Glass') : steps.indexOf('Hardware'))
  }

  const selectGlass = (nextGlassId: string) => {
    if (nextGlassId === glassId || !availableGlass.some((item) => item.id === nextGlassId)) return
    setGlassId(nextGlassId)
    advanceAfterSelection(steps.indexOf('Hardware'))
  }

  const selectHardware = (nextHardwareId: string) => {
    if (nextHardwareId === hardwareId || !hardwareOptions.some((item) => item.id === nextHardwareId)) return
    setHardwareId(nextHardwareId)
    if (selectedDoorSwing) advanceAfterSelection(steps.indexOf('Review & Quote'))
  }

  const selectDoorSwing = (nextDoorSwingId: string) => {
    if (nextDoorSwingId === doorSwingId || !doorSwingOptions.some((item) => item.id === nextDoorSwingId)) return
    setDoorSwingId(nextDoorSwingId)
    if (selectedHardware) advanceAfterSelection(steps.indexOf('Review & Quote'))
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
      const attachment = await generateSummaryAttachment(contact, product, style, selectedGrain, finish, style.hasGlass ? selectedGlass : null, selectedHardware, selectedDoorSwing)
      const result = await submitQuote({ configuration: { product, style, grain: selectedGrain, finish, glass: style.hasGlass ? selectedGlass : null, hardware: selectedHardware, doorSwing: selectedDoorSwing }, contact, attachment, submittedAt: new Date().toISOString() })
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
    await downloadSummary(contact, product, style, selectedGrain, finish, style.hasGlass ? selectedGlass : null, selectedHardware, selectedDoorSwing)
  }

  return (
    <div className={`app ${screen === 'home' ? 'home-app' : ''}`}>
      <header>
        <div className="brand">
          <img src="/assets/branding/hgi-logo-black.png" alt="Home Guard Industries Doors and Windows" />
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
            <div className="home-entryway-demo" aria-label="Animated examples of configurable entry doors">
              <img className="home-entryway-image" src="/assets/hero/hero-door.png" alt="Modern home entryway with a customizable door preview" />
              <div className="home-entryway-overlay" aria-hidden="true">
                <div className="home-entryway-door-slot" style={heroDoorOpeningStyle}>
                  {homeDemoConfigurations.map((demo, index) => (
                    <div className={`home-demo-door-layer ${index === homeDemoIndex % homeDemoConfigurations.length ? 'active' : ''}`} key={`${demo.style.code}-${demo.finish.id}-${demo.glass?.id ?? 'glass'}-${demo.hardware.id}`}>
                      <DoorPreview style={demo.style} finish={demo.finish} glass={demo.glass} hardware={demo.hardware} grain={demo.grain} product={demo.product} tintColor={demo.finish.color} compact />
                    </div>
                  ))}
                </div>
              </div>
              <div className="home-preview-label">
                <span>Preview as you build</span>
                <small>{activeHomeDemo.style.name} · {activeHomeDemo.finish.name} · {activeHomeDemo.glass?.name ?? 'Clear glass'}</small>
              </div>
            </div>
          </div>
        </section>
      </main> : <>
      <nav className="stepper" aria-label="Configuration progress">
        {steps.map((label, index) => {
          const isReachable = canVisitStep(index)
          return <button key={label} className={`${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`} disabled={!isReachable} aria-current={index === step ? 'step' : undefined} onClick={() => isReachable && goTo(index)}><span>{index < step ? <Check size={13} /> : index + 1}</span><em>{label}</em></button>
        })}
      </nav>
      <main>
        {currentStep !== 'Review & Quote' && <div className="mobile-live-preview">{selectedStyle ? <DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} product={product} tintColor={previewTintColor} doorSwing={selectedDoorSwing} /> : <EmptyDoorPreview />}</div>}
        <section ref={builderPanelRef} className={`builder-panel ${currentStep !== 'Review & Quote' ? 'configuration-step' : 'review-step'}`}>
          {currentStep !== 'Review & Quote' && <>
            <div className="section-heading">
              <span>Step {step + 1} of {steps.length}</span>
              <h1>{currentStep === 'Door Style' ? !selectedStyle ? 'Choose a Door Style' : !selectedDoorLine ? 'Choose Your Door Line' : needsGrainStep ? 'Choose Your Grain' : 'Choose a Door Style' : currentStep === 'Finish' ? 'Choose Your Finish' : currentStep === 'Glass' ? 'Choose Your Glass' : 'Choose Your Hardware'}</h1>
              <p>{currentStep === 'Door Style' ? !selectedStyle ? 'Browse all available door styles and choose the one that feels right for your home.' : !selectedDoorLine ? 'Choose the compatible material line for this door style.' : needsGrainStep ? 'Choose the Signature Series grain for this door.' : 'Browse all available door styles and choose the one that feels right for your home.' : currentStep === 'Finish' ? 'Pick from the valid paint or stain finishes.' : currentStep === 'Glass' ? 'Balance natural light, privacy, and personality.' : 'Complete your entry with hardware and door swing.'}</p>
              <div className="section-resets">
                {currentStep === 'Door Style' && selectedStyle && <button onClick={resetStyle}><RotateCcw size={14} /> Reset Style</button>}
                {currentStep === 'Finish' && <button onClick={resetFinish}><RotateCcw size={14} /> Reset Finish</button>}
                {currentStep === 'Hardware' && <button onClick={() => setHardwareId('')}><RotateCcw size={14} /> Reset Hardware</button>}
              </div>
            </div>
            <div ref={builderOptionsRef} className="builder-options-scroll">
              {currentStep === 'Finish' && selectedDoorLine && <div className="finish-toolbar">
                {effectiveFinishTypes.length > 1 && <div className="finish-tabs" role="tablist" aria-label="Finish type">{effectiveFinishTypes.map((type) => <button type="button" role="tab" aria-selected={activeFinishType === type} className={activeFinishType === type ? 'active' : ''} key={type} onClick={() => selectFinishTab(type)}>{type === 'paint' ? 'Paint' : 'Stain'}</button>)}</div>}
                <div className="finish-logo-slot">
                  {activeFinishType === 'paint' && <img src="/assets/branding/pro-match-logo.png" alt="Pro Match paint colors" loading="lazy" decoding="async" />}
                  {activeFinishType === 'stain' && <img src="/assets/branding/timberstain-logo.png" alt="TimberStain" loading="lazy" decoding="async" />}
                </div>
              </div>}
              <div className={`options-grid step-${step} ${currentStep === 'Door Style' && !selectedStyle ? 'door-style-grid' : ''}`}>
                {currentStep === 'Door Style' && !selectedStyle && doorStyles.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.eyebrow} selected={styleId === item.id} onClick={() => selectDoorStyle(item.id)} visual={<DoorStyleThumbnail style={item} />} badge={item.variants.some((variant) => variant.lineName === 'Signature Fiberglass Grained N/C') ? <img src="/assets/branding/signature-series-logo.png" alt="Available in Signature Series" loading="lazy" decoding="async" /> : undefined} />)}
                {currentStep === 'Door Style' && selectedStyle && !selectedDoorLine && availableDoorLines.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow="Door line / material" selected={doorLineId === item.id} onClick={() => selectDoorLine(item.id)} visual={<img className="door-line-card-image" src={item.image} alt="" loading="lazy" decoding="async" />} />)}
                {currentStep === 'Door Style' && selectedDoorLine && needsGrainStep && signatureGrainOptions.map((item) => <OptionCard key={item.id} title={item.name} eyebrow="Signature grain" selected={selectedGrain === item.id} onClick={() => selectGrain(item.id)} visual={<img className="grain-card-image" src={item.image} alt="" loading="lazy" decoding="async" />} />)}
                {currentStep === 'Finish' && visibleFinishes.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.finishType} selected={finishId === item.id} onClick={() => selectFinish(item.id, item.finishType)} visual={<span className="finish-tile-wrap" style={{ '--fallback-finish': item.color } as CSSProperties}><img className="finish-tile-image" src={item.image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none' }} /></span>} />)}
                {currentStep === 'Glass' && glassOptionGroups.map((group) => <GlassOptionCard group={group} selectedId={glassId} onSelect={(item) => selectGlass(item.id)} key={group.key} />)}
                {currentStep === 'Hardware' && hardwareStyleGroups.map((options) => <HardwareOptionCard key={`${options[0].manufacturer}-${options[0].style}`} options={options} selectedId={hardwareId} onSelect={(option) => selectHardware(option.id)} />)}
              </div>
              {currentStep === 'Hardware' && <div className="inline-swing-section">
                <div className="inline-swing-heading"><span>Door Swing</span><small>Choose the direction your door will swing when viewed from the outside.</small></div>
                <div className="options-grid door-swing-grid">
                  {doorSwingOptions.map((item) => <OptionCard key={item.id} title={`${item.id} – ${item.name}`} eyebrow="Door swing" selected={doorSwingId === item.id} onClick={() => selectDoorSwing(item.id)} visual={<img className="door-swing-image" src={item.image} alt="" loading="lazy" decoding="async" />} />)}
                </div>
              </div>}
            </div>
          </>}

          {currentStep === 'Review & Quote' && !submitted && <>
            <div className="section-heading review-heading"><span>Final step</span><h1>Find a Home Guard Dealer</h1><p>Submit your contact information and door configuration. A Home Guard dealer or team member will follow up with next steps.</p></div>
            <div className="mobile-review-preview"><DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} product={product} tintColor={previewTintColor} doorSwing={selectedDoorSwing} /></div>
            <div className="summary-card">
              <div className="summary-title"><h2>Configuration Summary</h2></div>
              {[['Door style', style.name, steps.indexOf('Door Style')], ['Door line / material', selectedDoorLine?.name ?? product.doorType, steps.indexOf('Door Style')], ...(selectedGrain ? [['Grain', selectedGrain, steps.indexOf('Door Style')]] : []), ['Finish type', finish.finishType === 'paint' ? 'Paint' : 'Stain', steps.indexOf('Finish')], [finish.finishType === 'paint' ? 'Finish color' : 'Stain color', finish.name, steps.indexOf('Finish')], ...(style.hasGlass ? [['Glass', selectedGlass?.name ?? 'Not selected', steps.indexOf('Glass')]] : []), ['Hardware', hardwareDisplayName(selectedHardware!), steps.indexOf('Hardware')], ['Door swing', selectedDoorSwing?.name ?? 'Not selected', steps.indexOf('Hardware')]].map(([label, value, target]) => <div className="summary-row" key={String(label)}><span>{label}<strong>{value}</strong></span>{Number(target) >= 0 && <button onClick={() => goTo(Number(target))}>Edit</button>}</div>)}
            </div>
            <div className="attachment-card">
              <span className="attachment-icon"><FileText size={25} /></span>
              <span className="attachment-copy"><strong>{configurationPdfName}</strong></span>
              <button onClick={downloadPdf}><Download size={16} /> Download PDF</button>
            </div>
            <div className="form-card">
              <h2>Your Contact Information</h2><p>We’ll use your ZIP code to help connect you with the right Home Guard dealer.</p>
              <QuoteForm values={contact} errors={errors} onChange={updateContact} />
              <label className="consent"><input type="checkbox" defaultChecked /> <span>I agree to be contacted about this door configuration.</span></label>
              {submitError && <p className="submit-error" role="alert">{submitError}</p>}
              <button className="submit-button" disabled={submitting} onClick={submit}><Send size={18} /> {submitting ? 'Preparing & Sending...' : 'Send My Door Configuration'}</button>
              <p className="privacy"><ShieldCheck size={15} /> Your information is kept private and never sold.</p>
            </div>
          </>}

          {submitted && <div className="success">
            <span><Check size={32} /></span><small>{submissionResult?.mode === 'demo' ? 'Demo complete' : 'Configuration sent'}</small><h1>Thanks, {contact.fullName}.</h1>
            <p>{submissionResult?.message}</p>
            <button onClick={downloadPdf}><Download size={17} /> Download Your Summary</button>
          </div>}

          {currentStep !== 'Review & Quote' && <div className="builder-actions"><button className="back" disabled={step === 0} onClick={() => goTo(step - 1)}><ArrowLeft size={17} /> Previous</button><button className="next" disabled={(currentStep === 'Door Style' && (!selectedStyle || !selectedDoorLine || (needsGrainStep && !selectedGrain))) || (currentStep === 'Finish' && !selectedFinish) || (currentStep === 'Glass' && availableGlass.length > 0 && !selectedGlass) || (currentStep === 'Hardware' && (!selectedHardware || !selectedDoorSwing))} onClick={() => goTo(step + 1)}>Next <ArrowRight size={17} /></button></div>}
        </section>

        {!submitted && <aside>
          <div className="aside-top"><span>Your design</span></div>
          {selectedStyle ? <DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} product={product} tintColor={previewTintColor} doorSwing={selectedDoorSwing} /> : <EmptyDoorPreview />}
          <div className="mini-summary"><strong>{selectedStyle?.name ?? 'Select a door style'}</strong><span>{selectedDoorLine ? `Material: ${selectedDoorLine.name}${selectedGrain ? ` / Grain: ${selectedGrain}` : ''}` : 'Material: Select in Finish step'}</span><span>{selectedStyle ? `${activeFinishType === 'paint' ? 'Paint' : 'Stain'}: ${selectedFinish?.name ?? ''}${style.hasGlass && selectedGlass ? ` / ${selectedGlass.name}` : ''}` : 'Finish: Select a style first'}</span><span>Hardware: {selectedHardware ? hardwareDisplayName(selectedHardware) : ''}</span><span>Door swing: {selectedDoorSwing?.name ?? ''}</span></div>
        </aside>}
      </main>
      </>}
      <footer><span>Copyright 2026 Home Guard Industries</span><span>Built for your home. Backed for years.</span></footer>
    </div>
  )
}
