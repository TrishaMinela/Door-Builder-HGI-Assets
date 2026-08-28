import type { DoorConfigurationType, DoubleDoorLockPrepCode } from '../types'

export type DoorHardwareSide = 'left' | 'right'
export type DoorHardwareRenderMode = 'full' | 'knob-only'
export type DoubleDoorLockPrepOption = {
  code: DoubleDoorLockPrepCode
  label: string
  name: string
  description: string
  thumbnail: string
}

export const doubleDoorLockPrepOptions: DoubleDoorLockPrepOption[] = [
  { code: 'DDLLBO', label: 'DDLLBO — Double Door — Locks in Both Panels', name: 'Locks on Both Doors', description: 'Lock hardware on both doors.', thumbnail: '/assets/hardware/lock-setup/locks-on-both-doors.png' },
  { code: 'DDLLAC', label: 'DDLLAC — Double Door — Lock on the Active Panel', name: 'Lock on Main Door Only', description: 'Lock hardware only on the Main Door.', thumbnail: '/assets/hardware/lock-setup/lock-on-main-door-only.png' },
  { code: 'DDLLKP', label: 'DDLLKP — Double Door Knob Prep Only', name: 'Knob Prep Only', description: 'Prepare the doors for knob hardware without a full lockset.', thumbnail: '/assets/hardware/lock-setup/knob-prep-only.png' },
]

export function doubleDoorLockPrepOption(code?: string | null) {
  return doubleDoorLockPrepOptions.find((option) => option.code === code)
}
export type DoorConfigurationProductOption = {
  code: 'HINGEOJ'
  label: 'HINGEOJ - HINGE OFF OUTER JAMB'
  customerLabel: 'Hinge Off Outer Jamb'
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
  customerLabel: 'Hinge Off Outer Jamb',
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

export function doorConfigurationHingeOptionLabel(value?: string | null): string | undefined {
  return requiredDoorConfigurationProductOption(value)?.customerLabel
}

export function doorHardwarePlacements(
  value: string | null | undefined,
  displayedHardwareSide: DoorHardwareSide,
  operatingLeafSide: DoorHardwareSide = displayedHardwareSide,
  doubleDoorLockPrep?: DoubleDoorLockPrepCode | null,
): { leafIndex: number; side: DoorHardwareSide; mode: DoorHardwareRenderMode }[] {
  const rule = doorConfigurationRule(value)
  if (rule.leafCount === 2 && doubleDoorLockPrep) {
    const activeLeafIndex = operatingLeafSide === 'right' ? 0 : 1
    const inactiveLeafIndex = activeLeafIndex === 0 ? 1 : 0
    const sideForLeaf = (leafIndex: number): DoorHardwareSide => leafIndex === 0 ? 'right' : 'left'
    if (doubleDoorLockPrep === 'DDLLAC') return [{ leafIndex: activeLeafIndex, side: sideForLeaf(activeLeafIndex), mode: 'full' }]
    if (doubleDoorLockPrep === 'DDLLKP') return [
      { leafIndex: activeLeafIndex, side: sideForLeaf(activeLeafIndex), mode: 'full' },
      { leafIndex: inactiveLeafIndex, side: sideForLeaf(inactiveLeafIndex), mode: 'knob-only' },
    ]
    return [{ leafIndex: 0, side: 'right', mode: 'full' }, { leafIndex: 1, side: 'left', mode: 'full' }]
  }
  if (rule.hardwareMode === 'both') return [{ leafIndex: 0, side: 'right', mode: 'full' }, { leafIndex: 1, side: 'left', mode: 'full' }]
  if (rule.hardwareMode === 'operating-leaf') {
    return [{ leafIndex: operatingLeafSide === 'right' ? 0 : 1, side: displayedHardwareSide, mode: 'full' }]
  }
  return [{ leafIndex: 0, side: displayedHardwareSide, mode: 'full' }]
}
