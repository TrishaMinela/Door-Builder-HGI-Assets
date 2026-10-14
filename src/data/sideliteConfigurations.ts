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
  // These legacy filenames describe the pictured swing, not fixed OSLI sides:
  // Lock-Side shows one slab with glass on the left; Hinge-Side on the right.
  // The assets named Left/Right Side OSLI instead depict two slabs.
  if (!configurationType || configurationType === 'single') return singleDoorBuilderOptions.map(option => option.id === 'hinge-side' ? { ...option, id: 'left', name: 'Left', image: '/assets/hgi-assets/Sidelites/options/Lock-Side Sidelite.webp' } : option.id === 'lock-side' ? { ...option, id: 'right', name: 'Right', image: '/assets/hgi-assets/Sidelites/options/Hinge-Side Sidelite.webp' } : option)
  if (configurationType === 'french') return doubleDoorBuilderOptions.map(option => ({ ...option, name: option.id === 'hinge-side' ? 'Left Sidelite' : option.id === 'lock-side' ? 'Right Sidelite' : option.name }))
  return configurationType === 'savannah' ? doubleDoorBuilderOptions : singleDoorBuilderOptions
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

export function sideliteProductCode(value: SideliteInput, handing?: DoorSwing['id'], configurationType?: DoorConfigurationType): SideliteProductCode {
  const placement = sidelitePlacement(value, handing, configurationType)
  if (configurationType === 'single' && (placement === 'left' || placement === 'right')) return placement === doorHandingSides(handing ?? 'LHI', 'Exterior').hingeSide ? 'HINGESIDE' : 'LOCKSIDE'
  return placement === 'left' ? 'LEFTSIDE' : placement === 'right' ? 'RIGHTSIDE' : placement === 'both' ? 'BOTHSIDES' : 'NOSIDE'
}

export function sideliteProductLabel(value: SideliteInput, handing?: DoorSwing['id'], configurationType?: DoorConfigurationType): string {
  const code = sideliteProductCode(value, handing, configurationType)
  if (code === 'HINGESIDE' || code === 'LOCKSIDE') return `${code} - SIDELITE ON ${sidelitePlacement(value, handing, configurationType).toUpperCase()} OSLI`
  return optionByCode.get(code)!.label
}

export function normalizeLegacySidelite(value: SideliteInput, handing?: DoorSwing['id'], configurationType?: DoorConfigurationType): SideliteConfiguration {
  if (configurationType === 'single') {
    const physical = sidelitePlacement(value, handing, configurationType)
    return physical === 'left' || physical === 'right' ? physical : physical === 'both' ? 'both-sides' : 'none'
  }
  if (handing && ['LEFTSIDE', 'RIGHTSIDE', 'left', 'right'].includes(String(value))) {
    return sideliteProductOption(value).placement === doorHandingSides(handing).hingeSide ? 'hinge-side' : 'lock-side'
  }
  return sideliteProductOption(value).legacyValue
}

export function resolveSidelitePosition({ relationship, handing, view = 'Exterior', configurationType }: { relationship: SideliteInput; handing?: DoorSwing['id'] | null; view?: HardwareView; configurationType?: DoorConfigurationType }): SideliteProductOption['placement'] | null {
  // French active-leaf handing controls hardware only. Existing sidelite IDs
  // represent fixed OSLI positions in this configuration, not active-leaf sides.
  if (configurationType !== 'french' && (relationship === 'hinge-side' || relationship === 'lock-side')) {
    if (!handing) return null
    const sides = doorHandingSides(handing, view)
    return relationship === 'hinge-side' ? sides.hingeSide : sides.lockSide
  }
  const physical = sideliteProductOption(relationship).placement
  return view === 'Interior' && (physical === 'left' || physical === 'right') ? (physical === 'left' ? 'right' : 'left') : physical
}

/** Legacy callers without handing retain their existing LHI convention.
 * Customer previews use resolveSidelitePosition and wait for actual handing. */
export function sidelitePlacement(value: SideliteInput, handing: DoorSwing['id'] = 'LHI', configurationType?: DoorConfigurationType): SideliteProductOption['placement'] {
  return resolveSidelitePosition({ relationship: value, handing, configurationType })!
}

export function sideliteRelationshipLabel(value: SideliteInput, configurationType?: DoorConfigurationType) {
  if (configurationType === 'single' || value === 'left' || value === 'right') return sideliteBuilderOptions('single').find(item => item.id === value)?.name ?? sideliteProductLabel(value)
  if (configurationType === 'french') return sideliteBuilderOptions(configurationType).find(item => item.id === value)?.name ?? sideliteProductLabel(value, undefined, configurationType)
  return singleDoorBuilderOptions.find(item => item.id === value)?.name ?? sideliteProductLabel(value)
}
