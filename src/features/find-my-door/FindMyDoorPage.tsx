import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, Send } from 'lucide-react'
import { DealerMode, useDealerSession } from '../../components/DealerMode'
import { DealerBrandMark } from '../../components/DealerBrandMark'
import { SiteFooter } from '../../components/SiteFooter'
import type { PublicDealerBrand } from '../../types/dealerBranding'
import type { ContactForm } from '../../types'
import { dealerBrandStyle, dealerSurfaceLogo } from '../../utils/dealerBranding'
import { isValidDealerSlug, normalizeDealerSlug } from '../../utils/dealerSlug'
import { buildDoorBuilderSubmissionPayload, submitQuote } from '../../utils/submission'
import { prepareAiHousePhoto } from '../home-visualizer/aiVisualization'
import { normalizePhoto } from '../home-visualizer/HomeVisualizer'
import { HouseRender } from './HouseRender'
import { launchBuilder } from './launch'
import { recipeById } from './recipes'
import { fallbackReason, resolveRecommendation, type ResolvedRecommendation } from './resolveRecommendation'
import { chooseFinish, selectRecipes } from './selectRecipes'
import { LIGHT_CHOICES, STYLE_CHOICES, lightChoice, styleChoice, type HouseReading, type LightPreference, type StyleMood } from './types'
import './FindMyDoor.css'

type Step = 'photo' | 'style' | 'details' | 'results'
type RecommendPayload = {
  photoRead?: boolean
  house?: Partial<HouseReading>
  recommendations?: { id?: string; finishId?: string; reason?: string }[]
  error?: string
}

const emptyHouse: HouseReading = { architecture: '', siding: '', trim: '', opening: 'unknown' }
const emptyContact: ContactForm = { fullName: '', email: '', phone: '', zip: '', notes: '' }
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'])

function dealerFromLocation() {
  const value = normalizeDealerSlug(new URLSearchParams(window.location.search).get('dealer') ?? '')
  return isValidDealerSlug(value) ? value : null
}

function contactErrors(contact: ContactForm) {
  const errors: Partial<Record<keyof ContactForm, string>> = {}
  if (!contact.fullName.trim()) errors.fullName = 'Please enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) errors.email = 'Enter a valid email address.'
  if (!/^[+]?[\d\s().-]{7,20}$/.test(contact.phone.trim())) errors.phone = 'Enter a valid phone number.'
  if (!/^\d{5}(-\d{4})?$/.test(contact.zip.trim())) errors.zip = 'Enter a valid ZIP code.'
  return errors
}

async function requestRecommendations(photoUrl: string, mood: StyleMood, light: LightPreference, signal: AbortSignal): Promise<RecommendPayload> {
  const prepared = await prepareAiHousePhoto(photoUrl)
  const response = await fetch('/api/recommend-door', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo: prepared.photo, mood, light }),
    signal,
  })
  const body = await response.json().catch(() => null) as RecommendPayload | null
  if (response.status === 422 || response.status === 413 || response.status === 400) {
    throw new Error(body?.error || 'We couldn’t use that photo. Please try another one.')
  }
  if (!response.ok || !body) throw new Error('unavailable')
  return body
}

