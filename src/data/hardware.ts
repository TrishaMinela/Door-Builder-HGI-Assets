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
  ...(option.exteriorPreviewImage ? [{ manufacturer: option.manufacturer, style: option.style, finish: option.finish, handing, view: 'Exterior' as const, asset: option.exteriorPreviewImage }] : []),
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

type HardwarePreviewConfig = {
  exterior?: string
  interior?: string
}

const hardwarePreviewKey = (manufacturer: HardwareManufacturer, style: HardwareStyleName, finish: HardwareFinishName) => `${manufacturer}|${style}|${finish}`
const previewHardwareUrl = (fileName: string) => `/assets/hgi-assets/Preview Hardware/${fileName}`

const hardwarePreviewAssets: Record<string, HardwarePreviewConfig> = {
  [hardwarePreviewKey('Baldwin', 'Adirondack', 'Dark Bronze')]: { exterior: 'Preview - Baldwin - Adirondack - Dark Bronze.png', interior: 'Preview - Baldwin - Interior - Adirondack - Dark Bronze - Interior.png' },
  [hardwarePreviewKey('Baldwin', 'La Jolla', 'Matte Black')]: { exterior: 'Preview - Baldwin - La Jolla - Matte Black.png', interior: 'Preview - Baldwin - La Jolla - Matte Black - Interior.png' },
  [hardwarePreviewKey('Baldwin', 'La Jolla', 'Satin Nickel')]: { exterior: 'Preview - Baldwin - La Jolla - Satin Nickel.png', interior: 'Preview - Baldwin - La Jolla - Satin Nickel - Interior.png' },
  [hardwarePreviewKey('Baldwin', 'La Jolla', 'Venetian Bronze')]: { exterior: 'Preview - Baldwin - La Jolla - Venetian Bronze.png', interior: 'Preview - Baldwin - La Jolla - Venetian Bronze - Interior.png' },
  [hardwarePreviewKey('Baldwin', 'Longview', 'Dark Bronze')]: { exterior: 'Preview - Baldwin - Long View - Dark Bronze.png', interior: 'Preview - Baldwin - Long View - Dark Bronze - Interior.png' },
  [hardwarePreviewKey('Baldwin', 'Napa', 'Satin Nickel')]: { exterior: 'Preview - Baldwin - Napa - Satin Nickel.png', interior: 'Preview - Baldwin - Napa - Satin Nickel - Interior.png' },
  [hardwarePreviewKey('Baldwin', 'Napa', 'Venetian Bronze')]: { exterior: 'Preview - Baldwin - Napa - Venetian Bronze.png', interior: 'Preview - Baldwin - Napa - Venetian Bronze - Interior.png' },
  [hardwarePreviewKey('Baldwin', 'Santa Cruz', 'Matte Black')]: { exterior: 'Preview - Baldwin - Santa Cruz - Matte Black.png', interior: 'Preview - Baldwin - Santa Cruz - Matte Black - Interior.png' },
  [hardwarePreviewKey('Baldwin', 'Santa Cruz', 'Satin Nickel')]: { exterior: 'Preview - Baldwin - Santa Cruz - Satin Nickel.png', interior: 'Preview - Baldwin - Santa Cruz - Satin Nickel - Interior.png' },
  [hardwarePreviewKey('Baldwin', 'Santa Cruz', 'Venetian Bronze')]: { exterior: 'Preview - Baldwin - Santa Cruz - Venetian Bronze.png', interior: 'Preview - Baldwin - Santa Cruz - Venetian Bronze - Interior.png' },
  [hardwarePreviewKey('Baldwin', 'Seattle', 'Matte Black')]: { exterior: 'Preview - Baldwin - Seattle - Matte Black.png', interior: 'Preview - Baldwin - Seattle - Matte Black - Interior.png' },
  [hardwarePreviewKey('Baldwin', 'Seattle', 'Satin Nickel')]: { exterior: 'Preview - Baldwin - Seattle - Satin Nickel.png', interior: 'Preview - Baldwin - Seattle - Satin Nickel - Interior.png' },
  [hardwarePreviewKey('Baldwin', 'Seattle', 'Venetian Bronze')]: { exterior: 'Preview - Baldwin - Seattle - Venetian Bronze.png', interior: 'Preview - Baldwin - Seattle - Venetian Bronze - Interior.png' },
  [hardwarePreviewKey('Schlage', 'Accent Lever with Deadbolt', 'Bright Brass')]: { exterior: 'Preview - Schlage - Exterior - Accent - Bright Brass.png', interior: 'Preview - Schlage - Interior - Accent -  Bright Brass.png' },
  [hardwarePreviewKey('Schlage', 'Accent Lever with Deadbolt', 'Matte Black')]: { exterior: 'Preview - Schlage - Exterior - Accent - Matte Black.png', interior: 'Preview - Schlage - Interior - Accent -  Matte Black.png' },
  [hardwarePreviewKey('Schlage', 'Accent Lever with Deadbolt', 'Satin Nickel')]: { exterior: 'Preview - Schlage - Exterior - Accent - Satin Nickel.png', interior: 'Preview - Schlage - Interior - Accent -  Satin Nickel.png' },
  [hardwarePreviewKey('Schlage', 'Bowery Knob with Deadbolt', 'Matte Black')]: { exterior: 'Preview - Schlage - Exterior - Bowery - Matte Black.png', interior: 'Preview - Schlage - Interior - Bowery - Matte Black.png' },
  [hardwarePreviewKey('Schlage', 'Bowery Knob with Deadbolt', 'Satin Nickel')]: { exterior: 'Preview - Schlage - Exterior - Bowery - Satin Nickel.png', interior: 'Preview - Schlage - Interior - Bowery -  Satin Nickel.png' },
  [hardwarePreviewKey('Schlage', 'Camelot Handleset', 'Bright Brass')]: { exterior: 'Preview - Schlage - Exterior - Camelot - Bright Brass.png', interior: 'Preview - Schlage - Interior - Camelot -  Bright Brass.png' },
  [hardwarePreviewKey('Schlage', 'Camelot Handleset', 'Matte Black')]: { exterior: 'Preview - Schlage - Exterior - Camelot - Matte Black.png', interior: 'Preview - Schlage - Interior - Camelot - Matte Black.png' },
  [hardwarePreviewKey('Schlage', 'Camelot Handleset', 'Satin Nickel')]: { exterior: 'Preview - Schlage - Exterior - Camelot - Satin Nickel.png', interior: 'Preview - Schlage - Interior - Camelot - Satin Nickel.png' },
  [hardwarePreviewKey('Schlage', 'Camelot Trim with Georgian Knob', 'Satin Nickel')]: { exterior: 'Preview - Schlage - Exterior - Camelot Trim with Georgian Knob - Satin Nickel.png', interior: 'Preview - Schlage - Interior - Camelot Trim with Georgian Knob - Satin Nickel.png' },
  [hardwarePreviewKey('Schlage', 'Century Handleset', 'Matte Black')]: { exterior: 'Preview - Schlage - Exterior - Century - Matte Black.png', interior: 'Preview - Schlage - Interior - Century - Matte Black.png' },
  [hardwarePreviewKey('Schlage', 'Century Handleset', 'Satin Nickel')]: { exterior: 'Preview - Schlage - Exterior - Century - Satin Nickel.png', interior: 'Preview - Schlage - Interior - Century - Satin Nickel.png' },
  [hardwarePreviewKey('Schlage', 'Century Trim with Latitude Lever', 'Matte Black')]: { exterior: 'Preview - Schlage - Exterior - Century Trim with Latitude Lever - Matte Black.png', interior: 'Preview - Schlage - Interior - Century Trim with Latitude Lever - Matte Black.png' },
  [hardwarePreviewKey('Schlage', 'Century Trim with Latitude Lever', 'Satin Nickel')]: { exterior: 'Preview - Schlage - Exterior - Century Trim with Latitude Lever - Satin Nickel.png', interior: 'Preview - Schlage - Interior - Century Trim with Latitude Lever - Satin Nickel.png' },
  [hardwarePreviewKey('Schlage', 'Georgian Knob with Deadbolt', 'Bright Brass')]: { exterior: 'Preview - Schlage - Exterior - Georgian - Brightbrass.png', interior: 'Preview - Schlage - Interior - Georgian - Brightbrass.png' },
  [hardwarePreviewKey('Schlage', 'Georgian Knob with Deadbolt', 'Matte Black')]: { exterior: 'Preview - Schlage - Exterior - Georgian - Matte Black.png', interior: 'Preview - Schlage - Interior - Georgian - Matte Black.png' },
  [hardwarePreviewKey('Schlage', 'Georgian Knob with Deadbolt', 'Satin Nickel')]: { exterior: 'Preview - Schlage - Exterior - Georgian - Satin Nickel.png', interior: 'Preview - Schlage - Interior - Georgian - Satin Nickel.png' },
  [hardwarePreviewKey('Schlage', 'Latitude Lever with Deadbolt', 'Bright Brass')]: { exterior: 'Preview - Schlage - Exterior - Latitude - Bright Brass.png', interior: 'Preview - Schlage - Interior - Latitude -  Bright Brass.png' },
  [hardwarePreviewKey('Schlage', 'Latitude Lever with Deadbolt', 'Matte Black')]: { exterior: 'Preview - Schlage - Exterior - Latitude - Matte Black.png', interior: 'Preview - Schlage - Interior - Latitude - Matte Black.png' },
  [hardwarePreviewKey('Schlage', 'Latitude Lever with Deadbolt', 'Satin Nickel')]: { exterior: 'Preview - Schlage - Exterior - Latitude - Satin Nickel.png', interior: 'Preview - Schlage - Interior - Latitude -  Satin Nickel.png' },
  [hardwarePreviewKey('Schlage', 'Plymouth Handleset', 'Bright Brass')]: { exterior: 'Preview - Schlage - Exterior - Plymouth - Bright Brass.png', interior: 'Preview - Schlage - Interior - Plymouth - Bright Brass.png' },
  [hardwarePreviewKey('Schlage', 'Plymouth Handleset', 'Matte Black')]: { exterior: 'Preview - Schlage - Exterior - Plymouth - Matte Black.png', interior: 'Preview - Schlage - Interior - Plymouth - Matte Black.png' },
  [hardwarePreviewKey('Schlage', 'Plymouth Handleset', 'Satin Nickel')]: { exterior: 'Preview - Schlage - Exterior - Plymouth - Satin Nickel.png', interior: 'Preview - Schlage - Interior - Plymouth - Satin Nickel.png' },
}

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

  const fileName = view === 'Interior' ? config.interior : config.exterior
  if (!fileName) {
    logMissingHardwarePreview(hardware, view, doorSwing)
    return ''
  }

  return previewHardwareUrl(fileName)
}
