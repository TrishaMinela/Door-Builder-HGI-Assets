const hiddenDecorativeNames = new Set(['courtyard', 'briselle', 'berkley', 'ashbury', 'elegant', 'monterey', 'calandra'])
const hiddenDecorativeIds = new Set([
  ...hiddenDecorativeNames, 'cr14pl-monterey', 'elegant-black-white', 'elegant-nickel', 'elegant-patina',
  'monterey-nickel', 'monterey-patina', 'cou', 'ber', 'ash', 'cal', 'elebw', 'eleni', 'elepa', 'monni', 'monpa',
])

/** Retain catalog declarations/artwork, but reject these customer selections.
 * BRI/Bristol is deliberately not an alias for Briselle. */
export function isHiddenDecorativeGlass(option: { id?: string; name?: string }) {
  const name = (option.name ?? '').split(/\s+[–—-]\s+/)[0].trim().toLowerCase()
  return hiddenDecorativeNames.has(name) || hiddenDecorativeIds.has((option.id ?? '').trim().toLowerCase())
}

/** Customer visibility is separate from the historical/renderable catalog. */
export function isCustomerSelectableGlass(option: { id: string; name: string }) {
  return option.id !== 'linen' && !/\blinen\b/i.test(option.name) && !isHiddenDecorativeGlass(option)
}
