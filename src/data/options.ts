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

const toFinish = (kind: 'paint' | 'stain', color: { id: string; name: string; hex: string }): Finish => ({
  id: `${kind}-${color.id}`,
  name: color.name,
  description: `Home Guard ${kind} color.`,
  image: `/assets/finishes/${kind}/${color.id}.png`,
  color: color.hex,
  accent: shade(color.hex),
  category: kind,
  finishType: kind,
})

export const finishes: Finish[] = [
  ...paintColors.map((color) => toFinish('paint', color)),
  ...stainColors.map((color) => toFinish('stain', color)),
]
