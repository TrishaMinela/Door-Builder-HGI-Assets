import type { DoorConfigurationType, SideliteConfiguration, SideliteProductCode } from '../types'

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

export type SideliteBuilderOption = {
  id: SideliteConfiguration
  name: string
  image: string
}

const singleDoorBuilderOptions: readonly SideliteBuilderOption[] = [
  { id: 'none', name: 'No Sidelite', image: '/assets/hgi-assets/Sidelites/options/No Sidelites.png' },
  { id: 'both-sides', name: 'Both Sidelites', image: '/assets/hgi-assets/Sidelites/options/Both-Sides Sidelites.png' },
  { id: 'lock-side', name: 'Lock Side', image: '/assets/hgi-assets/Sidelites/options/Lock-Side Sidelite.png' },
  { id: 'hinge-side', name: 'Hinge Side', image: '/assets/hgi-assets/Sidelites/options/Hinge-Side Sidelite.png' },
]

const doubleDoorBuilderOptions: readonly SideliteBuilderOption[] = sideliteProductOptions.map((option) => ({
  id: option.legacyValue,
  name: option.label,
  image: option.code === 'NOSIDE'
    ? '/assets/hgi-assets/Sidelites/options/Double Door No Side.png'
    : option.code === 'BOTHSIDES'
      ? '/assets/hgi-assets/Sidelites/options/Double Door Both Sides.png'
      : option.code === 'LEFTSIDE'
        ? '/assets/hgi-assets/Sidelites/options/Double Door Left Side.png'
        : '/assets/hgi-assets/Sidelites/options/Double Door Right Side.png',
}))

export function sideliteBuilderOptions(configurationType: DoorConfigurationType | '' | null | undefined): readonly SideliteBuilderOption[] {
  return configurationType === 'french' || configurationType === 'savannah' ? doubleDoorBuilderOptions : singleDoorBuilderOptions
}

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
