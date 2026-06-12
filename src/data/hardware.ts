import type { HardwareAsset, HardwareFinishName, HardwareHanding, HardwareManufacturer, HardwareOption, HardwareStyleName, HardwareStyleOption } from '../types'
import { hardwareAssets as baldwinAssets } from './hardwareAssets'
import { schlageHardware } from './schlageHardware'

const finishColors: Record<string, string> = {
  'Aged Bronze': '#584536',
  'Bright Brass': '#d7b64a',
  'Dark Bronze': '#40342b',
  'Venetian Bronze': '#4b3528',
  'Satin Nickel': '#aaa9a4',
  'Matte Black': '#191919',
}

const schlageAssets: HardwareAsset[] = schlageHardware.flatMap((option) => [
  { manufacturer: option.manufacturer, style: option.style, finish: option.finish, handing: 'Left', view: 'Exterior', asset: option.assets.L },
  { manufacturer: option.manufacturer, style: option.style, finish: option.finish, handing: 'Right', view: 'Exterior', asset: option.assets.R },
])

export const allHardwareAssets: HardwareAsset[] = [...baldwinAssets, ...schlageAssets]

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const hardwareStyles: HardwareStyleOption[] = [...new Map(
  allHardwareAssets.map((asset) => {
    const id = `${slug(asset.manufacturer)}-${slug(asset.style)}`
    return [id, { id, manufacturer: asset.manufacturer, style: asset.style }]
  }),
).values()].sort((a, b) => a.manufacturer.localeCompare(b.manufacturer) || a.style.localeCompare(b.style))

export function hardwareFinishesForStyle(manufacturer: HardwareManufacturer, style: HardwareStyleName) {
  return [...new Set(
    allHardwareAssets
      .filter((asset) => asset.manufacturer === manufacturer && asset.style === style)
      .map((asset) => asset.finish),
  )].map((name) => ({ name, color: finishColors[name] ?? '#666666' }))
}

export function resolveHardwareOption(manufacturer: HardwareManufacturer, style: HardwareStyleName, finish: HardwareFinishName, handing: HardwareHanding = 'Left'): HardwareOption | undefined {
  const asset = allHardwareAssets.find((item) =>
    item.manufacturer === manufacturer && item.style === style && item.finish === finish && item.handing === handing && item.view === 'Exterior',
  )
  if (!asset) return undefined
  return {
    ...asset,
    id: `${slug(manufacturer)}-${slug(style)}-${slug(finish)}-${handing.toLowerCase()}`,
    color: finishColors[finish] ?? '#666666',
    type: style.includes('Knob') ? 'round' : style.includes('Lever') ? 'lever' : 'long',
  }
}

export const hardwareOptions: HardwareOption[] = allHardwareAssets
  .filter((asset) => asset.view === 'Exterior')
  .map((asset) => resolveHardwareOption(asset.manufacturer, asset.style, asset.finish, asset.handing)!)

export const hardwareDisplayName = (hardware: HardwareOption) => `${hardware.manufacturer} ${hardware.style}`
