export type DoorStyle = {
  id: string
  code: string
  name: string
  description: string
  eyebrow: string
  image: string
  hasGlass: boolean
  allowedGrains: string[]
  allowsColors: boolean
  variants: DoorStyleVariant[]
  panel: 'craftsman' | 'heritage' | 'modern' | 'classic'
}

export type DoorStyleVariant = {
  lineId: string
  lineName: string
  code: string
  grains: string[]
  allowsColors: boolean
}

export type Finish = {
  id: string
  name: string
  description: string
  image: string
  color: string
  accent: string
  category: 'grain' | 'paint' | 'stain'
}

export type GlassOption = {
  id: string
  name: string
}

export type HardwareManufacturer = 'Baldwin' | 'Schlage'
export type HardwareStyleName = string
export type HardwareFinishName = string
export type HardwareHanding = 'Left' | 'Right'
export type HardwareView = 'Interior' | 'Exterior'

export type HardwareAsset = {
  manufacturer: HardwareManufacturer
  style: HardwareStyleName
  finish: HardwareFinishName
  handing: HardwareHanding
  view: HardwareView
  asset: string
}

export type HardwareOption = HardwareAsset & {
  id: string
  color: string
  type: 'long' | 'lever' | 'round'
}

export type HardwareStyleOption = {
  id: string
  manufacturer: HardwareManufacturer
  style: HardwareStyleName
}

export type DoorLine = {
  id: string
  name: string
  grains: string[]
  allowsColors: boolean
  styles: { code: string; name: string; hasGlass: boolean }[]
}

export type ResolvedDoorProduct = {
  doorTypeLabel: 'Door Type' | 'Available Door Types'
  doorType: string
  doorTypes: string[]
  matchingVariants: DoorStyleVariant[]
  styleCodes: string[]
  grain?: string
}

export type ContactForm = {
  fullName: string
  email: string
  phone: string
  zip: string
}
