import { useEffect, useRef, useState } from 'react'
import { HOMEPAGE_AI_DOORS, HOMEPAGE_DOOR_FADE_MS, HOMEPAGE_DOOR_INTERVAL_MS } from './homepageAiDoors'
import './homepageDoorShowcase.css'

type Display = { current: number | null; previous: number | null; animate: boolean }

/** Homepage-only photos. Decode one upcoming door before replacing a visible one. */
export function HomepageDoorShowcase() {
  const [display, setDisplay] = useState<Display>({ current: null, previous: null, animate: false })
  const displayError = useRef<(index: number) => void>(() => {})

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let active = true
    let current: number | null = null
    let fallback: number | null = null
    let candidate: { index: number; ready: boolean; failed: boolean } | null = null
    let timer: number | undefined
    let fade: number | undefined
    const failed = new Set<number>()
    const cached = new Set<number>()
    const cancelLoads = new Set<() => void>()
    const preload = document.createElement('link')
    preload.rel = 'preload'
    preload.as = 'image'
    preload.href = HOMEPAGE_AI_DOORS[0].src
    preload.setAttribute('fetchpriority', 'high')
    document.head.appendChild(preload)

    const load = (index: number) => new Promise<boolean>(resolve => {
      if (cached.has(index)) { resolve(true); return }
      const image = new Image()
      image.decoding = 'async'
      image.fetchPriority = index === 0 ? 'high' : 'low'
      let settled = false
      const finish = (ok: boolean) => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        image.onload = image.onerror = null
        cancelLoads.delete(cancel)
        if (ok) cached.add(index)
        else if (active) failed.add(index)
        resolve(ok)
      }
      const cancel = () => finish(false)
      const timeout = window.setTimeout(cancel, 8000)
      cancelLoads.add(cancel)
      image.onload = () => { void image.decode().then(() => finish(image.naturalWidth > 0), () => finish(false)) }
      image.onerror = cancel
      image.src = HOMEPAGE_AI_DOORS[index].src
    })

    const publish = (index: number) => {
      if (!active || current === index) return
      fallback = current
      current = index
      window.clearTimeout(fade)
      setDisplay(value => ({ current: index, previous: motion.matches ? null : value.current, animate: !motion.matches && value.current !== null }))
      fade = window.setTimeout(() => {
        if (active) setDisplay(value => ({ ...value, previous: null, animate: false }))
      }, HOMEPAGE_DOOR_FADE_MS)
    }
    const prepare = (index: number) => {
      const next = { index, ready: false, failed: false }
      candidate = next
      void load(index).then(ok => {
        if (!active || candidate !== next) return
        next.ready = ok
        next.failed = !ok
      })
    }
    const prepareUpcoming = () => {
      const start = candidate?.index ?? current ?? 0
      for (let offset = 1; offset <= HOMEPAGE_AI_DOORS.length; offset++) {
        const index = (start + offset) % HOMEPAGE_AI_DOORS.length
        if (index !== current && !failed.has(index)) { prepare(index); return }
      }
      candidate = null
    }
    const tick = () => {
      if (!candidate) return
      if (candidate.ready) { publish(candidate.index); prepareUpcoming() }
      else if (candidate.failed) prepareUpcoming()
      // A slow or broken upcoming image never removes the last good image.
    }
    const updateMotion = () => {
      window.clearInterval(timer)
      if (motion.matches) {
        window.clearTimeout(fade)
        setDisplay(value => ({ ...value, previous: null, animate: false }))
      } else {
        if (!candidate && current !== null) prepareUpcoming()
        timer = window.setInterval(tick, HOMEPAGE_DOOR_INTERVAL_MS)
      }
    }
    displayError.current = index => {
      if (!active) return
      failed.add(index)
      cached.delete(index)
      if (current === index) {
        current = fallback !== null && !failed.has(fallback) ? fallback : null
        window.clearTimeout(fade)
        setDisplay({ current, previous: null, animate: false })
      }
    }
    // Start with just the first image; reduced motion never fetches the other 21.
    void load(0).then(ok => {
      if (!active) return
      if (ok) publish(0)
      else candidate = { index: 0, ready: false, failed: true }
      if (!motion.matches) prepareUpcoming()
    })
    updateMotion()
    motion.addEventListener('change', updateMotion)
    return () => {
      active = false
      window.clearInterval(timer)
      window.clearTimeout(fade)
      motion.removeEventListener('change', updateMotion)
      cancelLoads.forEach(cancel => cancel())
      preload.remove()
      displayError.current = () => {}
    }
  }, [])

  return <>{[display.previous, display.current].map((index, layer) => index === null ? null : <div
    key={HOMEPAGE_AI_DOORS[index].id}
    className={`home-demo-door-layer hero-ai-layer ${layer === 1 ? 'active' : 'previous'}${layer === 1 && display.animate ? ' is-entering' : ''}`}
    style={{ animationDuration: `${HOMEPAGE_DOOR_FADE_MS}ms` }}
    data-homepage-door={HOMEPAGE_AI_DOORS[index].id}
  ><img className="hero-static-door-image" src={HOMEPAGE_AI_DOORS[index].src} alt={HOMEPAGE_AI_DOORS[index].alt}
    width="224" height="508" decoding="async" fetchPriority={index === 0 ? 'high' : 'auto'}
    onError={() => displayError.current(index)} /></div>)}</>
}
