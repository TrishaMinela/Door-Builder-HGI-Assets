import type { SideliteConfiguration, SideliteProductCode } from '../types'

export type { SideliteProductCode } from '../types'
export type SideliteInput = SideliteConfiguration | SideliteProductCode | 'both' | 'left' | 'right' | '' | null | undefined

export type SideliteProductOption = {
  code: SideliteProductCode
  label: string
  legacyValue: SideliteConfiguration
  placement: 'none' | 'both' | 'left' | 'right'
  image: string
}

export const sideliteProductOptions: readonly SideliteProductOption[] = [
  { code: 'NOSIDE', label: 'NOSIDE - NO SIDE LITE WITH THE DOOR', legacyValue: 'none', placement: 'none', image: '/assets/hgi-assets/Sidelites/options/No Sidelites.png' },
  { code: 'BOTHSIDES', label: 'BOTHSIDES - SIDELITES ON BOTH SIDES', legacyValue: 'both-sides', placement: 'both', image: '/assets/hgi-assets/Sidelites/options/Both-Sides Sidelites.png' },
  { code: 'LEFTSIDE', label: 'LEFTSIDE - SIDELITE ON LEFT OSLI', legacyValue: 'hinge-side', placement: 'left', image: '/assets/hgi-assets/Sidelites/options/Left Side OSLI.png' },
  { code: 'RIGHTSIDE', label: 'RIGHTSIDE - SIDELITE ON RIGHT OSLI', legacyValue: 'lock-side', placement: 'right', image: '/assets/hgi-assets/Sidelites/options/Right Side OSLI.png' },
] as const

const optionByCode = new Map(sideliteProductOptions.map((option) => [option.code, option]))
const codeByInput: Record<string, SideliteProductCode> = {
  none: 'NOSIDE',
  NOSIDE: 'NOSIDE',
  both: 'BOTHSIDES',
  'both-sides': 'BOTHSIDES',
  BOTHSIDES: 'BOTHSIDES',
  left: 'LEFTSIDE',
  'hinge-side': 'LEFTSIDE',
  LEFTSIDE: 'LEFTSIDE',
  right: 'RIGHTSIDE',
  'lock-side': 'RIGHTSIDE',
  RIGHTSIDE: 'RIGHTSIDE',
}

export function sideliteProductOption(value: SideliteInput): SideliteProductOption {
  return optionByCode.get(codeByInput[String(value ?? '')] ?? 'NOSIDE') ?? sideliteProductOptions[0]
}

export function sideliteProductCode(value: SideliteInput): SideliteProductCode {
  return sideliteProductOption(value).code
}

export function sideliteProductLabel(value: SideliteInput): string {
  return sideliteProductOption(value).label
}

export function normalizeLegacySidelite(value: SideliteInput): SideliteConfiguration {
  return sideliteProductOption(value).legacyValue
}

export function sidelitePlacement(value: SideliteInput): SideliteProductOption['placement'] {
  return sideliteProductOption(value).placement
}
