import { useEffect, useRef, type ReactNode } from 'react'
import { Globe, Mail, MapPin, Phone } from 'lucide-react'
import { BetaFeedback } from './BetaFeedback'

type Props = { currentStep: string; configuration: Record<string, string>; dealerAccess?: ReactNode }

export function SiteFooter({ currentStep, configuration, dealerAccess }: Props) {
  const footerRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const footer = footerRef.current
    const app = footer?.parentElement
    if (!footer || !app) return
    let frame = 0
    const measure = () => {
      frame = 0
      // Fixed phone navigation stops at the footer, just as sticky navigation
      // would stop at its containing block. No footer-height guess is needed.
      app.style.setProperty('--footer-viewport-overlap', `${Math.max(0, window.innerHeight - footer.getBoundingClientRect().top)}px`)
      app.style.setProperty('--site-footer-height', `${footer.getBoundingClientRect().height}px`)
      const chrome = [...app.children].filter(el => el.matches('header,.builder-toolbar,.editing-bar'))
      app.style.setProperty('--builder-shell-top', `${chrome.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0)}px`)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    const observer = new ResizeObserver(schedule)
    observer.observe(footer)
    for (const child of app.children) if (child.matches('header,.builder-toolbar,.editing-bar,main')) observer.observe(child)
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule)
      app.style.removeProperty('--footer-viewport-overlap'); app.style.removeProperty('--builder-shell-top'); app.style.removeProperty('--site-footer-height')
    }
  }, [currentStep])

  return <footer className="site-footer shared-site-footer" ref={footerRef}>
    <a className="site-footer-logo" href="https://homeguardindustries.com" target="_blank" rel="noreferrer" aria-label="Home Guard Industries website"><img src="/assets/branding/hgi-logo-white.png" alt="Home Guard Industries" /></a>
    <div className="site-footer-contact">
      <div className="site-footer-direct">
        <a href="tel:+18005251885" aria-label="Call Home Guard Industries at 1-800-525-1885"><Phone size={17}/><span>1-800-525-1885</span></a>
        <a href="mailto:getintouch@homeguardindustries.com" aria-label="Email Home Guard Industries"><Mail size={17}/><span>getintouch@homeguardindustries.com</span></a>
      </div>
      <div className="site-footer-location">
        <a href="https://www.google.com/maps/place/13101+Main+St,+Grabill,+IN+46741/@41.20679,-84.9711317,17z/data=!3m1!4b1!4m5!3m4!1s0x8816004dd3ac2ac5:0x8788f6dae643c569!8m2!3d41.20679!4d-84.968943" target="_blank" rel="noreferrer" aria-label="View Home Guard Industries on Google Maps"><MapPin size={17}/><span>13101 Main Street, Grabill, IN 46741</span></a>
        <a href="https://homeguardindustries.com" target="_blank" rel="noreferrer" aria-label="Visit the Home Guard Industries website"><Globe size={17}/><span>homeguardindustries.com</span></a>
      </div>
    </div>
    <div className="site-footer-feedback">
      <BetaFeedback currentStep={currentStep} configuration={configuration}/>
      {dealerAccess}
      <small>Built with <span aria-hidden="true">♥</span> by <a href="https://schoolradius.co/" target="_blank" rel="noreferrer">School Radius</a></small>
    </div>
  </footer>
}
