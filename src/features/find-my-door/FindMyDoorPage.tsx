import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { DealerMode, useDealerSession } from '../../components/DealerMode'
import { DealerBrandMark } from '../../components/DealerBrandMark'
import { DoorPreview } from '../../components/DoorPreview'
import { OptionCard } from '../../components/OptionCard'
import { SiteFooter } from '../../components/SiteFooter'
import type { PublicDealerBrand } from '../../types/dealerBranding'
import type { ContactForm } from '../../types'
import { dealerBrandStyle, dealerLogoAnchor, dealerSurfaceLogos } from '../../utils/dealerBranding'
import { isValidDealerSlug, normalizeDealerSlug } from '../../utils/dealerSlug'
import { buildDoorBuilderSubmissionPayload, submitQuote } from '../../utils/submission'
import { prepareAiHousePhoto } from '../home-visualizer/aiVisualization'
import { normalizePhoto } from '../home-visualizer/HomeVisualizer'
import { HouseRender, type HouseRenderHandle } from './HouseRender'
import { hasHouseImage, houseImages, modeAfterOptionChange } from './houseImageCache'
import { FEATURED_DOOR, INSPIRATION } from './inspiration'
import { launchBuilder } from './launch'
import { recipeById } from './recipes'
import { fallbackReason, resolveRecommendation, type ResolvedRecommendation } from './resolveRecommendation'
import { chooseFinish, selectRecipes } from './selectRecipes'
import { LIGHT_CHOICES, STYLE_CHOICES, type HouseReading, type LightPreference, type StyleMood } from './types'
import './FindMyDoor.css'

const popularDoors = INSPIRATION.filter((door) => door.id !== FEATURED_DOOR.id)

type Step = 'photo' | 'style' | 'glass' | 'details' | 'results'
type RecommendPayload = {
  photoRead?: boolean
  house?: Partial<HouseReading>
  recommendations?: { id?: string; finishId?: string; reason?: string }[]
  error?: string
}

const emptyHouse: HouseReading = { architecture: '', siding: '', trim: '', opening: 'unknown' }
const emptyContact: ContactForm = { fullName: '', email: '', phone: '', zip: '', notes: '' }
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'])
const STEP_LABEL: Record<Step, string> = { photo: 'Photo', style: 'Style', glass: 'Glass', details: 'Details', results: 'Door' }

