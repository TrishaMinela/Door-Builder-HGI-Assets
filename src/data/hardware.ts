import type { DoorSwing, HardwareAsset, HardwareFinishName, HardwareHanding, HardwareManufacturer, HardwareOption, HardwareStyleName, HardwareView, PreviewHardware } from '../types'
import { hardwareAssets as baldwinAssets } from './hardwareAssets'
import { resolveSchlageHardware, schlageHardware } from './schlageHardware'

const finishColors: Record<string, string> = {
  'Aged Bronze': '#584536',
  'Bright Brass': '#d7b64a',
  'Dark Bronze': '#40342b',
  'Venetian Bronze': '#4b3528',
  'Satin Nickel': '#aaa9a4',
  'Matte Black': '#191919',
}

const schlageAssets: HardwareAsset[] = schlageHardware.flatMap((option) => (['Left', 'Right'] as const).flatMap((handing) => [
  { manufacturer: option.manufacturer, style: option.style, finish: option.finish, handing, view: 'Exterior' as const, asset: option.cardImage },
  ...(option.interiorPreviewImage ? [{ manufacturer: option.manufacturer, style: option.style, finish: option.finish, handing, view: 'Interior' as const, asset: option.interiorPreviewImage }] : []),
]))

export const allHardwareAssets: HardwareAsset[] = [...baldwinAssets, ...schlageAssets]

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function resolveHardwareOption(manufacturer: HardwareManufacturer, style: HardwareStyleName, finish: HardwareFinishName, handing?: HardwareHanding): HardwareOption | undefined {
  const preferredHanding = handing ?? (manufacturer === 'Baldwin' ? 'Right' : 'Left')
  const asset = allHardwareAssets.find((item) =>
    item.manufacturer === manufacturer && item.style === style && item.finish === finish && item.handing === preferredHanding && item.view === 'Exterior',
  )
  if (!asset) return undefined
  const schlageOption = manufacturer === 'Schlage' ? resolveSchlageHardware(style, finish) : undefined
  return {
    ...asset,
    cardImage: schlageOption?.cardImage,
    exteriorPreviewImage: schlageOption?.exteriorPreviewImage,
    interiorPreviewImage: schlageOption?.interiorPreviewImage,
    id: `${slug(manufacturer)}-${slug(style)}-${slug(finish)}-${preferredHanding.toLowerCase()}`,
    color: finishColors[finish] ?? '#666666',
    type: style.includes('Knob') ? 'round' : style.includes('Lever') ? 'lever' : 'long',
  }
}

export const hardwareOptions: HardwareOption[] = [...new Map(
  allHardwareAssets
    .filter((asset) => asset.view === 'Exterior' && asset.handing === (asset.manufacturer === 'Baldwin' ? 'Right' : 'Left'))
    .map((asset) => {
      const option = resolveHardwareOption(asset.manufacturer, asset.style, asset.finish)!
      return [option.id, option] as const
    }),
).values()].sort((a, b) =>
  a.manufacturer.localeCompare(b.manufacturer)
  || a.style.localeCompare(b.style)
  || a.finish.localeCompare(b.finish),
)

export const hardwareDisplayName = (hardware: HardwareOption) => `${hardware.manufacturer} ${hardware.style} - ${hardware.finish}`
export const hardwareAssetUrl = (asset: string) => `/assets/hardware/${asset}?v=5`

const finishSwatchAssets: Record<string, string> = {
  'Bright Brass': 'bright-brass.png',
  'Dark Bronze': 'dark-bronze.png',
  'Matte Black': 'matte-black.png',
  'Satin Nickel': 'satin-nickel.png',
  'Venetian Bronze': 'venetian-bronze.png',
}

export function finishSwatchAssetUrl(finish: string) {
  return `/assets/hardware/finishes/${finishSwatchAssets[finish]}`
}

export function hardwareCardAssetUrl(hardware: HardwareOption) {
  if (hardware.manufacturer === 'Schlage') {
    const asset = hardware.cardImage ?? resolveSchlageHardware(hardware.style, hardware.finish)?.cardImage
    return asset ? hardwareAssetUrl(asset) : hardwareAssetUrl(hardware.asset)
  }
  return `/assets/hardware/cards/${hardware.asset}`
}

