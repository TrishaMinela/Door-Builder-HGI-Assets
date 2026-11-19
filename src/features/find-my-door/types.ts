export const STYLE_CHOICES = [
  { id: 'timeless', name: 'Timeless & Classic', description: 'Raised panels and balanced proportions that stay in style.' },
  { id: 'warm', name: 'Warm & Welcoming', description: 'Wood tones and softer details that feel inviting.' },
  { id: 'bold', name: 'Bold Statement', description: 'Deep color and a door that becomes the focal point.' },
  { id: 'modern', name: 'Clean & Modern', description: 'Simple lines, smooth surfaces, and quiet hardware.' },
  { id: 'rustic', name: 'Rustic Farmhouse', description: 'Grids, texture, and a relaxed country entry.' },
  { id: 'coastal', name: 'Coastal & Light', description: 'Pale finishes and glass that keep the entry bright.' },
] as const

export const LIGHT_CHOICES = [
  { id: 'lots', name: 'Lots of light', description: 'A large clear lite that opens up the entry.' },
  { id: 'some', name: 'Some light', description: 'Glass, with more door around it.' },
  { id: 'privacy', name: 'Full privacy', description: 'Little or no view through the door.' },
] as const

export type StyleMood = (typeof STYLE_CHOICES)[number]['id']
export type LightPreference = (typeof LIGHT_CHOICES)[number]['id']
export type OpeningHint = 'single' | 'double' | 'sidelites' | 'unknown'

export type HouseReading = {
  architecture: string
  siding: string
  trim: string
  opening: OpeningHint
}

export const styleChoice = (id: StyleMood) => STYLE_CHOICES.find((choice) => choice.id === id)!
export const lightChoice = (id: LightPreference) => LIGHT_CHOICES.find((choice) => choice.id === id)!
