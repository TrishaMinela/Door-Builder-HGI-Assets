import { useEffect, type RefObject } from 'react'

/** Presentation only: size text/control regions to the tallest content in each
 * visible grid, without truncating labels or assigning an arbitrary card height. */
export function useProductCardLayout(root: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const host = root.current
    if (!active || !host) return
    let frame = 0
    let disposed = false
    const grids = new Set<HTMLElement>()
    const resize = new ResizeObserver(() => schedule())
    function schedule() {
      if (disposed) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    function measure() {
      const current = new Set<HTMLElement>()
      for (const grid of host!.querySelectorAll<HTMLElement>('.options-grid, .double-door-lock-prep-options')) {
        const cards = [...grid.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el.matches('.option-card, .glass-choice-card, .hardware-option-card'))
        if (!cards.length) continue
        current.add(grid)
        grid.dataset.equalProductGrid = ''
        const regions = { eyebrow: 0, title: 0, description: 0, controls: 0 }
        for (const card of cards) {
          const copy = card.querySelector('.option-copy')
          for (const [key, selector] of [['eyebrow', ':scope > small'], ['title', ':scope > strong'], ['description', ':scope > span']] as const) {
            const el = copy?.querySelector<HTMLElement>(selector)
            if (!el?.textContent?.trim()) continue
            const range = document.createRange()
            range.selectNodeContents(el)
            const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.4
            regions[key] = Math.max(regions[key], Math.ceil(range.getBoundingClientRect().height / lineHeight) * lineHeight)
          }
          const controls = card.querySelector<HTMLElement>('.hardware-finish-options, .glass-caming-options')
          if (controls) {
            // Remove the previous shared minimum while measuring intrinsic wrap.
            const previous = controls.style.minHeight
            controls.style.minHeight = '0'
            regions.controls = Math.max(regions.controls, controls.getBoundingClientRect().height)
            controls.style.minHeight = previous
          }
        }
        for (const [key, value] of Object.entries(regions)) {
          const property = `--product-${key}-height`
          const next = `${Math.ceil(value)}px`
          if (grid.style.getPropertyValue(property) !== next) grid.style.setProperty(property, next)
        }
        if (!grids.has(grid)) { grids.add(grid); resize.observe(grid) }
      }
      for (const grid of grids) if (!current.has(grid)) { resize.unobserve(grid); grids.delete(grid) }
    }
    const mutation = new MutationObserver(schedule)
    mutation.observe(host, { childList: true, characterData: true, subtree: true })
    window.addEventListener('resize', schedule)
    document.fonts.ready.then(schedule)
    schedule()
    return () => { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); mutation.disconnect(); window.removeEventListener('resize', schedule) }
  }, [root, active])
}
