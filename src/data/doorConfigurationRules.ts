import type { DoorConfigurationType } from '../types'

export type DoorHardwareSide = 'left' | 'right'
export type DoorConfigurationProductOption = {
  code: 'HINGEOJ'
  label: 'HINGEOJ - HINGE OFF OUTER JAMB'
}

type DoorConfigurationRule = {
  type: DoorConfigurationType
  label: string
  leafCount: 1 | 2
  hasCenterMeetingStile: boolean
  hardwareMode: 'single' | 'both' | 'operating-leaf'
  requiredProductOption?: DoorConfigurationProductOption
}

export const savannahRequiredProductOption: DoorConfigurationProductOption = {
  code: 'HINGEOJ',
  label: 'HINGEOJ - HINGE OFF OUTER JAMB',
}

export const doorConfigurationRules: Record<DoorConfigurationType, DoorConfigurationRule> = {
  single: { type: 'single', label: 'Single Door', leafCount: 1, hasCenterMeetingStile: false, hardwareMode: 'single' },
  french: { type: 'french', label: 'French Door', leafCount: 2, hasCenterMeetingStile: true, hardwareMode: 'both' },
  savannah: { type: 'savannah', label: 'Savannah Door', leafCount: 2, hasCenterMeetingStile: true, hardwareMode: 'operating-leaf', requiredProductOption: savannahRequiredProductOption },
}

export function normalizeDoorConfigurationType(value?: string | null): DoorConfigurationType {
  return value === 'french' || value === 'savannah' ? value : 'single'
}

export function doorConfigurationRule(value?: string | null): DoorConfigurationRule {
  return doorConfigurationRules[normalizeDoorConfigurationType(value)]
}

export function doorConfigurationLabel(value?: string | null): string {
  return doorConfigurationRule(value).label
}

export function isDoubleDoorConfiguration(value?: string | null): boolean {
  return doorConfigurationRule(value).leafCount === 2
}

export function doorConfigurationLeafCount(value?: string | null): 1 | 2 {
  return doorConfigurationRule(value).leafCount
}

export function hasCenterMeetingStile(value?: string | null): boolean {
  return doorConfigurationRule(value).hasCenterMeetingStile
}

export function requiredDoorConfigurationProductOption(value?: string | null): DoorConfigurationProductOption | undefined {
  return doorConfigurationRule(value).requiredProductOption
}

export function doorHardwarePlacements(
  value: string | null | undefined,
  displayedHardwareSide: DoorHardwareSide,
  operatingLeafSide: DoorHardwareSide = displayedHardwareSide,
): { leafIndex: number; side: DoorHardwareSide }[] {
  const rule = doorConfigurationRule(value)
  if (rule.hardwareMode === 'both') return [{ leafIndex: 0, side: 'right' }, { leafIndex: 1, side: 'left' }]
  if (rule.hardwareMode === 'operating-leaf') {
    return [{ leafIndex: operatingLeafSide === 'right' ? 0 : 1, side: displayedHardwareSide }]
  }
  return [{ leafIndex: 0, side: displayedHardwareSide }]
}
