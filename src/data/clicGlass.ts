import type { DoorConfigurationType } from '../types.js'

// FeneVision expanded findings, 19 October 2026. This is coverage, not a
// universal manufacturing allowlist. No ordinary CLEARS rules/codes are used.
export type ClicContext = { configurationType: DoorConfigurationType | ''; lineId?: string; grain?: string | null; openingCodes: string[] }
const singleOpenings: Record<string, string[]> = {
  '22-gauge-steel': ['F', 'F48', 'S'],
  '20-gauge-smooth-steel': ['F', 'F48', 'F482', 'S'],
  'signature-cherry': ['F', 'F482', 'S'], 'signature-fir': ['F'],
  'signature-mahogany': ['F', 'F48', 'S'], 'signature-oak': ['F', 'S'],
  'brushed-smooth-fiberglass': ['F', 'F482', 'S'], 'textured-fiberglass': ['F', 'F48', 'S'],
}
const frenchOpenings: Record<string, string[]> = {
  '22-gauge-steel': ['F'], '20-gauge-smooth-steel': ['F', 'F48', 'F482', 'S'],
  'signature-cherry': ['F', 'F482', 'S'],
}
const keyFor = (context: ClicContext) => context.lineId === 'signature-series'
  ? `signature-${context.grain?.toLowerCase() ?? ''}` : context.lineId ?? ''
export const isClicGlass = (option: { id?: string }) => /^(?:f|f48|s)-clic-/.test(option.id ?? '') || option.id === 'clic-nogrid'
export const isLegacyClicGlass = (option: { id?: string; name?: string }) => ['entl', 'entr'].includes(option.id ?? '') || /^CLiC\s*[–-]\s*(Left|Right)$/i.test(option.name ?? '')

export function clicAvailable(context: ClicContext, sideliteStyle?: string) {
  const key = keyFor(context)
  const allowed = context.configurationType === 'single' ? singleOpenings[key]
    : context.configurationType === 'french' ? frenchOpenings[key]
      : context.configurationType === 'savannah' && ['22-gauge-steel', '20-gauge-smooth-steel'].includes(key) ? ['F'] : undefined
  if (!allowed?.some(code => context.openingCodes.includes(code))) return false
  if (!sideliteStyle) return true
  if (!['fsl', 'f48sl', 'ssl'].includes(sideliteStyle)) return false
  if (context.configurationType === 'savannah') return false // sidelite paths unfinished
  if (context.configurationType === 'french') return key === 'signature-cherry' || (key === '22-gauge-steel' && sideliteStyle === 'fsl')
  return key !== 'signature-fir' || sideliteStyle === 'fsl'
}

export function clicOrderingCodes(id: string): string[] | undefined {
  if (id === 'clic-nogrid') return ['CLICS', 'NOGRID', 'NONSTOCKSLGL']
  const match = /^(f|f48|s)-clic-(nogrid|ext-(\d+)l)$/.exec(id)
  if (!match) return undefined
  const lites: Record<string, string[]> = { f: ['8', '10', '15'], f48: ['12'], s: ['4', '9'] }
  if (match[2] !== 'nogrid' && !lites[match[1]].includes(match[3])) return undefined
  return ['CLIC', ...(match[2] === 'nogrid' ? ['NOGRID'] : ['EXTG', `${match[3]}L`]), 'NONSTOCKGL']
}
export function clicDisplayName(id: string) {
  const codes = clicOrderingCodes(id)
  return codes ? codes.includes('NOGRID') ? 'CLiC – No grids' : `CLiC – External grids (${codes[2].replace('L', '')} lite)` : undefined
}

export const clicSideliteOption = { id: 'clic-nogrid', name: 'CLiC – No grids', category: 'clic' as const, orderingCodes: clicOrderingCodes('clic-nogrid')! }
