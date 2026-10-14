import { useEffect, type RefObject } from 'react'

/** Presentation only: size cards from the tallest intrinsic content in each
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
        const regions = { card: 0 }
        const contentHeights: number[] = []
        for (const card of cards) {
          const copy = card.querySelector('.option-copy')
          let copyHeight = 0
          if (copy) {
            // Copy no longer flexes or has a shared minimum: its box is its
            // intrinsic content, including wrapping, padding and text gaps.
            copyHeight = copy.getBoundingClientRect().height
          }
          const controls = card.querySelector<HTMLElement>('.hardware-finish-options, .glass-caming-options')
          const controlsHeight = controls?.getBoundingClientRect().height ?? 0
          const css = getComputedStyle(card)
          const visualHeight = card.querySelector('.option-visual')?.getBoundingClientRect().height ?? 0
          contentHeights.push(visualHeight + copyHeight + controlsHeight + parseFloat(css.paddingTop) + parseFloat(css.paddingBottom) + parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth))
        }
        regions.card = Math.max(...contentHeights)
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
