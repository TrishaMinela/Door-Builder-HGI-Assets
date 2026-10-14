import type { DoorStyle } from '../types'
import type { DoorConfigurationType, DoorSwing } from '../types'
import { sidelitePlacement, sideliteProductCode, type SideliteInput } from './sideliteConfigurations'

/** Presentation only. IDs, manufacturer codes and catalog labels stay intact. */
export const verifiedProductDisplayNames = {
  sidelite: { ssl: 'Half Sidelite' }, // Verified by the SSL correction (b17ca6d).
} as const
const readableCase = (name: string) => name.toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase())
  .replace(/\bhd\b/gi, 'HD').replace(/\b2p\b/gi, '2P')
export function doorStyleDisplayName(style: Pick<DoorStyle, 'name'>): string {
  // The catalog supplies "code - description"; do not guess from the code.
  const parts = style.name.split(' - ')
  return readableCase(parts.length > 1 ? parts.slice(1).join(' - ') : style.name)
}
export function sideliteStyleDisplayName(value?: string | null): string {
  if (!value) return 'Not selected'
  const key = value.toLowerCase()
  return verifiedProductDisplayNames.sidelite[key as keyof typeof verifiedProductDisplayNames.sidelite]
    ?? (['fsl', 'f48sl', 'ssl', 's2sl', 'cr14sl'].includes(key) ? key.toUpperCase() : value)
}
export function glassDisplayName(name?: string | null): string {
  if (!name) return 'Not selected'
  // Strip a code only when the declaration also supplies a description.
  return name.replace(/^[A-Z][A-Z0-9]+\s+[–-]\s+/, '')
}

export function sideliteConfigurationDisplayName(value: SideliteInput, swing: DoorSwing['id'], type: DoorConfigurationType): string {
  const side = sidelitePlacement(value, swing, type)
  if (side === 'none') return 'No Sidelites'
  if (side === 'both') return 'Both Sidelites'
  const description = side === 'left' ? 'Left Sidelite' : 'Right Sidelite'
  const code = sideliteProductCode(value, swing, type)
  return code === 'HINGESIDE' ? `${description} (Hinge Side)` : code === 'LOCKSIDE' ? `${description} (Lock Side)` : description
}
