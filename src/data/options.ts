import type { DoorStyle, Finish, GlassOption, HardwareOption } from '../types'

const allStyles = ['craftsman', 'heritage', 'modern', 'classic']
const allFinishes = ['forest', 'walnut', 'navy', 'charcoal', 'clay', 'white']

export const doorStyles: DoorStyle[] = [
  { id: 'craftsman', name: 'Craftsman', eyebrow: 'Warm & welcoming', description: 'A timeless three-panel entry with a generous upper lite.', image: '/assets/doors/craftsman.png', allowedFinishes: allFinishes, allowedGlass: ['clear', 'rain', 'geometric', 'frosted'], allowedHardware: ['black-long', 'bronze-lever', 'nickel-round'], panel: 'craftsman' },
  { id: 'heritage', name: 'Heritage', eyebrow: 'Traditional character', description: 'Classic raised panels and an elegant arched glass opening.', image: '/assets/doors/heritage.png', allowedFinishes: ['forest', 'walnut', 'navy', 'charcoal', 'white'], allowedGlass: ['clear', 'rain', 'geometric', 'frosted'], allowedHardware: ['bronze-lever', 'nickel-round'], panel: 'heritage' },
  { id: 'modern', name: 'Modern Flush', eyebrow: 'Clean & architectural', description: 'A confident flush face with a narrow vertical glass lite.', image: '/assets/doors/modern.png', allowedFinishes: ['forest', 'walnut', 'navy', 'charcoal', 'clay'], allowedGlass: ['clear', 'rain', 'frosted'], allowedHardware: ['black-long', 'nickel-round'], panel: 'modern' },
  { id: 'classic', name: 'Classic Six Panel', eyebrow: 'Enduring favorite', description: 'Balanced proportions and familiar six-panel detailing.', image: '/assets/doors/classic.png', allowedFinishes: allFinishes, allowedGlass: ['clear'], allowedHardware: ['bronze-lever', 'nickel-round'], panel: 'classic' },
]

export const finishes: Finish[] = [
  { id: 'forest', name: 'Woodland Green', description: 'Deep architectural green.', image: '/assets/finishes/forest.jpg', color: '#254f3d', accent: '#153529', compatibleDoorStyles: allStyles },
  { id: 'walnut', name: 'Rich Walnut', description: 'Warm wood-inspired finish.', image: '/assets/finishes/walnut.jpg', color: '#74462e', accent: '#422719', compatibleDoorStyles: allStyles },
  { id: 'navy', name: 'Heritage Navy', description: 'Rich, confident navy.', image: '/assets/finishes/navy.jpg', color: '#263e56', accent: '#172737', compatibleDoorStyles: allStyles },
  { id: 'charcoal', name: 'Iron Charcoal', description: 'Versatile near-black gray.', image: '/assets/finishes/charcoal.jpg', color: '#353a3d', accent: '#1e2224', compatibleDoorStyles: allStyles },
  { id: 'clay', name: 'Warm Clay', description: 'Earthy, welcoming red.', image: '/assets/finishes/clay.jpg', color: '#9d513d', accent: '#663125', compatibleDoorStyles: ['craftsman', 'modern', 'classic'] },
  { id: 'white', name: 'Classic White', description: 'Bright and timeless.', image: '/assets/finishes/white.jpg', color: '#e8e5dc', accent: '#bdb9ae', compatibleDoorStyles: ['craftsman', 'heritage', 'classic'] },
]

export const glassOptions: GlassOption[] = [
  { id: 'clear', name: 'Clear View', description: 'Maximum natural light with a clean, open appearance.', image: '/assets/glass/clear.png', compatibleDoorStyles: allStyles, pattern: 'clear' },
  { id: 'rain', name: 'Rain Glass', description: 'Soft privacy with a flowing, water-inspired texture.', image: '/assets/glass/rain.png', compatibleDoorStyles: ['craftsman', 'heritage', 'modern'], pattern: 'rain' },
  { id: 'geometric', name: 'Geometric Leaded', description: 'Decorative lines add crafted character and privacy.', image: '/assets/glass/geometric.png', compatibleDoorStyles: ['craftsman', 'heritage'], pattern: 'geometric' },
  { id: 'frosted', name: 'Frosted Privacy', description: 'A bright, diffused look with excellent privacy.', image: '/assets/glass/frosted.png', compatibleDoorStyles: ['craftsman', 'heritage', 'modern'], pattern: 'frosted' },
]

export const hardwareOptions: HardwareOption[] = [
  { id: 'black-long', name: 'Modern Matte Black', description: 'Long pull handle with matching square deadbolt.', image: '/assets/hardware/black-long.png', finish: 'Matte Black', compatibleDoorStyles: ['craftsman', 'modern'], color: '#191b1b', type: 'long' },
  { id: 'bronze-lever', name: 'Aged Bronze Lever', description: 'Traditional lever set with warm bronze character.', image: '/assets/hardware/bronze-lever.png', finish: 'Aged Bronze', compatibleDoorStyles: ['craftsman', 'heritage', 'classic'], color: '#5b4633', type: 'lever' },
  { id: 'nickel-round', name: 'Satin Nickel Knob', description: 'Simple round knob with a soft brushed finish.', image: '/assets/hardware/nickel-round.png', finish: 'Satin Nickel', compatibleDoorStyles: allStyles, color: '#a9ada9', type: 'round' },
]
