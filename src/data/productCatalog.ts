import type { DoorLine, DoorStyle, DoorTypeOption, Finish, ResolvedDoorProduct } from '../types'
import { getDoorStyleThumbnailAsset } from './doorStyleThumbnailAssets'

const noGlassCodes = new Set([
  '2PNGSS', '2PPLSS', '2PHD', 'CA', 'CANGSS', 'S1NGSS', '3PNGSS', '3PNG',
  'E1', 'F1', 'HDAT1', 'N', 'N1', 'S1', 'SHAK1', 'SHAK2', 'SHAK3',
])

const parseStyles = (rows: string[]) => rows.map((row) => {
  const [code, name] = row.split('|')
  return { code, name, hasGlass: !noGlassCodes.has(code) && !name.includes('No Glass') }
})

const signatureStyles = {
  Cherry: parseStyles(['2PNGSS|2 Panel No Glass', '2PPLSS|2 Panel Plank No Glass', 'CA|Fiberglass Center Arch 8 Panel', 'CANGSS|Center Arch No Glass', 'F|Full Lite', 'F482|3/4 Lite 2 Panel', 'S|Half Lite', 'S1NGSS|S1 6-Panel No Glass', 'SO2|Small Oval 2 Panel']),
  Fir: parseStyles(['CR14|Craftsman 1/4 Rectangle', 'CR14PL|Craftsman 1/4 Rectangle Plank', 'F|Full Lite']),
  Mahogany: parseStyles(['3PNGSS|3 Panel No Glass', 'F|Full Lite', 'F48|3/4 Lite', 'S|Half Lite', 'S1NGSS|S1 6-Panel No Glass']),
  Oak: parseStyles(['F|Full Lite', 'S|Half Lite', 'S1NGSS|S1 6-Panel No Glass']),
}

const steel20 = parseStyles([
  '2PHD|2P HD Flat Top', '3LT|Stacked 3 Lite', '3PNG|3 Panel No Glass', '3STEP|Three Lite Stepping Down From Lock Side', '4LT|Stacked 4 Lite', '5LT|Five Lite Stack', 'CR14|Craftsman 1/4 Rectangle', 'E1|Eight Panel No Glass', 'F|Full Lite', 'F1|Flush No Glass', 'F2|Diamond', 'F3|Square', 'F4|Three Lites Stepping Down From Lock Side', 'F48|3/4 Lite', 'F482|3/4 Lite 2 Panel', 'F764|Full Twin Lite', 'F848|Two 8" x 48" Lites, 3/4 Lite', 'FO|Full Oval', 'FRT|Full Round Top Glass Cut Out', 'HDAT1|HD Arch Top', 'HRT|Half Round Top Glass Cut Out', 'N|N Panel', 'N1|Nine Panel No Glass', 'QA|648 Quarter Height Eye Brow', 'S|Half Lite', 'S2|Two Lights Top of 6 Panel Door', 'S3|Four Lite Rectangle', 'S4|Four Lites Together Each With An Arch At Top', 'S836|Two 8" x 36" Lites', 'SAT|Half Arch Top', 'SHAK1|1-Panel Shaker', 'SHAK2|2-Panel Shaker', 'SHAK3|3-Panel Shaker', 'SO|Small Oval 3 Panel', 'SW|Wagon Wheel',
])

