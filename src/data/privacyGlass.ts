const approvedPrivacyGlassNames = new Set([
  'chinchilla',
  'cumulus',
  'vapor',
  'linen',
  'mistify',
  'rain',
])

const baseGlassName = (name: string) => name
  .split(/\s+[–-]\s+/)[0]
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ')

export const isApprovedPrivacyGlassName = (name: string) => approvedPrivacyGlassNames.has(baseGlassName(name))

export const approvedPrivacyGlassIds = new Set([
  'chinchilla',
  'cumulus',
  'vapor',
  'linen',
  'mistify',
  'rain',
  'sw-rain-nogrid',
  'sw-rain-5l',
])

export const knownPrivacyGlassIds = new Set([
  'baroque',
  'blanca',
  'chinchilla',
  'cumulus',
  'double-water',
  'frosted',
  'karma',
  'linen',
  'micro-granite',
  'mistify',
  'rain',
  'streamed',
  'vapor',
  'wide-reed',
  'sw-rain-nogrid',
  'sw-rain-5l',
])
