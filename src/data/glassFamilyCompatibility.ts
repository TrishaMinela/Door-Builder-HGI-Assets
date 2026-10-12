import { doorLineChoices } from './productCatalog.js'

const signature = doorLineChoices.find(line => line.id === 'signature-series')!
const signatureOnlyFamilyIds = new Set(['cobblestone', 'cob', 'dutchcraft', 'dut', 'leland', 'lel'])

/** Main and scoped sidelite catalogs use different IDs for the same designs. */
export function isGlassFamilyCompatible(option: { id: string; name: string }, lineId?: string | null) {
  const familyName = option.name.split(/\s+[–-]\s+/)[0].toLowerCase().replace(/\s+/g, '')
  const signatureOnly = signatureOnlyFamilyIds.has(option.id) || signatureOnlyFamilyIds.has(familyName)
  return !signatureOnly || lineId === signature.id || signature.lineIds.includes(lineId ?? '')
}
