export type BuilderGroup = 'Door' | 'Finish' | 'Glass' | 'Hardware'

/** Presentation only; the existing conditional page sequence remains authoritative. */
export function builderGroupForPage(page: string): BuilderGroup | 'Review & Quote' {
  if (page === 'review') return 'Review & Quote'
  if (page === 'hardware' || page === 'lock-setup') return 'Hardware'
  if (page === 'door-finish' || page === 'jamb-type' || page === 'jamb-finish') return 'Finish'
  if (page.startsWith('glass') || page.startsWith('grid-') || page.startsWith('sidelite-glass') || page.startsWith('sidelite-grid')) return 'Glass'
  return 'Door'
}

export function builderGroupStart(pages: readonly string[], group: BuilderGroup): number {
  return pages.findIndex(page => builderGroupForPage(page) === group)
}
