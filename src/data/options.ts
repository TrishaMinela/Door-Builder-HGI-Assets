import type { Finish } from '../types.js'
import { paintColors, stainColors } from './finishes.js'
export { glassOptions } from './glassOptions.js'
export { hardwareOptions } from './hardware.js'
import { catalogDoorStyles } from './productCatalog.js'

export const doorStyles = catalogDoorStyles

const shade = (hex: string, amount = 35) => {
  const value = Number.parseInt(hex.slice(1), 16)
  const r = Math.max(0, (value >> 16) - amount)
  const g = Math.max(0, ((value >> 8) & 0xff) - amount)
  const b = Math.max(0, (value & 0xff) - amount)
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

const toFinish = (kind: 'paint' | 'stain', color: { id: string; name: string; hex: string; proMatch?: boolean }): Finish => ({
  id: `${kind}-${color.id}`,
  name: color.name,
  description: `Home Guard ${kind} color.`,
  image: `/assets/finishes/${kind}/${color.id}.webp`,
  color: color.hex,
  accent: shade(color.hex),
  category: kind,
  finishType: kind,
  proMatch: color.proMatch === true,
})

export const finishes: Finish[] = [
  ...paintColors.map((color) => toFinish('paint', color)),
  ...stainColors.map((color) => toFinish('stain', color)),
]