const steel22 = parseStyles([
  '2PHD|2P HD Flat Top', '3LT|Stacked 3 Lite', '3PNG|3 Panel No Glass', '3STEP|Three Lite Stepping Down From Lock Side', '4LT|Stacked 4 Lite', '5LT|Five Lite Stack', 'CR14|Craftsman 1/4 Rectangle', 'E1|Eight Panel No Glass', 'F|Full Lite', 'F1|Flush No Glass', 'F2|Diamond', 'F3|Square', 'F4|Three Lites Stepping Down From Lock Side', 'F48|3/4 Lite', 'F764|Full Twin Lite', 'F848|Two 8" x 48" Lites, 3/4 Lite', 'FO|Full Oval', 'FRT|Full Round Top Glass Cut Out', 'HDAT1|HD Arch Top', 'HRT|Half Round Top Glass Cut Out', 'QA|648 Quarter Height Eye Brow', 'S|Half Lite', 'S2|Two Lights Top of 6 Panel Door', 'S3|Four Lite Rectangle', 'S4|Four Lites Together Each With An Arch At Top', 'S836|Two 8" x 36" Lites', 'SAT|Half Arch Top', 'SHAK1|1-Panel Shaker', 'SHAK2|2-Panel Shaker', 'SHAK3|3-Panel Shaker', 'SO|Small Oval 3 Panel', 'SW|Wagon Wheel',
])

const brushed = parseStyles([
  '2PHD|2P HD Flat Top', '3LT|Stacked 3 Lite', '4LT|Stacked 4 Lite', '5LT|Five Lite Stack', 'F|Full Lite', 'F1|Flush No Glass', 'F2|Diamond', 'F3|Square', 'F4|Three Lites Stepping Down From Lock Side', 'F482|3/4 Lite 2 Panel', 'F764|Full Twin Lite', 'FO|Full Oval', 'FRT|Full Round Top Glass Cut Out', 'HRT|Half Round Top Glass Cut Out', 'QA|648 Quarter Height Eye Brow', 'S|Half Lite', 'S2|Two Lights Top of 6 Panel Door', 'S3|Four Lite Rectangle', 'S4|Four Lites Together Each With An Arch At Top', 'S836|Two 8" x 36" Lites', 'SAT|Half Arch Top', 'SHAK3|3-Panel Shaker', 'SW|Wagon Wheel',
])

const textured = parseStyles([
  'F|Full Lite', 'F48|3/4 Lite', 'F848|Two 8" x 48" Lites, 3/4 Lite', 'HRT|Half Round Top Glass Cut Out', 'N|N Panel', 'N1|Nine Panel No Glass', 'QA|648 Quarter Height Eye Brow', 'S|Half Lite', 'S2|Two Lights Top of 6 Panel Door', 'S3|Four Lite Rectangle', 'S4|Four Lites Together Each With An Arch At Top', 'SAT|Half Arch Top', 'SW|Wagon Wheel',
])

export const productCatalog: DoorLine[] = [
  ...Object.entries(signatureStyles).map(([grain, styles]) => ({ id: `signature-${grain.toLowerCase()}`, name: 'Signature Fiberglass Grained N/C', grains: [grain], allowsColors: true, styles })),
  { id: '20-gauge-smooth-steel', name: 'Smooth Steel N/C', grains: [], allowsColors: true, styles: steel20 },
  { id: '22-gauge-steel', name: 'Paintable Stainable Steel N/C', grains: ['Oak'], allowsColors: true, styles: steel22 },
  { id: 'brushed-smooth-fiberglass', name: 'Brushed Smooth Fiberglass', grains: [], allowsColors: true, styles: brushed },
  { id: 'textured-fiberglass', name: 'Fiberglass Textured N/C', grains: ['Oak'], allowsColors: true, styles: textured },
]

export const doorTypeOptions: DoorTypeOption[] = [
  { id: 'paintable-stainable-steel', name: 'Paintable Stainable Steel N/C', lineIds: ['22-gauge-steel'], requiresGrain: false, grains: [] },
  { id: 'smooth-steel', name: 'Smooth Steel N/C', lineIds: ['20-gauge-smooth-steel'], requiresGrain: false, grains: [] },
  { id: 'signature-fiberglass', name: 'Signature Fiberglass Grained N/C', lineIds: Object.keys(signatureStyles).map((grain) => `signature-${grain.toLowerCase()}`), requiresGrain: true, grains: Object.keys(signatureStyles) },
  { id: 'brushed-smooth-fiberglass', name: 'Brushed Smooth Fiberglass', lineIds: ['brushed-smooth-fiberglass'], requiresGrain: false, grains: [] },
  { id: 'textured-fiberglass', name: 'Fiberglass Textured N/C', lineIds: ['textured-fiberglass'], requiresGrain: false, grains: [] },
]

