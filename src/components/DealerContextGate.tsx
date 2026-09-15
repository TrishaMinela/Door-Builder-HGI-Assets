import { useEffect, useState, type ReactNode } from 'react'
import { dealerSlugFromPath } from '../utils/dealerSlug'

type Props = { children: (dealerSlug: string | null) => ReactNode }
type DealerState = 'checking' | 'available' | 'unavailable'

function isUnsupportedBuilderPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  return segments.length > 0 && dealerSlugFromPath(pathname) === null
}

export function DealerContextGate({ children }: Props) {
  const [dealerSlug] = useState(() => dealerSlugFromPath(window.location.pathname))
  const [state, setState] = useState<DealerState>(() => {
    if (isUnsupportedBuilderPath(window.location.pathname)) return 'unavailable'
    return dealerSlug ? 'checking' : 'available'
  })

  useEffect(() => {
    if (!dealerSlug) return
    const controller = new AbortController()

    void fetch(`/api/dealer-context?slug=${encodeURIComponent(dealerSlug)}`, { signal: controller.signal })
      .then((response) => setState(response.ok ? 'available' : 'unavailable'))
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState('unavailable')
      })

    return () => controller.abort()
  }, [dealerSlug])

  if (state === 'checking') {
    return <main className="dealer-link-state"><section><span>Home Guard Door Builder</span><h1>Checking dealer link…</h1></section></main>
  }

  if (state === 'unavailable') {
    return <main className="dealer-link-state"><section><span>Home Guard Door Builder</span><h1>This dealer link is unavailable.</h1><p>Please check the link or visit the main Door Builder.</p><a href="/">Open the Door Builder</a></section></main>
  }

  return children(dealerSlug)
}
