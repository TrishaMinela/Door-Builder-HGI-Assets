import type { DoorConfigurationType, DoorSwing, HardwareView, SideliteConfiguration, SideliteProductCode } from '../types.js'
import { doorHandingSides } from './doorHanding.js'

export type { SideliteProductCode } from '../types.js'
export type SideliteInput = SideliteConfiguration | SideliteProductCode | 'both' | 'left' | 'right' | '' | null | undefined

export type SideliteProductOption = {
  code: SideliteProductCode
  label: string
  legacyValue: SideliteConfiguration
  placement: 'none' | 'both' | 'left' | 'right'
  image: string
}

export const sideliteProductOptions: readonly SideliteProductOption[] = [
  { code: 'NOSIDE', label: 'NOSIDE - NO SIDE LITE WITH THE DOOR', legacyValue: 'none', placement: 'none', image: '/assets/hgi-assets/Sidelites/options/No Sidelites.webp' },
  { code: 'BOTHSIDES', label: 'BOTHSIDES - SIDELITES ON BOTH SIDES', legacyValue: 'both-sides', placement: 'both', image: '/assets/hgi-assets/Sidelites/options/Both-Sides Sidelites.webp' },
  { code: 'LEFTSIDE', label: 'LEFTSIDE - SIDELITE ON LEFT OSLI', legacyValue: 'hinge-side', placement: 'left', image: '/assets/hgi-assets/Sidelites/options/Left Side OSLI.webp' },
  { code: 'RIGHTSIDE', label: 'RIGHTSIDE - SIDELITE ON RIGHT OSLI', legacyValue: 'lock-side', placement: 'right', image: '/assets/hgi-assets/Sidelites/options/Right Side OSLI.webp' },
] as const

export type SideliteBuilderOption = {
  id: SideliteConfiguration
  name: string
  image: string
}

const singleDoorBuilderOptions: readonly SideliteBuilderOption[] = [
  { id: 'none', name: 'No Sidelite', image: '/assets/hgi-assets/Sidelites/options/No Sidelites.webp' },
  { id: 'both-sides', name: 'Both Sidelites', image: '/assets/hgi-assets/Sidelites/options/Both-Sides Sidelites.webp' },
  { id: 'lock-side', name: 'Lock Side', image: '/assets/hgi-assets/Sidelites/options/Lock-Side Sidelite.webp' },
  { id: 'hinge-side', name: 'Hinge Side', image: '/assets/hgi-assets/Sidelites/options/Hinge-Side Sidelite.webp' },
]

const doubleDoorBuilderOptions: readonly SideliteBuilderOption[] = sideliteProductOptions.map((option) => ({
  id: option.legacyValue,
  name: singleDoorBuilderOptions.find(item => item.id === option.legacyValue)!.name,
  image: option.code === 'NOSIDE'
    ? '/assets/hgi-assets/Sidelites/options/Double Door No Side.webp'
    : option.code === 'BOTHSIDES'
      ? '/assets/hgi-assets/Sidelites/options/Double Door Both Sides.webp'
      : option.code === 'LEFTSIDE'
        ? '/assets/hgi-assets/Sidelites/options/Double Door Left Side.webp'
        : '/assets/hgi-assets/Sidelites/options/Double Door Right Side.webp',
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

export function sideliteProductCode(value: SideliteInput, handing?: DoorSwing['id']): SideliteProductCode {
  const placement = sidelitePlacement(value, handing)
  return placement === 'left' ? 'LEFTSIDE' : placement === 'right' ? 'RIGHTSIDE' : placement === 'both' ? 'BOTHSIDES' : 'NOSIDE'
}

export function sideliteProductLabel(value: SideliteInput, handing?: DoorSwing['id']): string {
  return optionByCode.get(sideliteProductCode(value, handing))!.label
}

export function normalizeLegacySidelite(value: SideliteInput, handing?: DoorSwing['id']): SideliteConfiguration {
  if (handing && ['LEFTSIDE', 'RIGHTSIDE', 'left', 'right'].includes(String(value))) {
    return sideliteProductOption(value).placement === doorHandingSides(handing).hingeSide ? 'hinge-side' : 'lock-side'
  }
  return sideliteProductOption(value).legacyValue
}

export function resolveSidelitePosition({ relationship, handing, view = 'Exterior' }: { relationship: SideliteInput; handing?: DoorSwing['id'] | null; view?: HardwareView }): SideliteProductOption['placement'] | null {
  if (relationship === 'hinge-side' || relationship === 'lock-side') {
    if (!handing) return null
    const sides = doorHandingSides(handing, view)
    return relationship === 'hinge-side' ? sides.hingeSide : sides.lockSide
  }
  const physical = sideliteProductOption(relationship).placement
  return view === 'Interior' && (physical === 'left' || physical === 'right') ? (physical === 'left' ? 'right' : 'left') : physical
}

/** Legacy callers without handing retain their existing LHI convention.
 * Customer previews use resolveSidelitePosition and wait for actual handing. */
export function sidelitePlacement(value: SideliteInput, handing: DoorSwing['id'] = 'LHI'): SideliteProductOption['placement'] {
  return resolveSidelitePosition({ relationship: value, handing })!
}

export function sideliteRelationshipLabel(value: SideliteInput) {
  return singleDoorBuilderOptions.find(item => item.id === value)?.name ?? sideliteProductLabel(value)
}
