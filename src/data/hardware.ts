import type { HardwareAsset, HardwareFinishName, HardwareHanding, HardwareManufacturer, HardwareOption, HardwareStyleName, HardwareView, PreviewHardware } from '../types'
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

export function hardwarePreviewAssetUrl(hardware: PreviewHardware, view: HardwareView = 'Exterior') {
  if (hardware.manufacturer === 'Baldwin' && hardware.style && hardware.finish) {
    const interiorSuffix = view === 'Interior' ? ' - Interior' : ''
    return `/assets/hardware/baldwin/Preview - Baldwin - ${hardware.style} - ${hardware.finish}${interiorSuffix}.png`
  }
  if (hardware.manufacturer === 'Schlage' && hardware.style && hardware.finish) {
    const option = resolveSchlageHardware(hardware.style, hardware.finish)
    const asset = view === 'Interior'
      ? hardware.interiorPreviewImage ?? option?.interiorPreviewImage
      : hardware.exteriorPreviewImage ?? option?.exteriorPreviewImage
    if (!asset) {
      console.warn('[hardware-preview:missing]', {
        manufacturer: hardware.manufacturer,
        style: hardware.style,
        finish: hardware.finish,
        view,
      })
      return ''
    }
    return hardwareAssetUrl(asset)
  }
  return hardware.asset ? hardwareAssetUrl(hardware.asset) : ''
}
