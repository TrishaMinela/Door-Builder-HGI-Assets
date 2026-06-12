import type { Finish } from '../types'
import { paintColors, stainColors } from './finishes'
export { glassOptions } from './glassOptions'
export { hardwareOptions } from './hardware'
import { catalogDoorStyles } from './productCatalog'

export const doorStyles = catalogDoorStyles

const shade = (hex: string, amount = 35) => {
  const value = Number.parseInt(hex.slice(1), 16)
  const r = Math.max(0, (value >> 16) - amount)
  const g = Math.max(0, ((value >> 8) & 0xff) - amount)
  const b = Math.max(0, (value & 0xff) - amount)
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

const grains: Finish[] = [
  { id: 'grain-cherry', name: 'Cherry', description: 'Signature cherry wood grain.', image: '/assets/finishes/cherry.jpg', color: '#74462e', accent: '#422719', category: 'grain' },
  { id: 'grain-fir', name: 'Fir', description: 'Natural fir wood grain.', image: '/assets/finishes/fir.jpg', color: '#9a6845', accent: '#60402b', category: 'grain' },
  { id: 'grain-mahogany', name: 'Mahogany', description: 'Rich mahogany wood grain.', image: '/assets/finishes/mahogany.jpg', color: '#663728', accent: '#3f2118', category: 'grain' },
  { id: 'grain-oak', name: 'Oak', description: 'Classic oak wood grain.', image: '/assets/finishes/oak.jpg', color: '#8a613e', accent: '#533a25', category: 'grain' },
]

const toFinish = (kind: 'paint' | 'stain', color: { id: string; name: string; hex: string }): Finish => ({
  id: `${kind}-${color.id}`,
  name: color.name,
  description: `Home Guard ${kind} color.`,
  image: `/assets/finishes/${kind}/${color.id}.jpg`,
  color: color.hex,
  accent: shade(color.hex),
  category: kind,
})

export const finishes: Finish[] = [
  ...grains,
  ...paintColors.map((color) => toFinish('paint', color)),
  ...stainColors.map((color) => toFinish('stain', color)),
]