export function FindMyDoorPage() {
  const dealerSlug = useMemo(dealerFromLocation, [])
  const dealerSession = useDealerSession()
  const [dealerBrand, setDealerBrand] = useState<PublicDealerBrand | null>(null)
  const [bannerTarget, setBannerTarget] = useState<HTMLDivElement | null>(null)
  const [step, setStep] = useState<Step>('photo')
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [mood, setMood] = useState<StyleMood | ''>('')
  const [light, setLight] = useState<LightPreference | ''>('')
  const [contact, setContact] = useState(emptyContact)
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({})
  const [pageError, setPageError] = useState('')
  const [reading, setReading] = useState(false)
  const [photoRead, setPhotoRead] = useState(true)
  const [house, setHouse] = useState<HouseReading>(emptyHouse)
  const [recommendations, setRecommendations] = useState<ResolvedRecommendation[]>([])
  const [selected, setSelected] = useState(0)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const homeHref = dealerSlug ? `/${dealerSlug}` : '/'
  const current = recommendations[selected] ?? null
  const logo = dealerBrand ? dealerSurfaceLogo(dealerBrand, 'page-header') : null

  useEffect(() => {
    const previous = document.title
    document.title = 'Find My Door | Home Guard Door Builder'
    return () => { document.title = previous }
  }, [])

  useEffect(() => {
    if (!dealerSlug) return
    const controller = new AbortController()
    void fetch(`/api/dealer-context?slug=${encodeURIComponent(dealerSlug)}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ dealer?: PublicDealerBrand }> : null)
      .then((result) => { if (result?.dealer?.slug === dealerSlug) setDealerBrand(result.dealer) })
      .catch(() => undefined)
    return () => controller.abort()
  }, [dealerSlug])

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])

  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!PHOTO_TYPES.has(file.type.toLowerCase()) && !/\.(?:jpe?g|png|webp|avif|heic|heif)$/i.test(file.name)) {
      setPageError('Please choose a JPG, PNG, WebP, AVIF, or HEIC photo.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setPageError('That photo is larger than 50 MB. Please choose a smaller one.')
      return
    }
    setPageError('')
    try {
      const prepared = await normalizePhoto(file)
      const nextUrl = URL.createObjectURL(prepared)
      setPhotoUrl((currentUrl) => { if (currentUrl) URL.revokeObjectURL(currentUrl); return nextUrl })
      setPhotoName(file.name)
    } catch {
      setPageError('We couldn’t open that photo. Please try a different one.')
    }
  }

  const readHouse = async () => {
    if (!photoUrl || !mood || !light) return
    setReading(true)
    setPageError('')
    setRecommendations([])
    const controller = new AbortController()
    try {
      const result = await requestRecommendations(photoUrl, mood, light, controller.signal)
      const nextHouse: HouseReading = {
        architecture: result.house?.architecture || '',
        siding: result.house?.siding || '',
        trim: result.house?.trim || '',
        opening: result.house?.opening === 'single' || result.house?.opening === 'double' || result.house?.opening === 'sidelites' ? result.house.opening : 'unknown',
      }
      const resolved = (result.recommendations ?? []).flatMap((pick) => {
        const recipe = recipeById(pick.id || '')
        if (!recipe || recipe.light !== light) return []
        const finishId = chooseFinish(recipe, nextHouse.siding, pick.finishId)
        const item = resolveRecommendation(recipe, finishId, pick.reason || '', nextHouse, mood)
        return item ? [item] : []
      })
      const fallback = selectRecipes(mood, light, nextHouse.opening).flatMap((recipe) => {
        if (resolved.some((item) => item.id === recipe.id)) return []
        const item = resolveRecommendation(recipe, chooseFinish(recipe, nextHouse.siding), '', nextHouse, mood)
        return item ? [item] : []
      })
      const next = [...resolved, ...fallback].slice(0, 3)
      if (next.length < 2) throw new Error('unavailable')
      setHouse(nextHouse)
      setPhotoRead(result.photoRead !== false)
      setRecommendations(next.map((item) => item.reason ? item : { ...item, reason: fallbackReason(item.finishName, item.styleName, nextHouse, mood) }))
      setSelected(0)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      const photoProblem = error instanceof Error && error.message !== 'unavailable' && !/fetch|network/i.test(error.message)
      if (photoProblem) {
        setPageError(error.message)
        setStep('photo')
      } else {
        const local = selectRecipes(mood, light, 'unknown').flatMap((recipe) => {
          const item = resolveRecommendation(recipe, chooseFinish(recipe, ''), '', emptyHouse, mood)
          return item ? [item] : []
        })
        if (local.length < 2) {
          setPageError('We couldn’t match a door just now. Please try again.')
        } else {
          setPhotoRead(false)
          setHouse(emptyHouse)
          setRecommendations(local)
          setSelected(0)
        }
      }
    } finally {
      setReading(false)
    }
  }

  const submitLead = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!current) return
    const nextErrors = contactErrors(contact)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSending(true)
    setPageError('')
    const notes = `Find My Door: ${current.title}. ${current.reason}`
    const lead = { ...contact, notes }
    try {
      const payload = buildDoorBuilderSubmissionPayload({ contact: lead, configuration: current.configuration })
      await submitQuote({ ...payload, submissionId: crypto.randomUUID(), doorConfiguration: { schemaVersion: 1, configuration: current.configuration }, dealerSlug })
      setContact(lead)
      setSent(true)
      setStep('results')
    } catch {
      setPageError('We couldn’t send your details just now. You can retry, or view the door and send them from the quote step.')
    } finally {
      setSending(false)
    }
  }

  const customize = () => {
    if (!current) return
    launchBuilder(current.draft, { ...contact, notes: `Find My Door: ${current.title}. ${current.reason}` }, dealerSlug)
  }

  return <div className={`shared-footer-shell find-my-door-app builder-typography${dealerBrand ? ' dealer-cobranded' : ''}`} style={dealerBrand ? dealerBrandStyle(dealerBrand) : undefined}>
    <div ref={setBannerTarget} className="dealer-mode-banner-slot" />
    <header className="find-my-door-header">
      <a className="brand" href={homeHref} aria-label="Home Guard Door Builder home">
        {dealerBrand && logo ? <DealerBrandMark brand={dealerBrand} onDarkBackground={logo.usesDarkSurface} logoUrl={logo.logoUrl} contrastContainer={logo.needsContrastContainer} /> : <img src="/assets/branding/hgi-logo-black.webp" alt="Home Guard Industries" />}
      </a>
      <a className="find-my-door-builder-link" href={homeHref}>Door Builder</a>
    </header>
    <main className="find-my-door-main">
      <p className="find-door-kicker">Find My Door</p>
      {step === 'photo' && <>
        <h1>Show us your entry.</h1>
        <p className="find-door-lead">Upload a photo of the front door. We’ll recommend an HGI door that fits the house, then show it on your photo.</p>
        <section className="find-door-card">
          <h2>Photo of the front door</h2>
          <ul className="find-door-tips">
            <li>Face the front door straight on.</li>
            <li>Use daylight, not a night flash.</li>
            <li>Keep the whole entry in the frame.</li>
          </ul>
          <div className="find-door-drop">
            {photoUrl && <img src={photoUrl} alt="Your uploaded entry" />}
            <label className="find-door-primary">
              <ImagePlus size={18} /> {photoUrl ? 'Choose a different photo' : 'Upload a photo'}
              <input className="find-door-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" onChange={(event) => void onPhoto(event)} />
            </label>
            {photoName && <p>{photoName}</p>}
          </div>
          {pageError && <p className="find-door-note find-door-note-error" role="alert">{pageError}</p>}
          <div className="find-door-actions">
            <button type="button" className="find-door-primary" disabled={!photoUrl} onClick={() => { setPageError(''); setStep('style') }}>Continue <ArrowRight size={16} /></button>
          </div>
        </section>
      </>}
      {step === 'style' && <>
        <h1>What kind of door do you want?</h1>
        <p className="find-door-lead">These answers steer the recommendation. The door itself still comes from the current HGI catalog.</p>
        <section className="find-door-card">
          <h2>How would you describe the new door you want?</h2>
          <div className="find-door-choices" role="listbox" aria-label="Door style">
            {STYLE_CHOICES.map((choice) => <button type="button" key={choice.id} className={mood === choice.id ? 'find-door-choice selected' : 'find-door-choice'} aria-pressed={mood === choice.id} onClick={() => setMood(choice.id)}><strong>{choice.name}</strong><span>{choice.description}</span></button>)}
          </div>
        </section>
        <section className="find-door-card">
          <h2>How much glass do you want?</h2>
          <div className="find-door-choices" role="listbox" aria-label="Glass and privacy">
            {LIGHT_CHOICES.map((choice) => <button type="button" key={choice.id} className={light === choice.id ? 'find-door-choice selected' : 'find-door-choice'} aria-pressed={light === choice.id} onClick={() => setLight(choice.id)}><strong>{choice.name}</strong><span>{choice.description}</span></button>)}
          </div>
          <div className="find-door-actions">
            <button type="button" className="find-door-secondary" onClick={() => setStep('photo')}><ArrowLeft size={16} /> Back</button>
            <button type="button" className="find-door-primary" disabled={!mood || !light} onClick={() => { setStep('details'); void readHouse() }}>See my door <ArrowRight size={16} /></button>
          </div>
        </section>
      </>}
      {step === 'details' && <>
        <h1>Where should we send it?</h1>
        <p className="find-door-lead">The door is being matched to your photo. Leave your name and ZIP while that finishes — the ZIP is saved with your quote so the right dealer can follow up.</p>
        <form className="find-door-card" onSubmit={(event) => void submitLead(event)}>
          <h2>Your details</h2>
          <div className="find-door-fields">
            <label>Full name<input name="fullName" autoComplete="name" value={contact.fullName} aria-invalid={!!errors.fullName} onChange={(event) => setContact({ ...contact, fullName: event.target.value })} />{errors.fullName && <small>{errors.fullName}</small>}</label>
            <label>Email<input name="email" type="email" autoComplete="email" value={contact.email} aria-invalid={!!errors.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} />{errors.email && <small>{errors.email}</small>}</label>
            <label>Phone<input name="phone" type="tel" autoComplete="tel" value={contact.phone} aria-invalid={!!errors.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} />{errors.phone && <small>{errors.phone}</small>}</label>
            <label>ZIP code<input name="zip" autoComplete="postal-code" inputMode="numeric" value={contact.zip} aria-invalid={!!errors.zip} onChange={(event) => setContact({ ...contact, zip: event.target.value })} />{errors.zip && <small>{errors.zip}</small>}</label>
          </div>
          <p className="find-door-note" role="status">{reading ? 'Reading the house and choosing doors from the HGI catalog…' : recommendations.length ? 'Your door is ready. Send your details to view it.' : 'Choose a photo and style to continue.'}</p>
          {pageError && <p className="find-door-note find-door-note-error" role="alert">{pageError}</p>}
          <div className="find-door-actions">
            <button type="button" className="find-door-secondary" onClick={() => setStep('style')}><ArrowLeft size={16} /> Back</button>
            <button type="submit" className="find-door-primary" disabled={sending || reading || !current}><Send size={16} /> {sending ? 'Sending…' : 'Show my door'}</button>
            {pageError && current && <button type="button" className="find-door-secondary" onClick={() => setStep('results')}>View the door anyway</button>}
          </div>
        </form>
      </>}
      {step === 'results' && current && <>
        <h1>A door for this house.</h1>
        <p className="find-door-lead">{photoRead ? 'Built from your photo, your style, and doors HGI actually makes.' : 'We couldn’t read the photo clearly, so these follow your style and glass choices. You can go back and try another photo.'}</p>
        {(house.architecture || house.siding) && <p className="find-door-house">We read this as {house.architecture || 'a home entry'}{house.siding ? ` with ${house.siding}` : ''}{house.trim ? ` and ${house.trim} trim` : ''}.</p>}
        <div className="find-door-recommendations" role="listbox" aria-label="Recommended doors">
          {recommendations.map((item, index) => <button type="button" key={item.cacheKey} className={index === selected ? 'selected' : undefined} aria-pressed={index === selected} onClick={() => setSelected(index)}><strong>{item.title}</strong><span>{item.summary}</span></button>)}
        </div>
      </>}
      {photoUrl && current && (step === 'details' || step === 'results') && <section className={step === 'results' ? 'find-door-card find-door-live' : 'find-door-park'}>
        {step === 'results' && <><h2>{current.title}</h2><p>{current.reason}</p></>}
        <HouseRender photoUrl={photoUrl} resolved={current} showResult={step === 'results'} />
        {step === 'results' && <>
          <ul className="find-door-spec">
            <li><span>Door</span><strong>{current.styleName}</strong></li>
            <li><span>Finish</span><strong>{current.finishName}</strong></li>
            <li><span>Glass</span><strong>{current.glassName}</strong></li>
            <li><span>Hardware</span><strong>{current.hardwareName}</strong></li>
            <li><span>Opening</span><strong>{current.openingLabel}</strong></li>
          </ul>
          <div className="find-door-actions">
            <button type="button" className="find-door-primary" onClick={customize}>Customize this door <ArrowRight size={16} /></button>
            <button type="button" className="find-door-secondary" onClick={() => { setStep('photo'); setPageError('') }}>Try another photo</button>
          </div>
          {sent && <p className="find-door-note">Your details were sent. Customizing opens the door builder with this door already selected.</p>}
          {dealerBrand && <p className="find-door-dealer">Shared with {dealerBrand.companyName}</p>}
          {!photoRead && mood && light && <p className="find-door-note">Style: {styleChoice(mood).name}. Glass: {lightChoice(light).name}.</p>}
        </>}
      </section>}
    </main>
    <SiteFooter currentStep="find-my-door" configuration={{ 'Find My Door': current?.title ?? '' }} dealerBrand={dealerBrand} dealerAccess={<DealerMode session={dealerSession} bannerTarget={bannerTarget} onExit={() => undefined} />} />
  </div>
}
