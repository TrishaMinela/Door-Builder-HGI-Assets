import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Download, FileText, Home as HomeIcon, Phone, RotateCcw, Send, ShieldCheck } from 'lucide-react'
import { DoorPreview } from './components/DoorPreview'
import { DoorStyleThumbnail } from './components/DoorStyleThumbnail'
import { HardwareOptionCard } from './components/HardwareOptionCard'
import { OptionCard } from './components/OptionCard'
import { QuoteForm } from './components/QuoteForm'
import { doorStyles, finishes, glassOptions } from './data/options'
import { hardwareDisplayName, hardwareOptions } from './data/hardware'
import { finishTypesForPreviewAssets } from './data/doorPreviewAssets'
import { finishesForStyle, resolveDoorProduct } from './data/productCatalog'
import type { ContactForm, PreviewHardware } from './types'
import { configurationPdfName } from './utils/pdfConfig'
import { submitQuote, type SubmissionResult } from './utils/submission'

const glassSteps = ['Door Style', 'Finish', 'Glass', 'Hardware', 'Review & Quote']
const noGlassSteps = ['Door Style', 'Finish', 'Hardware', 'Review & Quote']
const initialContact: ContactForm = { fullName: '', email: '', phone: '', zip: '' }
const emptyPreviewHardware: PreviewHardware = { color: '#191919', type: 'long' }
const hardwareStyleGroups = [...hardwareOptions.reduce((groups, option) => {
  const key = `${option.manufacturer}|${option.style}`
  const options = groups.get(key) ?? []
  options.push(option)
  groups.set(key, options)
  return groups
}, new Map<string, typeof hardwareOptions>()).values()]

