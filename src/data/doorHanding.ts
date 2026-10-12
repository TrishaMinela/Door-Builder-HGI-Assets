import type { DoorConfigurationType, DoorSwing, HardwareView } from '../types.js'

export type DoorSide = 'left' | 'right'
// Existing DoorPreview convention, viewed from outside. Do not reinterpret
// the manufacturer's handing definitions independently in other consumers.
const exteriorLockSide: Record<DoorSwing['id'], DoorSide> = { LHI: 'right', LHO: 'left', RHI: 'left', RHO: 'right' }
export const oppositeDoorSide = (side: DoorSide): DoorSide => side === 'left' ? 'right' : 'left'
export function doorHandingSides(handing: DoorSwing['id'], view: HardwareView = 'Exterior') {
  const exterior = exteriorLockSide[handing]
  const lockSide = view === 'Interior' ? oppositeDoorSide(exterior) : exterior
  return { lockSide, hingeSide: oppositeDoorSide(lockSide) }
}

/** Reuse the legacy handing ID; active leaf is opposite its meeting-edge lock side. */
export function frenchActiveDoorSide(handing: DoorSwing['id']): DoorSide {
  return oppositeDoorSide(doorHandingSides(handing).lockSide)
}
export function doorSwingDisplayName(type: DoorConfigurationType | '' | undefined, swing: DoorSwing): string {
  return type === 'french' ? frenchActiveDoorSide(swing.id) === 'left' ? 'Left Active' : 'Right Active' : swing.name
}
