export type GlassFrameShape = 'rectangle' | 'oval' | 'round-top' | 'eyebrow' | 'diamond'
export type GlassFrameMaskDefinition = {
  shape: GlassFrameShape
  separateOpenings: boolean
}

const shapeByOpeningCode: Partial<Record<string, GlassFrameShape>> = {
  FO: 'oval',
  SO: 'oval',
  SO2: 'oval',
  FRT: 'round-top',
  HRT: 'round-top',
  SW: 'round-top',
  CA: 'eyebrow',
  QA: 'eyebrow',
  SAT: 'eyebrow',
  S4: 'eyebrow',
  F2: 'diamond',
}

const separateOpeningCodes = new Set(['3LT', '3STEP', '4LT', '5LT', 'F4', 'F764', 'F848', 'S2', 'S3', 'S4', 'S836'])

export function glassFrameMaskForOpening(openingCode?: string | null): GlassFrameMaskDefinition {
  return {
    shape: (openingCode && shapeByOpeningCode[openingCode]) || 'rectangle',
    separateOpenings: Boolean(openingCode && separateOpeningCodes.has(openingCode)),
  }
}
