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
  finishType: 'paint' | 'stain'
}

export type GlassOption = {
  id: string
  name: string
  thumbnailPath: string
  overlaysByDoorStyle: Record<string, string>
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
  cardImage?: string
  exteriorPreviewImage?: string
  interiorPreviewImage?: string
}

export type PreviewHardware = Pick<HardwareOption, 'color' | 'type'> & Partial<HardwareOption>

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

export type DoorTypeOption = {
  id: string
  name: string
  lineIds: string[]
  requiresGrain: boolean
  grains: string[]
}

export type DoorLineChoice = {
  id: string
  name: string
  description: string
  image: string
  lineIds: string[]
  paintOnly?: boolean
  autoGrain?: string
}

export type DoorSwing = {
  id: 'LHI' | 'LHO' | 'RHI' | 'RHO'
  name: string
  image: string
}

export type ResolvedDoorProduct = {
  doorTypeLabel: 'Door Line'
  doorType: string
  doorTypes: string[]
  matchingVariants: DoorStyleVariant[]
  styleCodes: string[]
  grain?: string
}

export type DoorConfiguration = {
  product: ResolvedDoorProduct
  style: DoorStyle
  grain: string | null
  finish: Finish
  glass: GlassOption | null
  mainDoorGlass?: GlassOption | null
  grid: GridConfiguration | null
  hardware: HardwareOption
  doorSwing: DoorSwing
  sidelites: SideliteConfiguration
  sidelitePlacement?: SideliteConfiguration
  sideliteStyle?: string
  sideliteSlab?: 'fsl' | 'f48sl' | 'ssl' | 's2sl'
  sideliteGlass?: SideliteGlassConfiguration
}

export type SideliteConfiguration = 'none' | 'hinge-side' | 'lock-side' | 'both-sides'

export type GlassCoating = 'Standard / No Low-E' | 'Low-E' | 'Low-E Plus' | 'ODL Clear' | 'Standard / No Low-E or Low-E' | 'Low-E or Low-E Plus' | 'Standard / No Low-E, Low-E or Low-E Plus'
export type GridLocation = 'No Grids' | 'External' | 'Internal' | 'SDL' | 'Arts & Crafts'
export type GridStyle = 'Arts & Crafts' | 'Contoured' | 'Flat' | 'Prairie'
export type GridPattern = '2 Lite' | '3 Lite' | '4 Lite' | '4 Lite Horizontal' | '5 Lite' | '6 Lite' | '8 Lite' | '9 Lite' | '10 Lite' | '12 Lite' | '15 Lite'
export type GridColor = 'Beige' | 'Black' | 'Bronze' | 'Bronze/White' | 'Champagne' | 'Tan' | 'White'
export type GridWidth = '5/8"' | '7/8"' | '11/16"'

export type GridConfiguration = {
  glassCoating: GlassCoating
  gridLocation?: GridLocation
  gridStyle?: GridStyle
  gridPattern?: GridPattern
  gridColor?: GridColor
  gridWidth?: GridWidth
}

export type SideliteGlassConfiguration = {
  glass: string
  glassCategory: 'Clear Glass' | 'Decorative Glass' | 'Privacy Glass' | 'CLiC Glass' | 'Mini Blinds'
  glassAsset?: string
  glassCoating?: 'Standard / No Low-E' | 'Low-E' | 'Standard / No Low-E or Low-E'
  gridLocation?: 'Internal' | 'SDL'
  gridStyle?: GridStyle
  gridPattern?: GridPattern
  gridColor?: GridColor
  gridWidth?: GridWidth
}

export type ContactForm = {
  fullName: string
  email: string
  phone: string
  zip: string
}