function oneLine(reason: string) {
  const sentence = reason.split(/(?<=\.)\s/)[0] || reason
  return sentence.length > 150 ? `${sentence.slice(0, 147).trim()}…` : sentence
}

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
  const dealerMode = dealerSession.active
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
  const [recommendations, setRecommendations] = useState<ResolvedRecommendation[]>([])
  const [selected, setSelected] = useState(0)
  const [previewMode, setPreviewMode] = useState<'door' | 'house'>('door')
  const [renderStatus, setRenderStatus] = useState<'idle' | 'working' | 'ready' | 'error'>('idle')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const houseRef = useRef<HouseRenderHandle>(null)
  const homeHref = dealerSlug ? `/${dealerSlug}` : '/'
  const current = recommendations[selected] ?? null
  const pageLogos = dealerBrand ? dealerSurfaceLogos(dealerBrand, 'page-header') : null
  const logo = pageLogos?.primary ?? null
  const primaryLink = dealerBrand && logo?.logoUrl ? dealerLogoAnchor(dealerBrand, 'primary') : null
  const secondaryLink = dealerBrand && pageLogos?.showPair && pageLogos.secondary?.logoUrl ? dealerLogoAnchor(dealerBrand, 'secondary') : null
  const logosLinked = Boolean(primaryLink || secondaryLink)

  useEffect(() => {
    const previous = document.title
    document.title = 'HGI Door Finder | Home Guard Door Builder'
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

  useEffect(() => {
    if (!dealerMode || step !== 'details') return
    setStep('results')
  }, [dealerMode, step])

  useEffect(() => { window.scrollTo({ top: 0 }) }, [step])

  useEffect(() => { houseImages(photoUrl) }, [photoUrl])

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
    const notes = `HGI Door Finder: ${current.title}. ${current.reason}`
    const lead = { ...contact, notes }
    try {
      const payload = buildDoorBuilderSubmissionPayload({ contact: lead, configuration: current.configuration })
      await submitQuote({ ...payload, submissionId: crypto.randomUUID(), doorConfiguration: { schemaVersion: 1, configuration: current.configuration }, dealerSlug })
      setContact(lead)
      setSent(true)
      setStep('results')
    } catch {
      setPageError('We couldn’t send that. Try again, or view the door first.')
    } finally {
      setSending(false)
    }
  }

  const customize = () => {
    if (!current) return
    const notes = `HGI Door Finder: ${current.title}. ${current.reason}`
    // Dealers skip contact capture, the same way the builder skips the quote form.
    launchBuilder(current.draft, dealerMode ? { ...emptyContact, notes } : { ...contact, notes }, dealerSlug)
  }

  const seeHouse = () => {
    setPreviewMode('house')
    houseRef.current?.seeOnHouse()
  }

  const chooseRecommendation = (index: number) => {
    const next = recommendations[index]
    setSelected(index)
    if (!next || previewMode !== 'house') return
    setPreviewMode(modeAfterOptionChange(true, hasHouseImage(photoUrl, next.cacheKey)))
  }

  const touch = (key: keyof ContactForm) => {
    const next = contactErrors(contact)
    setErrors((currentErrors) => ({ ...currentErrors, [key]: next[key] }))
  }

  const flow: Step[] = dealerMode ? ['photo', 'style', 'glass', 'results'] : ['photo', 'style', 'glass', 'details', 'results']
  const stepIndex = Math.max(0, flow.indexOf(step))
  const houseReady = previewMode === 'house' && renderStatus === 'ready'
  const upload = (primary: boolean) => <label className={primary ? 'next find-door-upload' : 'back find-door-upload'}>
    {photoUrl ? 'Change photo' : 'Upload a photo of your home'}
    <input className="find-door-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" onChange={(event) => void onPhoto(event)} />
  </label>

  return <div className={`shared-footer-shell find-my-door-app builder-typography${dealerBrand ? ' dealer-cobranded' : ''}`} style={dealerBrand ? dealerBrandStyle(dealerBrand) : undefined}>
    <div ref={setBannerTarget} className="dealer-mode-banner-slot" />
    <header className="find-my-door-header">
      {dealerBrand && logo && logosLinked ? (
        <div className="brand">
          <DealerBrandMark brand={dealerBrand} onDarkBackground={logo.usesDarkSurface} logoUrl={logo.logoUrl} secondaryLogoUrl={pageLogos?.showPair ? pageLogos.secondary?.logoUrl : null} contrastContainer={logo.needsContrastContainer} primaryLink={primaryLink} secondaryLink={secondaryLink} />
          <a className="app-name" href={homeHref} aria-label="Home Guard Door Builder home"><strong>HGI Door Finder</strong></a>
        </div>
      ) : (
        <a className="brand" href={homeHref} aria-label="Home Guard Door Builder home">
          {dealerBrand && logo ? <DealerBrandMark brand={dealerBrand} onDarkBackground={logo.usesDarkSurface} logoUrl={logo.logoUrl} secondaryLogoUrl={pageLogos?.showPair ? pageLogos.secondary?.logoUrl : null} contrastContainer={logo.needsContrastContainer} /> : <img src="/assets/branding/hgi-logo-black.webp" alt="Home Guard Industries" />}
          <span className="app-name"><strong>HGI Door Finder</strong></span>
        </a>
      )}
      <a className="home-return find-my-door-builder-link" href={homeHref}>Door Builder</a>
    </header>
    <ol className="find-door-steps" aria-label="Progress">
      {flow.map((item, index) => <li key={item}>
        {index < stepIndex
          ? <button type="button" className="done" onClick={() => setStep(item)}><i>{index + 1}</i>{STEP_LABEL[item]}</button>
          : <span className={index === stepIndex ? 'current' : 'upcoming'} aria-current={index === stepIndex ? 'step' : undefined}><i>{index + 1}</i>{STEP_LABEL[item]}</span>}
      </li>)}
    </ol>
    <main className="find-my-door-main">
      {step === 'photo' && <>
        <div className="find-door-open">
          <div>
            <p className="find-door-name">HGI Door Finder</p>
            <h1>Find the right front door for your home.</h1>
            <p className="find-door-lead">{dealerMode ? 'Upload a photo of the customer’s house. We’ll suggest Home Guard doors that fit its style, then show you one on their home.' : 'Upload a photo of your house. We’ll suggest Home Guard doors that fit its style, then show you one on your home.'}</p>
            {photoUrl && <img className="find-door-photo" src={photoUrl} alt={photoName ? `Uploaded photo ${photoName}` : 'Uploaded entry'} />}
            {pageError && <p className="find-door-note find-door-note-error" role="alert">{pageError}</p>}
            <div className="find-door-actions builder-actions">
              {upload(!photoUrl)}
              {photoUrl && <button type="button" className="next" onClick={() => { setPageError(''); setStep('style') }}>Continue <ArrowRight size={16} /></button>}
            </div>
            <p className="find-door-hint">Best results: daylight, straight on, whole entry in frame.</p>
          </div>
          <figure className="find-door-feature">
            <img src={FEATURED_DOOR.src} width={FEATURED_DOOR.width} height={FEATURED_DOOR.height} alt={FEATURED_DOOR.alt} />
          </figure>
        </div>
        <section className="find-door-gallery" aria-labelledby="find-door-gallery-title">
          <h2 id="find-door-gallery-title">Popular right now</h2>
          <div className="find-door-marquee">
            <div className="find-door-marquee-track">
              <div className="find-door-marquee-set">
                {popularDoors.map((door) => <figure className="find-door-marquee-item" key={door.id}>
                  <img src={door.src} width={door.width} height={door.height} alt={door.alt} loading="lazy" decoding="async" />
                </figure>)}
              </div>
              <div className="find-door-marquee-set" aria-hidden="true">
                {popularDoors.map((door) => <figure className="find-door-marquee-item" key={door.id}>
                  <img src={door.src} width={door.width} height={door.height} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                </figure>)}
              </div>
            </div>
          </div>
        </section>
      </>}
      {step === 'style' && <section className="find-door-question">
        <h1>What should it feel like?</h1>
        <div className="find-door-choices" role="group" aria-label="Door style">
          {STYLE_CHOICES.map((choice) => <button type="button" key={choice.id} className={mood === choice.id ? 'find-door-choice selected' : 'find-door-choice'} aria-pressed={mood === choice.id} onClick={() => setMood(choice.id)}><strong>{choice.name}</strong><span>{choice.description}</span></button>)}
        </div>
        <div className="builder-actions find-door-actions">
          <button type="button" className="back" onClick={() => setStep('photo')}><ArrowLeft size={16} /> Back</button>
          <button type="button" className="next" disabled={!mood} onClick={() => setStep('glass')}>Next <ArrowRight size={16} /></button>
        </div>
      </section>}
      {step === 'glass' && <section className="find-door-question">
        <h1>How much glass?</h1>
        <div className="find-door-choices" role="group" aria-label="Glass and privacy">
          {LIGHT_CHOICES.map((choice) => <button type="button" key={choice.id} className={light === choice.id ? 'find-door-choice selected' : 'find-door-choice'} aria-pressed={light === choice.id} onClick={() => setLight(choice.id)}><strong>{choice.name}</strong><span>{choice.description}</span></button>)}
        </div>
        <div className="builder-actions find-door-actions">
          <button type="button" className="back" onClick={() => setStep('style')}><ArrowLeft size={16} /> Back</button>
          <button type="button" className="next" disabled={!light} onClick={() => { setPageError(''); setStep(dealerMode ? 'results' : 'details'); void readHouse() }}>See my door <ArrowRight size={16} /></button>
        </div>
      </section>}
      {step === 'details' && <form className="find-door-question" onSubmit={(event) => void submitLead(event)}>
        <h1>Where should we send it?</h1>
        <p className="find-door-lead">A dealer follows up from here. Your ZIP stays with the quote.</p>
        <div className="find-door-fields">
          <label htmlFor="find-door-name">Full name<input id="find-door-name" name="fullName" autoComplete="name" value={contact.fullName} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? 'find-door-name-error' : undefined} onBlur={() => touch('fullName')} onChange={(event) => setContact({ ...contact, fullName: event.target.value })} />{errors.fullName && <small id="find-door-name-error">{errors.fullName}</small>}</label>
          <label htmlFor="find-door-email">Email<input id="find-door-email" name="email" type="email" autoComplete="email" value={contact.email} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'find-door-email-error' : undefined} onBlur={() => touch('email')} onChange={(event) => setContact({ ...contact, email: event.target.value })} />{errors.email && <small id="find-door-email-error">{errors.email}</small>}</label>
          <label htmlFor="find-door-phone">Phone<input id="find-door-phone" name="phone" type="tel" autoComplete="tel" value={contact.phone} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'find-door-phone-error' : undefined} onBlur={() => touch('phone')} onChange={(event) => setContact({ ...contact, phone: event.target.value })} />{errors.phone && <small id="find-door-phone-error">{errors.phone}</small>}</label>
          <label htmlFor="find-door-zip">ZIP code<input id="find-door-zip" name="zip" autoComplete="postal-code" inputMode="numeric" value={contact.zip} aria-invalid={!!errors.zip} aria-describedby={errors.zip ? 'find-door-zip-error' : undefined} onBlur={() => touch('zip')} onChange={(event) => setContact({ ...contact, zip: event.target.value })} />{errors.zip && <small id="find-door-zip-error">{errors.zip}</small>}</label>
        </div>
        {reading && <div aria-hidden="true"><div className="find-door-skeleton" /><div className="find-door-skeleton" /></div>}
        <p className="find-door-note" role="status">{reading ? 'Choosing doors.' : current ? 'Your door is ready.' : 'Choose a photo and a style to continue.'}</p>
        {pageError && <p className="find-door-note find-door-note-error" role="alert">{pageError}</p>}
        <div className="builder-actions find-door-actions">
          <button type="button" className="back" onClick={() => setStep('glass')}><ArrowLeft size={16} /> Back</button>
          <button type="submit" className="next" disabled={sending || reading || !current}>{sending ? 'Sending…' : 'Show my door'}</button>
          {pageError && current && <button type="button" className="find-door-quiet" onClick={() => setStep('results')}>View the door first</button>}
        </div>
      </form>}
      {step === 'results' && !current && <section className="find-door-question" aria-live="polite">
        <h1>{pageError ? 'No door yet.' : 'Choosing doors.'}</h1>
        {reading && <div aria-hidden="true"><div className="find-door-skeleton" /><div className="find-door-skeleton" /><div className="find-door-skeleton-stage find-door-skeleton" /></div>}
        {pageError && <p className="find-door-note find-door-note-error" role="alert">{pageError}</p>}
        {pageError && <button type="button" className="next" onClick={() => void readHouse()}>Try again</button>}
      </section>}
      {step === 'results' && current && photoUrl && <div className="find-door-results">
        <div className="find-door-options">
          {!photoRead && <p className="find-door-read">These follow your style and glass choices.</p>}
          <div className="find-door-picks" role="group" aria-label="Recommended doors">
            {recommendations.map((item, index) => <div className={index === selected ? 'find-door-pick selected' : 'find-door-pick'} key={item.cacheKey}>
              <OptionCard title={item.title} description={`${item.finishName} · ${item.glassName}`} selected={index === selected} onClick={() => chooseRecommendation(index)} visual={<span className="find-door-mini"><DoorPreview {...item.preview} view="Exterior" showViewToggle={false} /></span>} />
              {index === selected && <p className="find-door-reason">{oneLine(item.reason)}</p>}
            </div>)}
          </div>
          <section className="find-door-details" aria-label="Door details">
            <div className="mini-summary">
              <span><b>Hardware</b><strong>{current.hardwareName}</strong></span>
              <span><b>Opening</b><strong>{current.openingLabel}</strong></span>
            </div>
          </section>
          <div className="builder-actions find-door-actions">
            <button type="button" className="next" onClick={customize}>Customize this door <ArrowRight size={16} /></button>
            <button type="button" className="find-door-text" onClick={() => { setStep('photo'); setPageError('') }}>Try another photo</button>
            {sent && !dealerMode && <p className="find-door-sent">Your details were sent.</p>}
            {dealerMode && <p className="find-door-sent">Dealer Mode skips the contact form.</p>}
            {dealerBrand && <p className="find-door-sent">Shared with {dealerBrand.companyName}</p>}
          </div>
        </div>
        <aside className="find-door-stage">
          <div className="preview-view-toggle" role="group" aria-label="Preview">
            <button type="button" className={previewMode === 'door' ? 'active' : ''} aria-pressed={previewMode === 'door'} onClick={() => setPreviewMode('door')}>Door</button>
            <button type="button" className={previewMode === 'house' ? 'active' : ''} aria-pressed={previewMode === 'house'} onClick={seeHouse}>On my house</button>
          </div>
          <div className="aside-preview-area">
            {!houseReady && <DoorPreview {...current.preview} view="Exterior" showViewToggle={false} />}
            <HouseRender ref={houseRef} photoUrl={photoUrl} resolved={current} showHouse={previewMode === 'house'} onProgress={setRenderStatus} />
          </div>
        </aside>
      </div>}
    </main>
    <SiteFooter currentStep="find-my-door" configuration={{ 'HGI Door Finder': current?.title ?? '' }} dealerBrand={dealerBrand} dealerAccess={<DealerMode session={dealerSession} bannerTarget={bannerTarget} onExit={() => undefined} />} />
  </div>
}
