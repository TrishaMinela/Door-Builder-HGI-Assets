type NamedGlass = { id: string; name: string }

// These are the existing catalog's plain-Clear records, not alphabetical
// defaults. Opening-specific artwork/codes remain on the destination record.
const plainClearIds = new Set([
  'clear', 'clear-no-grids', 'f-clear-no-grids', 'f48-clear-no-grids', 's-clear-no-grids',
  'hrt-clear-s11rt', 'n-clear-ncl', 'qa-clear-qacl', 'sat-clear-nonstock',
  'so-clear-nonstock', 'f-clear-nonstock', 's-clear-nonstock',
])
export function clearGlassOption<T extends NamedGlass>(options: readonly T[]): T | undefined {
  return options.find(option => /(?:^|-)clear-no-grids$/.test(option.id))
    ?? options.find(option => option.id === 'clear')
    ?? options.find(option => plainClearIds.has(option.id))
    // These openings only declare Clear with their fixed external grille.
    ?? options.find(option => option.id === 'frt-clear-f17rt' || option.id === 'sw-clear-swg')
}

const fullName = (name: string) => name.trim().toLowerCase().replace(/\s*[–—-]\s*/g, '-').replace(/\s+/g, ' ')

/** Call with destination-compatible, customer-selectable options only.
 * Equal full catalog names verify opening-specific aliases; never match only
 * a family name (which would silently switch caming/finish variants).
 */
export function retainGlassSelection<T extends NamedGlass>(current: NamedGlass | null | undefined, options: readonly T[]): T | undefined {
  const exact = current && options.find(option => option.id === current.id)
  if (exact) return exact
  if (current) {
    const matches = options.filter(option => fullName(option.name) === fullName(current.name))
    if (new Set(matches.map(option => option.id)).size === 1) return matches[0]
  }
  return clearGlassOption(options)
}
