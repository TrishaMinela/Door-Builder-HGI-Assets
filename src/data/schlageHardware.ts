export type SchlageHardwareOption = {
  manufacturer: 'Schlage'
  style: string
  finish: string
  cardImage: string
  exteriorPreviewImage?: string
  interiorPreviewImage?: string
}

const card = (name: string) => `cards/schlage-${name}.png`
const preview = (name: string, view: 'exterior' | 'interior') => `schlage/${name}-${view}.png`

export const schlageHardware: SchlageHardwareOption[] = [
  { manufacturer: 'Schlage', style: 'Accent Lever with Deadbolt', finish: 'Bright Brass', cardImage: card('accent-bright-brass'), exteriorPreviewImage: preview('accent-bright-brass', 'exterior'), interiorPreviewImage: preview('accent-bright-brass', 'interior') },
  { manufacturer: 'Schlage', style: 'Accent Lever with Deadbolt', finish: 'Matte Black', cardImage: card('accent-matte-black'), exteriorPreviewImage: preview('accent-matte-black', 'exterior'), interiorPreviewImage: preview('accent-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Accent Lever with Deadbolt', finish: 'Satin Nickel', cardImage: card('accent-satin-nickel'), exteriorPreviewImage: preview('accent-satin-nickel', 'exterior'), interiorPreviewImage: preview('accent-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Bowery Knob with Deadbolt', finish: 'Matte Black', cardImage: card('bowery-matte-black'), exteriorPreviewImage: preview('bowery-matte-black', 'exterior'), interiorPreviewImage: preview('bowery-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Bowery Knob with Deadbolt', finish: 'Satin Nickel', cardImage: card('bowery-satin-nickel'), exteriorPreviewImage: preview('bowery-satin-nickel', 'exterior'), interiorPreviewImage: preview('bowery-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Georgian Knob with Deadbolt', finish: 'Bright Brass', cardImage: card('georgian-bright-brass'), exteriorPreviewImage: preview('georgian-bright-brass', 'exterior'), interiorPreviewImage: preview('georgian-bright-brass', 'interior') },
  { manufacturer: 'Schlage', style: 'Georgian Knob with Deadbolt', finish: 'Matte Black', cardImage: card('georgian-matte-black'), exteriorPreviewImage: preview('georgian-matte-black', 'exterior'), interiorPreviewImage: preview('georgian-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Georgian Knob with Deadbolt', finish: 'Satin Nickel', cardImage: card('georgian-satin-nickel'), exteriorPreviewImage: preview('georgian-satin-nickel', 'exterior'), interiorPreviewImage: preview('georgian-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Latitude Lever with Deadbolt', finish: 'Bright Brass', cardImage: card('latitude-bright-brass'), exteriorPreviewImage: 'schlage/Preview - Schlage - Exterior - Latitude - Bright Brass.png', interiorPreviewImage: 'schlage/Preview - Schlage - Interior - Latitude - Bright Brass.png' },
  { manufacturer: 'Schlage', style: 'Latitude Lever with Deadbolt', finish: 'Matte Black', cardImage: card('latitude-matte-black'), exteriorPreviewImage: 'schlage/Preview - Schlage - Exterior - Latitude - Matte Black.png', interiorPreviewImage: 'schlage/Preview - Schlage - Interior - Latitude - Matte Black.png' },
  { manufacturer: 'Schlage', style: 'Latitude Lever with Deadbolt', finish: 'Satin Nickel', cardImage: card('latitude-satin-nickel'), exteriorPreviewImage: 'schlage/Preview - Schlage - Exterior - Latitude - Satin Nickel.png', interiorPreviewImage: 'schlage/Preview - Schlage - Interior - Latitude - Satin Nickel.png' },

  { manufacturer: 'Schlage', style: 'Plymouth Handleset', finish: 'Bright Brass', cardImage: card('plymouth-bright-brass'), exteriorPreviewImage: preview('plymouth-bright-brass', 'exterior'), interiorPreviewImage: preview('plymouth-bright-brass', 'interior') },
  { manufacturer: 'Schlage', style: 'Plymouth Handleset', finish: 'Matte Black', cardImage: card('plymouth-matte-black'), exteriorPreviewImage: preview('plymouth-matte-black', 'exterior'), interiorPreviewImage: preview('plymouth-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Plymouth Handleset', finish: 'Satin Nickel', cardImage: card('plymouth-satin-nickel'), exteriorPreviewImage: preview('plymouth-satin-nickel', 'exterior'), interiorPreviewImage: preview('plymouth-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Camelot Handleset', finish: 'Bright Brass', cardImage: card('camelot-bright-brass'), exteriorPreviewImage: 'schlage/Preview - Schlage - Exterior - Camelot - Bright Brass.png', interiorPreviewImage: 'schlage/Preview - Schlage - Interior - Camelot - Bright Brass.png' },
  { manufacturer: 'Schlage', style: 'Camelot Handleset', finish: 'Matte Black', cardImage: card('camelot-matte-black'), exteriorPreviewImage: 'schlage/Preview - Schlage - Exterior - Camelot - Matte Black.png', interiorPreviewImage: 'schlage/Preview - Schlage - Interior - Camelot - Matte Black.png' },
  { manufacturer: 'Schlage', style: 'Camelot Handleset', finish: 'Satin Nickel', cardImage: card('camelot-satin-nickel'), exteriorPreviewImage: 'schlage/Preview - Schlage - Exterior - Camelot - Satin Nickel.png', interiorPreviewImage: 'schlage/Preview - Schlage - Interior - Camelot - Satin Nickel.png' },

  { manufacturer: 'Schlage', style: 'Century Handleset', finish: 'Matte Black', cardImage: card('century-matte-black'), exteriorPreviewImage: preview('century-matte-black', 'exterior'), interiorPreviewImage: preview('century-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Century Handleset', finish: 'Satin Nickel', cardImage: card('century-satin-nickel'), exteriorPreviewImage: preview('century-satin-nickel', 'exterior'), interiorPreviewImage: preview('century-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Century Trim with Latitude Lever', finish: 'Matte Black', cardImage: card('century-latitude-matte-black'), exteriorPreviewImage: preview('century-latitude-matte-black', 'exterior'), interiorPreviewImage: preview('century-latitude-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Century Trim with Latitude Lever', finish: 'Satin Nickel', cardImage: card('century-latitude-satin-nickel'), exteriorPreviewImage: preview('century-latitude-satin-nickel', 'exterior'), interiorPreviewImage: preview('century-latitude-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Camelot Trim with Georgian Knob', finish: 'Satin Nickel', cardImage: card('camelot-georgian-satin-nickel'), exteriorPreviewImage: preview('camelot-georgian-satin-nickel', 'exterior'), interiorPreviewImage: preview('camelot-georgian-satin-nickel', 'interior') },
]

export function resolveSchlageHardware(style: string, finish: string) {
  return schlageHardware.find((item) => item.style === style && item.finish === finish)
}