const styleRecords = new Map<string, DoorStyle>()
productCatalog.forEach((line) => line.styles.forEach((item) => {
  const key = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const variant = { lineId: line.id, lineName: line.name, code: item.code, grains: [...line.grains], allowsColors: line.allowsColors }
  const existing = styleRecords.get(key)
  if (existing) {
    existing.allowedGrains = [...new Set([...existing.allowedGrains, ...line.grains])]
    existing.allowsColors ||= line.allowsColors
    existing.variants.push(variant)
    Object.assign(existing, getDoorStyleThumbnailAsset(existing.variants.map((entry) => entry.code)))
    return
  }
  const asset = getDoorStyleThumbnailAsset([item.code])
  styleRecords.set(key, {
    id: key,
    code: item.code,
    name: item.name,
    hasGlass: item.hasGlass,
    allowedGrains: [...line.grains],
    allowsColors: line.allowsColors,
    variants: [variant],
    description: item.hasGlass ? 'Available with your choice of decorative glass.' : 'A complete privacy door without glass.',
    eyebrow: item.hasGlass ? 'Glass-ready style' : 'No-glass style',
    ...asset,
  })
}))

export const catalogDoorStyles = [...styleRecords.values()].sort((a, b) => a.name.localeCompare(b.name))

export function stylesForDoorType(doorTypeId: string, grain?: string | null) {
  const doorType = doorTypeOptions.find((item) => item.id === doorTypeId)
  if (!doorType) return []

  return catalogDoorStyles.filter((style) => style.variants.some((variant) =>
    doorType.lineIds.includes(variant.lineId)
      && (!doorType.requiresGrain || Boolean(grain && variant.grains.includes(grain))),
  ))
}

export function finishesForStyle(style: DoorStyle, allFinishes: Finish[], doorTypeId?: string, grain?: string | null) {
  const doorType = doorTypeOptions.find((item) => item.id === doorTypeId)
  const matchingVariants = style.variants.filter((variant) =>
    (!doorType || doorType.lineIds.includes(variant.lineId))
      && (!doorType?.requiresGrain || Boolean(grain && variant.grains.includes(grain))),
  )

  return allFinishes.filter((finish) =>
    matchingVariants.some((variant) => {
      if (finish.category === 'stain') return variant.grains.length > 0
      return variant.allowsColors
    }),
  )
}

export function resolveDoorProduct(style: DoorStyle, finish: Finish, grain?: string, doorTypeId?: string): ResolvedDoorProduct {
  const selectedDoorType = doorTypeOptions.find((item) => item.id === doorTypeId)
  const matchingVariants = style.variants.filter((variant) => {
    if (selectedDoorType && !selectedDoorType.lineIds.includes(variant.lineId)) return false
    if (grain && !variant.grains.includes(grain)) return false
    if (finish.category === 'stain') return grain ? variant.grains.includes(grain) : variant.grains.length > 0
    return variant.allowsColors
  })
  const doorTypes = selectedDoorType
    ? [`${selectedDoorType.name}${grain ? ` - ${grain}` : ''}`]
    : [...new Set(matchingVariants.map((variant) => grain ? `${variant.lineName} - ${grain}` : variant.lineName))]
  return {
    doorTypeLabel: doorTypes.length === 1 ? 'Door Type' : 'Available Door Types',
    doorType: doorTypes.join(' / '),
    doorTypes,
    matchingVariants,
    styleCodes: [...new Set(matchingVariants.map((variant) => variant.code))],
    grain,
  }
}
