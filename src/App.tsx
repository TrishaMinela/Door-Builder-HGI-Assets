import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Download, Home as HomeIcon, Menu, Phone, Send, ShieldCheck } from 'lucide-react'
import { DoorPreview } from './components/DoorPreview'
import { OptionCard } from './components/OptionCard'
import { QuoteForm } from './components/QuoteForm'
import { doorStyles, finishes, glassOptions, hardwareOptions } from './data/options'
import type { ContactForm } from './types'
import { downloadSummary } from './utils/pdf'
import { submitQuote, type SubmissionResult } from './utils/submission'

const steps = ['Door Style', 'Finish', 'Glass', 'Hardware', 'Review & Quote']
const initialContact: ContactForm = { firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', zip: '', notes: '' }

export default function App() {
  const [screen, setScreen] = useState<'home' | 'builder'>('home')
  const [step, setStep] = useState(0)
  const [styleId, setStyleId] = useState(doorStyles[0].id)
  const [finishId, setFinishId] = useState(finishes[0].id)
  const [glassId, setGlassId] = useState(glassOptions[0].id)
  const [hardwareId, setHardwareId] = useState(hardwareOptions[0].id)
  const [contact, setContact] = useState(initialContact)
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null)

  const style = doorStyles.find((item) => item.id === styleId)!
  const finish = finishes.find((item) => item.id === finishId)!
  const glass = glassOptions.find((item) => item.id === glassId)!
  const hardware = hardwareOptions.find((item) => item.id === hardwareId)!
  const availableFinishes = finishes.filter((item) => style.allowedFinishes.includes(item.id) && item.compatibleDoorStyles.includes(style.id))
  const availableGlass = glassOptions.filter((item) => style.allowedGlass.includes(item.id) && item.compatibleDoorStyles.includes(style.id))
  const availableHardware = hardwareOptions.filter((item) => style.allowedHardware.includes(item.id) && item.compatibleDoorStyles.includes(style.id))

  useEffect(() => {
    if (!style.allowedFinishes.includes(finishId)) setFinishId(availableFinishes[0].id)
    if (!style.allowedGlass.includes(glassId)) setGlassId(availableGlass[0].id)
    if (!style.allowedHardware.includes(hardwareId)) setHardwareId(availableHardware[0].id)
  }, [styleId])

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

  const submit = async () => {
    if (submitting || submitted) return
    const required: (keyof ContactForm)[] = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zip']
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
      const result = await submitQuote({ configuration: { style, finish, glass, hardware }, contact, submittedAt: new Date().toISOString() })
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
          {screen === 'builder' && <button className="home-return" onClick={() => showScreen('home')}><HomeIcon size={15} /> Home</button>}
          <div className="header-help"><Phone size={16} /><span>Questions? <strong>Talk to a door expert</strong></span></div>
        </div>
        <button className="menu" aria-label="Menu"><Menu /></button>
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
        {step < 4 && <div className="mobile-live-preview"><DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} /></div>}
        <section className={`builder-panel ${step < 4 ? 'configuration-step' : 'review-step'}`}>
          {step < 4 && <>
            <div className="section-heading">
              <span>Step {step + 1} of 5</span>
              <h1>{step === 0 ? 'Choose a Door Style' : step === 1 ? 'Choose Your Finish' : step === 2 ? 'Choose Your Glass' : 'Choose Your Hardware'}</h1>
              <p>{step === 0 ? 'Start with a style that feels right for your home.' : step === 1 ? 'Set the tone with a durable, rich exterior finish.' : step === 2 ? 'Balance natural light, privacy, and personality.' : 'Complete your entry with the perfect finishing touch.'}</p>
            </div>
            <div className="builder-options-scroll">
              <div className={`options-grid step-${step}`}>
                {step === 0 && doorStyles.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} eyebrow={item.eyebrow} selected={styleId === item.id} onClick={() => setStyleId(item.id)} visual={<DoorPreview style={item} finish={finish} glass={glass} hardware={hardware} compact />} />)}
                {step === 1 && availableFinishes.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} selected={finishId === item.id} onClick={() => setFinishId(item.id)} visual={<span className="finish-swatch" style={{ background: item.color }}><i style={{ background: item.accent }} /></span>} />)}
                {step === 2 && availableGlass.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} selected={glassId === item.id} onClick={() => setGlassId(item.id)} visual={<span className={`glass-swatch glass-${item.pattern}`} />} />)}
                {step === 3 && availableHardware.map((item) => <OptionCard key={item.id} title={item.name} description={item.description} selected={hardwareId === item.id} onClick={() => setHardwareId(item.id)} visual={<span className="hardware-swatch" style={{ '--metal': item.color } as React.CSSProperties}><i /><b /></span>} />)}
              </div>
            </div>
          </>}

          {step === 4 && !submitted && <>
            <div className="section-heading review-heading"><span>Final step</span><h1>Your Door, Ready for a Quote</h1><p>Review your selections, then tell us where to send your personalized quote.</p></div>
            <div className="mobile-review-preview"><DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} /></div>
            <div className="summary-card">
              <div className="summary-title"><h2>Configuration Summary</h2><button onClick={() => downloadSummary(contact, style, finish, glass, hardware)}><Download size={16} /> Download PDF</button></div>
              {[['Door style', style.name, 0], ['Finish', finish.name, 1], ['Glass', glass.name, 2], ['Hardware', hardware.name, 3]].map(([label, value, target]) => <div className="summary-row" key={label}><span>{label}<strong>{value}</strong></span><button onClick={() => goTo(Number(target))}>Edit</button></div>)}
            </div>
            <div className="form-card">
              <h2>Where should we send your quote?</h2><p>A local Home Guard expert will review your design and follow up with next steps.</p>
              <QuoteForm values={contact} errors={errors} onChange={updateContact} />
              <label className="consent"><input type="checkbox" defaultChecked /> <span>I agree to be contacted about this quote request.</span></label>
              {submitError && <p className="submit-error" role="alert">{submitError}</p>}
              <button className="submit-button" disabled={submitting} onClick={submit}><Send size={18} /> {submitting ? 'Sending Request...' : 'Request My Quote'}</button>
              <p className="privacy"><ShieldCheck size={15} /> Your information is kept private and never sold.</p>
            </div>
          </>}

          {submitted && <div className="success">
            <span><Check size={32} /></span><small>{submissionResult?.mode === 'demo' ? 'Demo complete' : 'Quote request received'}</small><h1>Thanks, {contact.firstName}.</h1>
            <p>{submissionResult?.message}</p>
            <button onClick={() => downloadSummary(contact, style, finish, glass, hardware)}><Download size={17} /> Download Your Summary</button>
          </div>}

          {step < 4 && <div className="builder-actions"><button className="back" disabled={step === 0} onClick={() => goTo(step - 1)}><ArrowLeft size={17} /> Back</button><button className="next" onClick={() => goTo(step + 1)}>Continue to {steps[step + 1]} <ArrowRight size={17} /></button></div>}
        </section>

        {!submitted && <aside>
          <div className="aside-top"><span>Your design</span><small>Updates as you build</small></div>
          <DoorPreview style={style} finish={finish} glass={glass} hardware={hardware} />
          <div className="mini-summary"><strong>{style.name}</strong><span>{finish.name} / {glass.name}</span><span>{hardware.name}</span></div>
        </aside>}
      </main>
      </>}
      <footer><span>Copyright 2026 Home Guard Industries</span><span>Built for your home. Backed for years.</span></footer>
    </div>
  )
}
