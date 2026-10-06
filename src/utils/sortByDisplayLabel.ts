const displayLabelCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

/** Presentation-only: keep catalog order/defaults intact and preserve equal-label order. */
export function sortByDisplayLabel<T>(options: readonly T[], label: (option: T) => string): T[] {
  return options.map((option, index) => ({ option, index }))
    .sort((a, b) => displayLabelCollator.compare(label(a.option).trim(), label(b.option).trim()) || a.index - b.index)
    .map(({ option }) => option)
}
