import type { HardwareAsset, HardwareHanding, HardwareView } from '../types'

// Explicit asset records keep human-readable product data independent from filenames.
// The supplied exterior overlays are normalized to Right / Exterior (RO) assets.
export const hardwareAssets: HardwareAsset[] = [
  { manufacturer: 'Baldwin', style: 'Adirondack', finish: 'Dark Bronze', handing: 'Right', view: 'Exterior', asset: 'BALDADRDBZRO.webp' },
  { manufacturer: 'Baldwin', style: 'La Jolla', finish: 'Satin Nickel', handing: 'Right', view: 'Exterior', asset: 'BALDLAJSNRO.webp' },
  { manufacturer: 'Baldwin', style: 'La Jolla', finish: 'Matte Black', handing: 'Right', view: 'Exterior', asset: 'BALDLAJMBRO.webp' },
  { manufacturer: 'Baldwin', style: 'La Jolla', finish: 'Venetian Bronze', handing: 'Right', view: 'Exterior', asset: 'BALDLAJVBZRO.webp' },
  { manufacturer: 'Baldwin', style: 'Longview', finish: 'Dark Bronze', handing: 'Right', view: 'Exterior', asset: 'BALDLONGDBZRO.webp' },
  { manufacturer: 'Baldwin', style: 'Napa', finish: 'Venetian Bronze', handing: 'Right', view: 'Exterior', asset: 'BALDNAPVBZRO.webp' },
  { manufacturer: 'Baldwin', style: 'Napa', finish: 'Satin Nickel', handing: 'Right', view: 'Exterior', asset: 'BALDNAPSNRO.webp' },
  { manufacturer: 'Baldwin', style: 'Santa Cruz', finish: 'Venetian Bronze', handing: 'Right', view: 'Exterior', asset: 'BALDSANVBZRO.webp' },
  { manufacturer: 'Baldwin', style: 'Santa Cruz', finish: 'Satin Nickel', handing: 'Right', view: 'Exterior', asset: 'BALDSANSNRO.webp' },
  { manufacturer: 'Baldwin', style: 'Santa Cruz', finish: 'Matte Black', handing: 'Right', view: 'Exterior', asset: 'BALDSANMBRO.webp' },
  { manufacturer: 'Baldwin', style: 'Seattle', finish: 'Venetian Bronze', handing: 'Right', view: 'Exterior', asset: 'BALDSEAVBZRO.webp' },
  { manufacturer: 'Baldwin', style: 'Seattle', finish: 'Satin Nickel', handing: 'Right', view: 'Exterior', asset: 'BALDSEASNRO.webp' },
  { manufacturer: 'Baldwin', style: 'Seattle', finish: 'Matte Black', handing: 'Right', view: 'Exterior', asset: 'BALDSEAMBRO.webp' },
]

export function resolveHardwareAsset(style: string, finish: string, handing: HardwareHanding = 'Right', view: HardwareView = 'Exterior') {
  return hardwareAssets.find(
    (item) => item.style === style && item.finish === finish && item.handing === handing && item.view === view,
  )
}
