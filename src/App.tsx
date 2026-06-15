import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Download, FileText, Home as HomeIcon, Phone, Send, ShieldCheck } from 'lucide-react'
import { DoorPreview } from './components/DoorPreview'
import { OptionCard } from './components/OptionCard'
import { QuoteForm } from './components/QuoteForm'
import { doorStyles, finishes, glassOptions } from './data/options'
import { hardwareDisplayName, hardwareFinishesForStyle, hardwareStyles, resolveHardwareOption } from './data/hardware'
import { finishesForStyle, resolveDoorProduct } from './data/productCatalog'
import type { ContactForm, HardwareFinishName, HardwareManufacturer, HardwareStyleName, PreviewHardware } from './types'
import { configurationPdfName, downloadSummary, generateSummaryAttachment } from './utils/pdf'
import { submitQuote, type SubmissionResult } from './utils/submission'

const glassSteps = ['Door Style', 'Finish', 'Glass', 'Hardware', 'Review & Quote']
const noGlassSteps = ['Door Style', 'Finish', 'Hardware', 'Review & Quote']
const initialContact: ContactForm = { fullName: '', email: '', phone: '', zip: '' }
const emptyPreviewHardware: PreviewHardware = { color: '#191919', type: 'long' }

export default function App() {
  const [screen, setScreen] = useState<'home' | 'builder'>('home')
  const [step, setStep] = useState(0)
  const [styleId, setStyleId] = useState(doorStyles[0].id)
  const [selectedGrain, setSelectedGrain] = useState('')
  const [finishId, setFinishId] = useState('')
  const [finishTab, setFinishTab] = useState<'paint' | 'stain'>('paint')
  const [glassId, setGlassId] = useState(glassOptions[0].id)
  const [hardwareManufacturer, setHardwareManufacturer] = useState<HardwareManufacturer | ''>('')
  const [hardwareStyle, setHardwareStyle] = useState<HardwareStyleName>('')
  const [hardwareFinish, setHardwareFinish] = useState<HardwareFinishName>('')
  const [contact, setContact] = useState(initialContact)
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null)

  const style = doorStyles.find((item) => item.id === styleId)!
  const availableFinishes = finishesForStyle(style, finishes)
  const selectedFinish = availableFinishes.find((item) => item.id === finishId)
  const finish = selectedFinish ?? availableFinishes[0]
  const availableFinishTypes = (['paint', 'stain'] as const).filter((type) => availableFinishes.some((item) => item.finishType === type))
  const visibleFinishes = availableFinishes.filter((item) => item.finishType === (availableFinishTypes.length > 1 ? finishTab : availableFinishTypes[0]))
  const availableGrains = [...new Set(style.variants.flatMap((variant) => variant.grains))]
  const glass = glassOptions.find((item) => item.id === glassId)!
  const availableHardwareFinishes = hardwareManufacturer ? hardwareFinishesForStyle(hardwareManufacturer, hardwareStyle) : []
  const selectedHardware = hardwareManufacturer ? resolveHardwareOption(hardwareManufacturer, hardwareStyle, hardwareFinish) : undefined
  const hardware = selectedHardware ?? emptyPreviewHardware
  const steps = style.hasGlass ? glassSteps : noGlassSteps
  const currentStep = steps[step] ?? steps[steps.length - 1]
  const availableGlass = glassOptions
  const product = resolveDoorProduct(style, finish, selectedGrain || undefined)

  useEffect(() => {
    setSelectedGrain(availableGrains.length === 1 ? availableGrains[0] : '')
    setFinishId('')
    setFinishTab(availableFinishTypes[0])
    if (step >= steps.length) setStep(steps.length - 1)
  }, [styleId])

  useEffect(() => {
    if (availableHardwareFinishes.some((item) => item.name === hardwareFinish)) return
    setHardwareFinish(availableHardwareFinishes.length === 1 ? availableHardwareFinishes[0].name : '')
  }, [hardwareManufacturer, hardwareStyle])

  const goTo = (next: number) => {
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      const attachment = await generateSummaryAttachment(contact, product, style, selectedGrain || null, finish, style.hasGlass ? glass : null, selectedHardware)
      const result = await submitQuote({ configuration: { product, style, grain: selectedGrain || null, finish, glass: style.hasGlass ? glass : null, hardware: selectedHardware }, contact, attachment, submittedAt: new Date().toISOString() })
      setSubmissionResult(result)
      setSubmitted(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`app ${screen === 'home' ? 'home-app' : ''}`}>
      <header>
        <div className="brand">
          <img src="/assets/branding/hgi-logo-black.png" alt="Home Guard Industries Doors and Windows" />
          <span className="app-name"><strong>Home Guard Door Builder</strong><small>Build your door. Download your order. Request a quote.</small></span>
        </div>
        <div className="header-actions">
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
            <div className="home-preview-label"><span>Preview as you build</span><small>Style. Finish. Glass. Hardware.</small></div>
            <DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} />
          </div>
        </section>
      </main> : <>
      <nav className="stepper" aria-label="Configuration progress">
        {steps.map((label, index) => <button key={label} className={`${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`} onClick={() => index <= step && goTo(index)}><span>{index < step ? <Check size={13} /> : index + 1}</span><em>{label}</em></button>)}
      </nav>
      <main>
        {currentStep !== 'Review & Quote' && <div className="mobile-live-preview"><DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} /></div>}
        <section className={`builder-panel ${currentStep !== 'Review & Quote' ? 'configuration-step' : 'review-step'}`}>
          {currentStep !== 'Review & Quote' && <>
            <div className="section-heading">
              <span>Step {step + 1} of {steps.length}</span>
              <h1>{currentStep === 'Door Style' ? 'Choose a Door Style' : currentStep === 'Finish' ? 'Choose Your Finish' : currentStep === 'Glass' ? 'Choose Your Glass' : 'Choose Your Hardware'}</h1>
              <p>{currentStep === 'Door Style' ? 'Start with a style that feels right for your home.' : currentStep === 'Finish' ? 'Choose from the paint and stain options available for this style.' : currentStep === 'Glass' ? 'Balance natural light, privacy, and personality.' : 'Complete your entry with the perfect finishing touch.'}</p>
            </div>
            <div className="builder-options-scroll">
              {currentStep === 'Finish' && availableGrains.length > 0 && <div className="grain-selector">
                <strong>Available Grain{availableGrains.length > 1 ? 's' : ''}:</strong>
                {availableGrains.length === 1 ? <span className="grain-label">{availableGrains[0]}</span> : availableGrains.map((grain) => <button type="button" className={selectedGrain === grain ? 'selected' : ''} key={grain} onClick={() => setSelectedGrain(grain)}>{grain}</button>)}
              </div>}
              {currentStep === 'Finish' && <div className="finish-toolbar">
                {availableFinishTypes.length > 1 && <div className="finish-tabs" role="tablist" aria-label="Finish type">{availableFinishTypes.map((type) => <button type="button" role="tab" aria-selected={finishTab === type} className={finishTab === type ? 'active' : ''} key={type} onClick={() => selectFinishTab(type)}>{type === 'paint' ? 'Paint' : 'Stain'}</button>)}</div>}
                <div className="finish-logo-slot">
                  {finishTab === 'paint' && <img src="/assets/branding/pro-match-logo.png" alt="Pro Match paint colors" />}
                  {finishTab === 'stain' && <img src="/assets/branding/timberstain-logo.png" alt="TimberStain" />}
                </div>
              </div>}
              <div className={`options-grid step-${step}`}>
                {currentStep === 'Door Style' && doorStyles.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.eyebrow} selected={styleId === item.id} onClick={() => setStyleId(item.id)} visual={<DoorPreview style={item} finish={finish} glass={glass} hardware={hardware} compact />} badge={item.variants.some((variant) => variant.lineName === 'Signature Series') ? <img src="/assets/branding/signature-series-logo.png" alt="Available in Signature Series" /> : undefined} />)}
                {currentStep === 'Finish' && visibleFinishes.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.finishType} selected={finishId === item.id} onClick={() => { setFinishId(item.id); setFinishTab(item.finishType) }} visual={<span className="finish-swatch" style={{ background: item.color }}><i style={{ background: item.accent }} /></span>} />)}
                {currentStep === 'Glass' && availableGlass.map((item) => <OptionCard key={item.id} title={item.name} selected={glassId === item.id} onClick={() => setGlassId(item.id)} visual={<span className="glass-swatch glass-clear" />} />)}
                {currentStep === 'Hardware' && <h2 className="hardware-group-heading">1. Style</h2>}
                {currentStep === 'Hardware' && hardwareStyles.map((item) => {
                  const validFinishes = hardwareFinishesForStyle(item.manufacturer, item.style)
                  const option = resolveHardwareOption(item.manufacturer, item.style, validFinishes[0].name)!
                  return <OptionCard key={item.id} title={item.style} eyebrow={item.manufacturer} selected={hardwareManufacturer === item.manufacturer && hardwareStyle === item.style} onClick={() => { setHardwareManufacturer(item.manufacturer); setHardwareStyle(item.style) }} visual={<span className="hardware-swatch" style={{ '--metal': option.color } as React.CSSProperties}><i /><b /></span>} />
                })}
                {currentStep === 'Hardware' && availableHardwareFinishes.length > 1 && <h2 className="hardware-group-heading">2. Finish</h2>}
                {currentStep === 'Hardware' && availableHardwareFinishes.length > 1 && availableHardwareFinishes.map((item) => <OptionCard key={item.name} title={item.name} eyebrow="Finish" selected={hardwareFinish === item.name} onClick={() => setHardwareFinish(item.name)} visual={<span className="finish-swatch" style={{ background: item.color }} />} />)}
              </div>
            </div>
          </>}

          {currentStep === 'Review & Quote' && !submitted && <>
            <div className="section-heading review-heading"><span>Final step</span><h1>Find a Home Guard Dealer</h1><p>Submit your contact information and door configuration. A Home Guard dealer or team member will follow up with next steps.</p></div>
            <div className="mobile-review-preview"><DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} /></div>
            <div className="summary-card">
              <div className="summary-title"><h2>Configuration Summary</h2></div>
              <div className="summary-row"><span>{product.doorTypeLabel}{product.doorTypes.map((doorType) => <strong key={doorType}>{doorType}</strong>)}</span></div>
              {[['Door style', style.name, steps.indexOf('Door Style')], ['Grain', selectedGrain || 'None', steps.indexOf('Finish')], ['Finish type', finish.finishType === 'paint' ? 'Paint' : 'Stain', steps.indexOf('Finish')], ['Finish color', finish.name, steps.indexOf('Finish')], ...(style.hasGlass ? [['Glass', glass.name, steps.indexOf('Glass')]] : []), ['Hardware', hardwareDisplayName(selectedHardware!), steps.indexOf('Hardware')], ['Hardware finish', selectedHardware!.finish, steps.indexOf('Hardware')]].map(([label, value, target]) => <div className="summary-row" key={String(label)}><span>{label}<strong>{value}</strong></span>{Number(target) >= 0 && <button onClick={() => goTo(Number(target))}>Edit</button>}</div>)}
            </div>
            <div className="attachment-card">
              <span className="attachment-icon"><FileText size={25} /></span>
              <span className="attachment-copy"><small>Attached Configuration PDF</small><strong>{configurationPdfName}</strong><em>{product.doorTypes.join(', ')} / {style.name} / {selectedGrain || 'No grain'} / {finish.name}{style.hasGlass ? ` / ${glass.name}` : ''} / {hardwareDisplayName(selectedHardware!)}</em><span>This file will be sent with your request.</span></span>
              <button onClick={() => downloadSummary(contact, product, style, selectedGrain || null, finish, style.hasGlass ? glass : null, selectedHardware!)}><Download size={16} /> Download PDF</button>
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
            <button onClick={() => downloadSummary(contact, product, style, selectedGrain || null, finish, style.hasGlass ? glass : null, selectedHardware!)}><Download size={17} /> Download Your Summary</button>
          </div>}

          {currentStep !== 'Review & Quote' && <div className="builder-actions"><button className="back" disabled={step === 0} onClick={() => goTo(step - 1)}><ArrowLeft size={17} /> Back</button><button className="next" disabled={(currentStep === 'Finish' && (!selectedFinish || (availableGrains.length > 1 && !selectedGrain))) || (currentStep === 'Hardware' && !hardwareFinish)} onClick={() => goTo(step + 1)}>{currentStep === 'Finish' && availableGrains.length > 1 && !selectedGrain ? 'Select a Grain' : currentStep === 'Finish' && !selectedFinish ? 'Select a Finish' : currentStep === 'Hardware' && !hardwareFinish ? 'Select a Finish' : `Continue to ${steps[step + 1]}`} <ArrowRight size={17} /></button></div>}
        </section>

        {!submitted && <aside>
          <div className="aside-top"><span>Your design</span><small>Updates as you build</small></div>
          <DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} />
          <div className="mini-summary"><strong>{style.name}</strong><span>{selectedFinish && (availableGrains.length < 2 || selectedGrain) ? `${product.doorTypeLabel}: ${product.doorTypes.join(', ')}` : 'Door type: Complete finish selections'}</span><span>Grain: {selectedGrain}</span><span>{finishTab === 'paint' ? 'Paint' : 'Stain'}: {selectedFinish?.name ?? ''}{style.hasGlass ? ` / ${glass.name}` : ''}</span><span>Hardware: {selectedHardware ? hardwareDisplayName(selectedHardware) : ''}</span></div>
        </aside>}
      </main>
      </>}
      <footer><span>Copyright 2026 Home Guard Industries</span><span>Built for your home. Backed for years.</span></footer>
    </div>
  )
}