type HardwarePreviewMode = 'side2' | 'swing4'

type HardwarePreviewConfig = {
  folder: 'baldwin' | 'schlage'
  exteriorBase?: string
  interiorBase?: string
  exteriorMode?: HardwarePreviewMode
  interiorMode?: HardwarePreviewMode
}

const hardwarePreviewKey = (manufacturer: HardwareManufacturer, style: HardwareStyleName, finish: HardwareFinishName) => `${manufacturer}|${style}|${finish}`

const hardwarePreviewAssets: Record<string, HardwarePreviewConfig> = {
  [hardwarePreviewKey('Baldwin', 'Adirondack', 'Dark Bronze')]: { folder: 'baldwin', exteriorBase: 'BALADIRDBZ', interiorBase: 'BALADIRDBZ', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Baldwin', 'La Jolla', 'Matte Black')]: { folder: 'baldwin', exteriorBase: 'BALDLAJMB', interiorBase: 'BALDLAJMB', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Baldwin', 'La Jolla', 'Satin Nickel')]: { folder: 'baldwin', exteriorBase: 'BALDLAJSN', interiorBase: 'BALDLAJSN', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Baldwin', 'La Jolla', 'Venetian Bronze')]: { folder: 'baldwin', exteriorBase: 'BALDLAJVBZ', interiorBase: 'BALDLAJVBZ', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Baldwin', 'Longview', 'Dark Bronze')]: { folder: 'baldwin', exteriorBase: 'BALDLONGDBZ', interiorBase: 'BALDLONGDBZ', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Baldwin', 'Napa', 'Satin Nickel')]: { folder: 'baldwin', exteriorBase: 'BALDNAPSN', interiorBase: 'BALDNAPSN', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Baldwin', 'Napa', 'Venetian Bronze')]: { folder: 'baldwin', exteriorBase: 'BALDNAPVBZ', interiorBase: 'BALDNAPVBZ', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Baldwin', 'Santa Cruz', 'Matte Black')]: { folder: 'baldwin', exteriorBase: 'BALDSANMB', interiorBase: 'BALDSANMB', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Baldwin', 'Santa Cruz', 'Satin Nickel')]: { folder: 'baldwin', exteriorBase: 'BALDSANSN', interiorBase: 'BALDSANSN', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Baldwin', 'Santa Cruz', 'Venetian Bronze')]: { folder: 'baldwin', exteriorBase: 'BALDSANVBZ', interiorBase: 'BALDSANVBZ', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Baldwin', 'Seattle', 'Matte Black')]: { folder: 'baldwin', exteriorBase: 'BALDSEAMB', interiorBase: 'BALDSEAMB', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Baldwin', 'Seattle', 'Satin Nickel')]: { folder: 'baldwin', exteriorBase: 'BALDSEASN', interiorBase: 'BALDSEASN', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Baldwin', 'Seattle', 'Venetian Bronze')]: { folder: 'baldwin', exteriorBase: 'BALDSEAVBZ', interiorBase: 'BALDSEAVBZ', exteriorMode: 'swing4', interiorMode: 'swing4' },
  [hardwarePreviewKey('Schlage', 'Accent Lever with Deadbolt', 'Bright Brass')]: { folder: 'schlage', exteriorBase: 'ACLDBB', interiorBase: 'ACLIBB', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Accent Lever with Deadbolt', 'Matte Black')]: { folder: 'schlage', exteriorBase: 'ACLDMB', interiorBase: 'ACLIMB', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Accent Lever with Deadbolt', 'Satin Nickel')]: { folder: 'schlage', exteriorBase: 'ACLDSN', interiorBase: 'ACLISN', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Bowery Knob with Deadbolt', 'Matte Black')]: { folder: 'schlage', exteriorBase: 'BOCDMB', interiorBase: 'BOWIMB', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Bowery Knob with Deadbolt', 'Satin Nickel')]: { folder: 'schlage', exteriorBase: 'BOCDSN', interiorBase: 'BOWISN', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Camelot Handleset', 'Bright Brass')]: { folder: 'schlage', exteriorBase: 'CAHSBB', exteriorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Camelot Handleset', 'Matte Black')]: { folder: 'schlage', exteriorBase: 'CAHSMB', exteriorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Camelot Handleset', 'Satin Nickel')]: { folder: 'schlage', exteriorBase: 'CAHSSN', exteriorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Camelot Trim with Georgian Knob', 'Satin Nickel')]: { folder: 'schlage', exteriorBase: 'GECDSN', interiorBase: 'GEOISN', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Century Handleset', 'Matte Black')]: { folder: 'schlage', exteriorBase: 'CEHSMB', exteriorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Century Handleset', 'Satin Nickel')]: { folder: 'schlage', exteriorBase: 'CEHSSN', exteriorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Century Trim with Latitude Lever', 'Matte Black')]: { folder: 'schlage', exteriorBase: 'LACDMB', interiorBase: 'LATIMB', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Century Trim with Latitude Lever', 'Satin Nickel')]: { folder: 'schlage', exteriorBase: 'LACDSN', interiorBase: 'LATISN', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Georgian Knob with Deadbolt', 'Bright Brass')]: { folder: 'schlage', exteriorBase: 'GECDBB', interiorBase: 'GEOIBB', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Georgian Knob with Deadbolt', 'Matte Black')]: { folder: 'schlage', exteriorBase: 'GECDMB', interiorBase: 'GEOIMB', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Georgian Knob with Deadbolt', 'Satin Nickel')]: { folder: 'schlage', exteriorBase: 'GECDSN', interiorBase: 'GEOISN', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Latitude Lever with Deadbolt', 'Matte Black')]: { folder: 'schlage', exteriorBase: 'LACDMB', interiorBase: 'LATIMB', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Latitude Lever with Deadbolt', 'Satin Nickel')]: { folder: 'schlage', exteriorBase: 'LACDSN', interiorBase: 'LATISN', exteriorMode: 'side2', interiorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Plymouth Handleset', 'Bright Brass')]: { folder: 'schlage', exteriorBase: 'PLHSBB', exteriorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Plymouth Handleset', 'Matte Black')]: { folder: 'schlage', exteriorBase: 'PLHSMB', exteriorMode: 'side2' },
  [hardwarePreviewKey('Schlage', 'Plymouth Handleset', 'Satin Nickel')]: { folder: 'schlage', exteriorBase: 'PLHSSN', exteriorMode: 'side2' },
}

