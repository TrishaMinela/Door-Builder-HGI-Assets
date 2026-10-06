import type { Finish } from '../types'

/** All current palettes use shared finish IDs. Clad has a restricted subset;
 * use the existing first-available option when there is no exact match. */
export function matchingJambFinish(doorFinish: Finish | null | undefined, jambType: string, cladFinishes: Finish[]) {
  if (!doorFinish) return null
  if (jambType !== 'clad') return doorFinish
  return cladFinishes.find(finish => finish.id === doorFinish.id) ?? cladFinishes[0] ?? null
}
