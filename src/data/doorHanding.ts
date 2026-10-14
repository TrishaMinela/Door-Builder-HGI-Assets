import type { DoorConfiguration, DoorConfigurationType, DoorSwing, HardwareView } from '../types.js'

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
  if (type === 'french') return 'Both slabs operable'
  if (type === 'savannah') {
    const opening = savannahOpening(swing.id)
    return `${opening.swing} - ${opening.swing === 'LHI' ? 'Left' : 'Right'} Hand Inswing; active slab ${opening.activeSlab.Interior} inside / ${opening.activeSlab.Exterior} outside`
  }
  return swing.name
}

export function savannahOpening(handing: DoorSwing['id']): NonNullable<DoorConfiguration['savannahOpening']> {
  const exterior = doorHandingSides(handing, 'Exterior').lockSide
  const interior = oppositeDoorSide(exterior)
  return { swing: exterior === 'right' ? 'LHI' : 'RHI', referenceView: 'Interior', activeSlab: { Interior: interior, Exterior: exterior }, hardwareSide: { Interior: interior, Exterior: exterior }, hingeSide: { Interior: exterior, Exterior: interior }, hingeArrangement: 'beside-stationary-slab' }
}
