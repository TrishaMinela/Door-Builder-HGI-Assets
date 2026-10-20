import type { DoorStyle } from '../types'
import type { DoorConfigurationType, DoorSwing } from '../types'
import { sidelitePlacement, type SideliteInput } from './sideliteConfigurations'

/** Presentation only. IDs, manufacturer codes and catalog labels stay intact. */
export const verifiedProductDisplayNames = {
  sidelite: {
    f48sl: 'Three Quarter Side Lite',
    fsl: 'Full Side Lite Cut Out',
    s2sl: 'S2 Sidelite',
    ssl: 'Half Side Lite',
  }, // Customer-confirmed catalog wording; product IDs/codes stay unchanged.
} as const
const readableCase = (name: string) => name.toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase())
  .replace(/\bhd\b/gi, 'HD').replace(/\b2p\b/gi, '2P')
export function doorStyleDisplayName(style: Pick<DoorStyle, 'name'>): string {
  // The catalog supplies "code - description"; do not guess from the code.
  const parts = style.name.split(' - ')
  return readableCase(parts.length > 1 ? parts.slice(1).join(' - ') : style.name)
}
/** Card-only abbreviations of catalog descriptions; quotes retain full names. */
const doorCardNames: Record<string, string> = {
  '2PNGSS': '2 Panel', '2PPLSS': '2 Panel Plank', '3PNG': '3 Panel',
  '3STEP': 'Three Lite Step Down', 'F4': 'Three Lite Step Up',
  'CA': '8 Panel Center Arch', 'CANGSS': 'Center Arch',
  'CR14': 'Craftsman Rectangle', 'CR14PL': 'Craftsman Cottage',
  'E1': 'Eight Panel', 'F1': 'Flush', 'F482': '3/4 Lite Two Panel',
  'F848': 'Twin 8 × 48 Lite', 'S836': 'Twin 8 × 36 Lite',
  'FRT': 'Full Round Top', 'HRT': 'Half Round Top', 'N1': 'Nine Panel',
  'QA': 'Quarter Eyebrow', 'S1NGSS': 'Six Panel', 'S1': 'Six Panel',
  'S2': 'Six Panel Twin Lite', 'S4': 'Four Lite Arch Top',
  'SO': 'Small Oval 3 Panel', 'SO2': 'Small Oval 2 Panel',
}
export function doorStyleCardName(style: Pick<DoorStyle, 'code' | 'name'>): string {
  return doorCardNames[style.code] ?? doorStyleDisplayName(style)
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

export function sideliteConfigurationDisplayName(value: SideliteInput, swing: DoorSwing['id'], type: DoorConfigurationType, style?: string | null): string {
  const side = sidelitePlacement(value, swing, type)
  if (side === 'none') return 'None'
  const position = side === 'both' ? 'Both sides' : side === 'left' ? 'Left' : 'Right'
  return style ? `${position} - ${sideliteStyleDisplayName(style)}` : position
}
