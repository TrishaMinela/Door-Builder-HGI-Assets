export type DoorStyle = {
  id: string
  name: string
  description: string
  eyebrow: string
  image: string
  allowedFinishes: string[]
  allowedGlass: string[]
  allowedHardware: string[]
  panel: 'craftsman' | 'heritage' | 'modern' | 'classic'
}

export type Finish = {
  id: string
  name: string
  description: string
  image: string
  color: string
  accent: string
  compatibleDoorStyles: string[]
}

export type GlassOption = {
  id: string
  name: string
  description: string
  image: string
  compatibleDoorStyles: string[]
  pattern: 'clear' | 'rain' | 'geometric' | 'frosted'
}

export type HardwareOption = {
  id: string
  name: string
  description: string
  image: string
  finish: string
  compatibleDoorStyles: string[]
  color: string
  type: 'long' | 'lever' | 'round'
}

export type ContactForm = {
  fullName: string
  email: string
  phone: string
  zip: string
}