const swingPreviewSuffix = (doorSwing?: DoorSwing | null) => {
  if (!doorSwing) return 'RO'
  return ({ LHI: 'LI', LHO: 'LO', RHI: 'RI', RHO: 'RO' } as const)[doorSwing.id]
}

const sidePreviewSuffix = (doorSwing?: DoorSwing | null) => doorSwing?.id.startsWith('L') ? 'L' : 'R'

const hardwarePreviewOverlayUrl = (folder: HardwarePreviewConfig['folder'], fileName: string) => `/assets/hardware/previews/${folder}/${fileName}?v=7`

const logMissingHardwarePreview = (hardware: PreviewHardware, view: HardwareView, doorSwing?: DoorSwing | null) => {
  console.warn('[hardware-preview:missing]', {
    manufacturer: hardware.manufacturer,
    style: hardware.style,
    finish: hardware.finish,
    view,
    doorSwing: doorSwing?.id,
  })
}

export function hardwarePreviewAssetUrl(hardware: PreviewHardware, view: HardwareView = 'Exterior', doorSwing?: DoorSwing | null) {
  if (!hardware.manufacturer || !hardware.style || !hardware.finish) return ''

  const config = hardwarePreviewAssets[hardwarePreviewKey(hardware.manufacturer, hardware.style, hardware.finish)]
  if (!config) {
    logMissingHardwarePreview(hardware, view, doorSwing)
    return ''
  }

  const base = view === 'Interior' ? config.interiorBase : config.exteriorBase
  const mode = view === 'Interior' ? config.interiorMode : config.exteriorMode
  if (!base || !mode) {
    logMissingHardwarePreview(hardware, view, doorSwing)
    return ''
  }

  const suffix = mode === 'swing4' ? swingPreviewSuffix(doorSwing) : sidePreviewSuffix(doorSwing)
  return hardwarePreviewOverlayUrl(config.folder, `${base}${suffix}.png`)
}