export default function App() {
  const [screen, setScreen] = useState<'home' | 'builder'>('home')
  const [step, setStep] = useState(0)
  const [styleId, setStyleId] = useState('')
  const [finishId, setFinishId] = useState('')
  const [finishTab, setFinishTab] = useState<'paint' | 'stain'>('paint')
  const [glassId, setGlassId] = useState(glassOptions[0].id)
  const [hardwareId, setHardwareId] = useState('')
  const [contact, setContact] = useState(initialContact)
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null)

  const selectedStyle = doorStyles.find((item) => item.id === styleId)
  const style = selectedStyle ?? doorStyles[0]
  const availableFinishes = finishesForStyle(style, finishes)
  const compatibleFinishTypes = (['paint', 'stain'] as const).filter((type) => availableFinishes.some((item) => item.finishType === type))
  const previewFinishTypes = finishTypesForPreviewAssets(style)
  const availableFinishTypes = previewFinishTypes.filter((type) => compatibleFinishTypes.includes(type))
  const effectiveFinishTypes = availableFinishTypes.length ? availableFinishTypes : compatibleFinishTypes
  const activeFinishType = effectiveFinishTypes.includes(finishTab) ? finishTab : effectiveFinishTypes[0]
  const visibleFinishes = availableFinishes.filter((item) => item.finishType === activeFinishType)
  const selectedFinish = visibleFinishes.find((item) => item.id === finishId)
  const finish = selectedFinish ?? visibleFinishes[0] ?? availableFinishes[0] ?? finishes[0]
  const glass = glassOptions.find((item) => item.id === glassId)!
  const selectedHardware = hardwareOptions.find((item) => item.id === hardwareId)
  const hardware = selectedHardware ?? emptyPreviewHardware
  const steps = selectedStyle?.hasGlass === false ? noGlassSteps : glassSteps
  const currentStep = steps[step] ?? steps[steps.length - 1]
  const availableGlass = glassOptions
  const product = resolveDoorProduct(style, finish)
  const previewTintColor = selectedFinish ? finish.color : null

  useEffect(() => {
    if (effectiveFinishTypes.length && !effectiveFinishTypes.includes(finishTab)) setFinishTab(effectiveFinishTypes[0])
    if (step >= steps.length) setStep(steps.length - 1)
  }, [styleId, effectiveFinishTypes, finishTab, step, steps.length])

  const resetStyle = () => {
    setStyleId('')
    goTo(0)
  }

  const startOver = () => {
    setStyleId('')
    setFinishId('')
    setFinishTab('paint')
    setGlassId(glassOptions[0].id)
    setHardwareId('')
    setContact(initialContact)
    setErrors({})
    setSubmitted(false)
    setSubmitting(false)
    setSubmitError('')
    setSubmissionResult(null)
    setScreen('builder')
    goTo(0)
  }

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
      const { generateSummaryAttachment } = await import('./utils/pdf')
      const attachment = await generateSummaryAttachment(contact, product, style, null, finish, style.hasGlass ? glass : null, selectedHardware)
      const result = await submitQuote({ configuration: { product, style, grain: null, finish, glass: style.hasGlass ? glass : null, hardware: selectedHardware }, contact, attachment, submittedAt: new Date().toISOString() })
      setSubmissionResult(result)
      setSubmitted(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const downloadPdf = async () => {
    if (!selectedHardware) return
    const { downloadSummary } = await import('./utils/pdf')
    await downloadSummary(contact, product, style, null, finish, style.hasGlass ? glass : null, selectedHardware)
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
            <div className="home-preview-label"><span>Preview as you build</span><small>Style. Finish. Glass. Hardware.</small></div>
            <DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} product={product} tintColor={previewTintColor} />
          </div>
        </section>
      </main> : <>
      <nav className="stepper" aria-label="Configuration progress">
        {steps.map((label, index) => <button key={label} className={`${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`} onClick={() => index <= step && goTo(index)}><span>{index < step ? <Check size={13} /> : index + 1}</span><em>{label}</em></button>)}
      </nav>
      <main>
        {currentStep !== 'Review & Quote' && <div className="mobile-live-preview"><DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} product={product} tintColor={previewTintColor} /></div>}
        <section className={`builder-panel ${currentStep !== 'Review & Quote' ? 'configuration-step' : 'review-step'}`}>
          {currentStep !== 'Review & Quote' && <>
            <div className="section-heading">
              <span>Step {step + 1} of {steps.length}</span>
              <h1>{currentStep === 'Door Style' ? 'Choose a Door Style' : currentStep === 'Finish' ? 'Choose Your Finish' : currentStep === 'Glass' ? 'Choose Your Glass' : 'Choose Your Hardware'}</h1>
              <p>{currentStep === 'Door Style' ? 'Browse all available door styles and choose the one that feels right for your home.' : currentStep === 'Finish' ? 'Choose from the paint and stain options available for this style.' : currentStep === 'Glass' ? 'Balance natural light, privacy, and personality.' : 'Complete your entry with the perfect finishing touch.'}</p>
              <div className="section-resets">
                {currentStep === 'Door Style' && selectedStyle && <button onClick={resetStyle}><RotateCcw size={14} /> Reset Style</button>}
                {currentStep === 'Finish' && <button onClick={() => setFinishId('')}><RotateCcw size={14} /> Reset Finish</button>}
                {currentStep === 'Hardware' && <button onClick={() => setHardwareId('')}><RotateCcw size={14} /> Reset Hardware</button>}
              </div>
            </div>
            <div className="builder-options-scroll">
              {currentStep === 'Finish' && <div className="finish-toolbar">
                {effectiveFinishTypes.length > 1 && <div className="finish-tabs" role="tablist" aria-label="Finish type">{effectiveFinishTypes.map((type) => <button type="button" role="tab" aria-selected={activeFinishType === type} className={activeFinishType === type ? 'active' : ''} key={type} onClick={() => selectFinishTab(type)}>{type === 'paint' ? 'Paint' : 'Stain'}</button>)}</div>}
                <div className="finish-logo-slot">
                  {activeFinishType === 'paint' && <img src="/assets/branding/pro-match-logo.png" alt="Pro Match paint colors" loading="lazy" decoding="async" />}
                  {activeFinishType === 'stain' && <img src="/assets/branding/timberstain-logo.png" alt="TimberStain" loading="lazy" decoding="async" />}
                </div>
              </div>}
              <div className={`options-grid step-${step}`}>
                {currentStep === 'Door Style' && doorStyles.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.eyebrow} selected={styleId === item.id} onClick={() => setStyleId(item.id)} visual={<DoorStyleThumbnail style={item} />} badge={item.variants.some((variant) => variant.lineName === 'Signature Fiberglass Grained N/C') ? <img src="/assets/branding/signature-series-logo.png" alt="Available in Signature Series" loading="lazy" decoding="async" /> : undefined} />)}
                {currentStep === 'Finish' && visibleFinishes.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.finishType} selected={finishId === item.id} onClick={() => { setFinishId(item.id); setFinishTab(item.finishType) }} visual={<span className="finish-swatch" style={{ background: item.color }}><i style={{ background: item.accent }} /></span>} />)}
                {currentStep === 'Glass' && availableGlass.map((item) => <OptionCard key={item.id} title={item.name} selected={glassId === item.id} onClick={() => setGlassId(item.id)} visual={<span className="glass-swatch glass-clear" />} />)}
                {currentStep === 'Hardware' && hardwareStyleGroups.map((options) => <HardwareOptionCard key={`${options[0].manufacturer}-${options[0].style}`} options={options} selectedId={hardwareId} onSelect={(option) => setHardwareId(option.id)} />)}
              </div>
            </div>
          </>}

          {currentStep === 'Review & Quote' && !submitted && <>
            <div className="section-heading review-heading"><span>Final step</span><h1>Find a Home Guard Dealer</h1><p>Submit your contact information and door configuration. A Home Guard dealer or team member will follow up with next steps.</p></div>
            <div className="mobile-review-preview"><DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} product={product} tintColor={previewTintColor} /></div>
            <div className="summary-card">
              <div className="summary-title"><h2>Configuration Summary</h2></div>
              <div className="summary-row"><span>{product.doorTypeLabel}{product.doorTypes.map((doorType) => <strong key={doorType}>{doorType}</strong>)}</span></div>
              {[['Door style', style.name, steps.indexOf('Door Style')], ['Finish type', finish.finishType === 'paint' ? 'Paint' : 'Stain', steps.indexOf('Finish')], [finish.finishType === 'paint' ? 'Finish color' : 'Stain color', finish.name, steps.indexOf('Finish')], ...(style.hasGlass ? [['Glass', glass.name, steps.indexOf('Glass')]] : []), ['Hardware', hardwareDisplayName(selectedHardware!), steps.indexOf('Hardware')]].map(([label, value, target]) => <div className="summary-row" key={String(label)}><span>{label}<strong>{value}</strong></span>{Number(target) >= 0 && <button onClick={() => goTo(Number(target))}>Edit</button>}</div>)}
            </div>
            <div className="attachment-card">
              <span className="attachment-icon"><FileText size={25} /></span>
              <span className="attachment-copy"><small>Attached Configuration PDF</small><strong>{configurationPdfName}</strong><em>{product.doorTypes.join(', ')} / {style.name} / {finish.finishType === 'paint' ? 'Paint' : 'Stain'}: {finish.name}{style.hasGlass ? ` / ${glass.name}` : ''} / {hardwareDisplayName(selectedHardware!)}</em><span>This file will be sent with your request.</span></span>
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

          {currentStep !== 'Review & Quote' && <div className="builder-actions"><button className="back" disabled={step === 0} onClick={() => goTo(step - 1)}><ArrowLeft size={17} /> Back</button><button className="next" disabled={(currentStep === 'Door Style' && !selectedStyle) || (currentStep === 'Finish' && !selectedFinish) || (currentStep === 'Hardware' && !selectedHardware)} onClick={() => goTo(step + 1)}>{currentStep === 'Door Style' && !selectedStyle ? 'Select a Door Style' : currentStep === 'Finish' && !selectedFinish ? 'Select a Finish' : currentStep === 'Hardware' && !selectedHardware ? 'Select Hardware' : `Continue to ${steps[step + 1]}`} <ArrowRight size={17} /></button></div>}
        </section>

        {!submitted && <aside>
          <div className="aside-top"><span>Your design</span><small>Updates as you build</small></div>
          <DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} product={product} tintColor={previewTintColor} />
          <div className="mini-summary"><strong>{selectedStyle?.name ?? 'Select a door style'}</strong><span>{selectedFinish ? `${product.doorTypeLabel}: ${product.doorTypes.join(', ')}` : 'Door type: Complete finish selections'}</span><span>{selectedStyle ? `${activeFinishType === 'paint' ? 'Paint' : 'Stain'}: ${selectedFinish?.name ?? ''}${style.hasGlass ? ` / ${glass.name}` : ''}` : 'Finish: Select a style first'}</span><span>Hardware: {selectedHardware ? hardwareDisplayName(selectedHardware) : ''}</span></div>
        </aside>}
      </main>
      </>}
      <footer><span>Copyright 2026 Home Guard Industries</span><span>Built for your home. Backed for years.</span></footer>
    </div>
  )
}
