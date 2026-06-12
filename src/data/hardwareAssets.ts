import type { HardwareAsset, HardwareHanding, HardwareView } from '../types'

const styleCodes = {
  Adirondack: 'ADIR',
  'La Jolla': 'LAJO',
  Longview: 'LONG',
  Napa: 'NAPA',
  'Santa Cruz': 'SANT',
  Seattle: 'SEAT',
}

const finishCodes = {
  'Dark Bronze': 'DBZ',
  'Venetian Bronze': 'VBZ',
  'Satin Nickel': 'SN',
  'Matte Black': 'MB',
}

const viewCodes: Record<`${HardwareHanding}-${HardwareView}`, string> = {
  'Left-Interior': 'LI',
  'Left-Exterior': 'LO',
  'Right-Interior': 'RI',
  'Right-Exterior': 'RO',
}

type BaldwinStyle = keyof typeof styleCodes
type BaldwinFinish = keyof typeof finishCodes

const styles = Object.keys(styleCodes) as BaldwinStyle[]
const finishes = Object.keys(finishCodes) as BaldwinFinish[]
const views = Object.keys(viewCodes) as `${HardwareHanding}-${HardwareView}`[]

export const hardwareAssets: HardwareAsset[] = styles.flatMap((style) =>
  finishes.flatMap((finish) =>
    views.map((handingView) => {
      const [handing, view] = handingView.split('-') as [HardwareHanding, HardwareView]
      return {
        manufacturer: 'Baldwin',
        style,
        finish,
        handing,
        view,
        asset: `BALD${styleCodes[style]}${finishCodes[finish]}${viewCodes[handingView]}.png`,
      }
    }),
  ),
)

export function resolveHardwareAsset(style: BaldwinStyle, finish: BaldwinFinish, handing: HardwareHanding, view: HardwareView) {
  return hardwareAssets.find(
    (item) => item.style === style && item.finish === finish && item.handing === handing && item.view === view,
  )
}
