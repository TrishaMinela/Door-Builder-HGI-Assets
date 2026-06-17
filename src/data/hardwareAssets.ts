import type { HardwareAsset, HardwareHanding, HardwareView } from '../types'

// Explicit asset records keep human-readable product data independent from filenames.
// The supplied exterior overlays are normalized to Right / Exterior (RO) assets.
export const hardwareAssets: HardwareAsset[] = [
  { manufacturer: 'Baldwin', style: 'Adirondack', finish: 'Dark Bronze', handing: 'Right', view: 'Exterior', asset: 'BALDADRDBZRO.png' },
  { manufacturer: 'Baldwin', style: 'La Jolla', finish: 'Satin Nickel', handing: 'Right', view: 'Exterior', asset: 'BALDLAJSNRO.png' },
  { manufacturer: 'Baldwin', style: 'La Jolla', finish: 'Matte Black', handing: 'Right', view: 'Exterior', asset: 'BALDLAJMBRO.png' },
  { manufacturer: 'Baldwin', style: 'La Jolla', finish: 'Venetian Bronze', handing: 'Right', view: 'Exterior', asset: 'BALDLAJVBZRO.png' },
  { manufacturer: 'Baldwin', style: 'Longview', finish: 'Dark Bronze', handing: 'Right', view: 'Exterior', asset: 'BALDLONGDBZRO.png' },
  { manufacturer: 'Baldwin', style: 'Napa', finish: 'Venetian Bronze', handing: 'Right', view: 'Exterior', asset: 'BALDNAPVBZRO.png' },
  { manufacturer: 'Baldwin', style: 'Napa', finish: 'Satin Nickel', handing: 'Right', view: 'Exterior', asset: 'BALDNAPSNRO.png' },
  { manufacturer: 'Baldwin', style: 'Santa Cruz', finish: 'Venetian Bronze', handing: 'Right', view: 'Exterior', asset: 'BALDSANVBZRO.png' },
  { manufacturer: 'Baldwin', style: 'Santa Cruz', finish: 'Satin Nickel', handing: 'Right', view: 'Exterior', asset: 'BALDSANSNRO.png' },
  { manufacturer: 'Baldwin', style: 'Santa Cruz', finish: 'Matte Black', handing: 'Right', view: 'Exterior', asset: 'BALDSANMBRO.png' },
  { manufacturer: 'Baldwin', style: 'Seattle', finish: 'Venetian Bronze', handing: 'Right', view: 'Exterior', asset: 'BALDSEAVBZRO.png' },
  { manufacturer: 'Baldwin', style: 'Seattle', finish: 'Satin Nickel', handing: 'Right', view: 'Exterior', asset: 'BALDSEASNRO.png' },
  { manufacturer: 'Baldwin', style: 'Seattle', finish: 'Matte Black', handing: 'Right', view: 'Exterior', asset: 'BALDSEAMBRO.png' },
]

export function resolveHardwareAsset(style: string, finish: string, handing: HardwareHanding = 'Right', view: HardwareView = 'Exterior') {
  return hardwareAssets.find(
    (item) => item.style === style && item.finish === finish && item.handing === handing && item.view === view,
  )
}
