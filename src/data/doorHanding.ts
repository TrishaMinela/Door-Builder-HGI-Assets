import type { DoorSwing, HardwareView } from '../types.js'

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
