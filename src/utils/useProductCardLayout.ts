import { useEffect, type RefObject } from 'react'

/** Presentation only: size the complete copy/control regions to the tallest content in each
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
        const regions = { copy: 0, controls: 0 }
        for (const card of cards) {
          const copy = card.querySelector('.option-copy')
          if (copy) {
            // Equalize the whole copy block, not each text line independently.
            // Short titles keep their descriptions nearby instead of inheriting
            // empty title/eyebrow space from the longest label in the catalog.
            const css = getComputedStyle(copy)
            const children = [...copy.children].filter(el => getComputedStyle(el).display !== 'none')
            const contentHeight = children.reduce((height, el) => height + el.getBoundingClientRect().height, 0)
            const padding = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom)
            const gap = (parseFloat(css.rowGap) || 0) * Math.max(0, children.length - 1)
            regions.copy = Math.max(regions.copy, contentHeight + padding + gap)
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
