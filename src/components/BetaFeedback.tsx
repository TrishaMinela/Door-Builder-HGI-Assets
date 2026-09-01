import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, X } from 'lucide-react'

type FeedbackConfiguration = Record<string, string>

type Props = {
  currentStep: string
  configuration: FeedbackConfiguration
}

type FeedbackForm = {
  name: string
  email: string
  phone: string
  feedback: string
  website: string
}

const emptyForm: FeedbackForm = { name: '', email: '', phone: '', feedback: '', website: '' }

function deviceType() {
  if (window.innerWidth < 768) return 'mobile'
  if (window.innerWidth < 1200) return 'tablet'
  return 'desktop'
}

export function BetaFeedback({ currentStep, configuration }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FeedbackForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [isPhoneLayout, setIsPhoneLayout] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const [previewTriggerHost, setPreviewTriggerHost] = useState<HTMLElement | null>(null)
  const [heroTriggerHost, setHeroTriggerHost] = useState<HTMLElement | null>(null)
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const feedbackRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setPreviewTriggerHost(document.querySelector<HTMLElement>('[data-feedback-trigger-host="preview"]'))
    setHeroTriggerHost(document.querySelector<HTMLElement>('[data-feedback-trigger-host="hero"]'))
  }, [currentStep])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const updatePhoneLayout = () => setIsPhoneLayout(media.matches)
    updatePhoneLayout()
    media.addEventListener('change', updatePhoneLayout)
    return () => media.removeEventListener('change', updatePhoneLayout)
  }, [])

  const openFeedback = (trigger: HTMLButtonElement) => {
    lastTriggerRef.current = trigger
    setError('')
    setSent(false)
    setOpen(true)
  }

  const close = () => {
    if (submitting) return
    setOpen(false)
    setError('')
    setSent(false)
    requestAnimationFrame(() => lastTriggerRef.current?.focus())
  }

  useEffect(() => {
    if (!open) return
    nameRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? [])
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, submitting])

  const update = (field: keyof FeedbackForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    if (!form.name.trim()) { setError('Please enter your name.'); nameRef.current?.focus(); return }
    if (!form.email.trim()) { setError('Please enter your email.'); return }
    if (!form.phone.trim()) { setError('Please enter your phone number.'); return }
    if (!form.feedback.trim()) { setError('Please enter your feedback.'); feedbackRef.current?.focus(); return }
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/submit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          feedback: form.feedback,
          website: form.website,
          context: {
            pageUrl: window.location.href,
            step: currentStep,
            timestamp: new Date().toISOString(),
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            deviceType: deviceType(),
            userAgent: navigator.userAgent,
          },
          configuration,
        }),
      })
      if (!response.ok) throw new Error('Feedback submission failed.')
      setForm(emptyForm)
      setSent(true)
    } catch {
      setError("We couldn't send your feedback. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const trigger = (className: string, label: string) => <button className={className} type="button" onClick={(event) => openFeedback(event.currentTarget)} aria-haspopup="dialog" aria-label={label}><MessageSquare size={17}/><span>Feedback</span><small>Beta</small></button>

  return <>
    {!isPhoneLayout && previewTriggerHost && createPortal(trigger('beta-feedback-context-trigger', 'Give feedback about the door preview'), previewTriggerHost)}
    {!isPhoneLayout && heroTriggerHost && createPortal(trigger('beta-feedback-context-trigger', 'Give feedback about the home page preview'), heroTriggerHost)}
    {(isPhoneLayout || (!previewTriggerHost && !heroTriggerHost)) && trigger('beta-feedback-context-trigger beta-feedback-page-trigger', 'Open beta feedback form')}
    {open && <div className="beta-feedback-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <div ref={dialogRef} className="beta-feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="beta-feedback-title" aria-describedby="beta-feedback-description">
        <button className="beta-feedback-close" type="button" onClick={close} aria-label="Close feedback"><X size={20}/></button>
        {sent ? <div className="beta-feedback-success" role="status"><MessageSquare size={28}/><h2 id="beta-feedback-title">Thanks for the feedback!</h2><p id="beta-feedback-description">Your feedback has been sent.</p><button type="button" onClick={close}>Close</button></div> : <form onSubmit={submit}>
          <span className="beta-feedback-eyebrow">Beta feedback</span>
          <h2 id="beta-feedback-title">Help us improve</h2>
          <p id="beta-feedback-description">We're currently beta testing the Door Builder. Let us know what worked, what didn't, or anything that could be better.</p>
          <div className="beta-feedback-fields">
            <label>Name <small>Required</small><input ref={nameRef} type="text" autoComplete="name" required maxLength={120} value={form.name} onChange={(event) => update('name', event.target.value)}/></label>
            <label>Email <small>Required</small><input type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => update('email', event.target.value)}/></label>
            <label>Phone <small>Required</small><input type="tel" autoComplete="tel" required maxLength={40} value={form.phone} onChange={(event) => update('phone', event.target.value)}/></label>
            <label className="beta-feedback-message">Feedback <textarea ref={feedbackRef} required maxLength={5000} rows={6} placeholder="Tell us what happened, what you expected, or anything you'd like us to improve..." value={form.feedback} onChange={(event) => update('feedback', event.target.value)}/></label>
            <label className="beta-feedback-honeypot" aria-hidden="true">Website<input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update('website', event.target.value)}/></label>
          </div>
          {error && <p className="beta-feedback-error" role="alert">{error}</p>}
          <div className="beta-feedback-actions"><button type="button" onClick={close} disabled={submitting}>Cancel</button><button type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Send Feedback'}</button></div>
        </form>}
      </div>
    </div>}
  </>
}
