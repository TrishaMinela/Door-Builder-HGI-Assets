import type { GridPattern } from '../types.js'

/** Existing ordinary-clear external-grid geometry. Artwork directory names
 * say INTERNAL GRIDS, but the builder already uses these white templates for
 * external grids. This resolver supplies pixels only, never availability or
 * ordering codes. Unknown opening/pattern pairs must not substitute a grid. */
export function externalGridArtwork(opening: string, pattern: GridPattern): string | undefined {
  const families: Record<string, { prefix: string; patterns: string[] }> = {
    F: { prefix: 'F', patterns: ['8 Lite', '10 Lite', '15 Lite'] },
    F48: { prefix: 'F48', patterns: ['12 Lite'] },
    F482: { prefix: 'F48', patterns: ['12 Lite'] },
    S: { prefix: 'S', patterns: ['4 Lite', '9 Lite'] },
  }
  const family = families[opening]
  if (!family?.patterns.includes(pattern)) return undefined
  const code = pattern.replace(' Lite', 'L')
  return `/assets/hgi-assets/Glass/${family.prefix}/INTERNAL GRIDS/${family.prefix}INT${code}WH.webp`
}
