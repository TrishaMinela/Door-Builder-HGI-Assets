export type SchlageHardwareOption = {
  manufacturer: 'Schlage'
  style: string
  finish: string
  card: string
  exterior: string
  interior?: string
}

const card = (name: string) => `cards/schlage-${name}.png`
const preview = (name: string, view: 'exterior' | 'interior') => `schlage/${name}-${view}.png`

export const schlageHardware: SchlageHardwareOption[] = [
  { manufacturer: 'Schlage', style: 'Accent Lever with Deadbolt', finish: 'Bright Brass', card: card('accent-bright-brass'), exterior: preview('accent-bright-brass', 'exterior'), interior: preview('accent-bright-brass', 'interior') },
  { manufacturer: 'Schlage', style: 'Accent Lever with Deadbolt', finish: 'Matte Black', card: card('accent-matte-black'), exterior: preview('accent-matte-black', 'exterior'), interior: preview('accent-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Accent Lever with Deadbolt', finish: 'Satin Nickel', card: card('accent-satin-nickel'), exterior: preview('accent-satin-nickel', 'exterior'), interior: preview('accent-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Bowery Knob with Deadbolt', finish: 'Matte Black', card: card('bowery-matte-black'), exterior: preview('bowery-matte-black', 'exterior'), interior: preview('bowery-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Bowery Knob with Deadbolt', finish: 'Satin Nickel', card: card('bowery-satin-nickel'), exterior: preview('bowery-satin-nickel', 'exterior'), interior: preview('bowery-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Georgian Knob with Deadbolt', finish: 'Bright Brass', card: card('georgian-bright-brass'), exterior: preview('georgian-bright-brass', 'exterior'), interior: preview('georgian-bright-brass', 'interior') },
  { manufacturer: 'Schlage', style: 'Georgian Knob with Deadbolt', finish: 'Matte Black', card: card('georgian-matte-black'), exterior: preview('georgian-matte-black', 'exterior'), interior: preview('georgian-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Georgian Knob with Deadbolt', finish: 'Satin Nickel', card: card('georgian-satin-nickel'), exterior: preview('georgian-satin-nickel', 'exterior'), interior: preview('georgian-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Latitude Lever with Deadbolt', finish: 'Matte Black', card: card('latitude-matte-black'), exterior: preview('latitude-matte-black', 'exterior'), interior: preview('latitude-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Latitude Lever with Deadbolt', finish: 'Satin Nickel', card: card('latitude-satin-nickel'), exterior: preview('latitude-satin-nickel', 'exterior'), interior: preview('latitude-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Plymouth Handleset', finish: 'Bright Brass', card: card('plymouth-bright-brass'), exterior: preview('plymouth-bright-brass', 'exterior'), interior: preview('plymouth-bright-brass', 'interior') },
  { manufacturer: 'Schlage', style: 'Plymouth Handleset', finish: 'Matte Black', card: card('plymouth-matte-black'), exterior: preview('plymouth-matte-black', 'exterior'), interior: preview('plymouth-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Plymouth Handleset', finish: 'Satin Nickel', card: card('plymouth-satin-nickel'), exterior: preview('plymouth-satin-nickel', 'exterior'), interior: preview('plymouth-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Camelot Handleset', finish: 'Bright Brass', card: card('camelot-bright-brass'), exterior: preview('camelot-bright-brass', 'exterior') },
  { manufacturer: 'Schlage', style: 'Camelot Handleset', finish: 'Matte Black', card: card('camelot-matte-black'), exterior: preview('camelot-matte-black', 'exterior') },
  { manufacturer: 'Schlage', style: 'Camelot Handleset', finish: 'Satin Nickel', card: card('camelot-satin-nickel'), exterior: preview('camelot-satin-nickel', 'exterior') },

  { manufacturer: 'Schlage', style: 'Century Handleset', finish: 'Matte Black', card: card('century-matte-black'), exterior: preview('century-matte-black', 'exterior'), interior: preview('century-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Century Handleset', finish: 'Satin Nickel', card: card('century-satin-nickel'), exterior: preview('century-satin-nickel', 'exterior'), interior: preview('century-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Century Trim with Latitude Lever', finish: 'Matte Black', card: card('century-latitude-matte-black'), exterior: preview('century-latitude-matte-black', 'exterior'), interior: preview('century-latitude-matte-black', 'interior') },
  { manufacturer: 'Schlage', style: 'Century Trim with Latitude Lever', finish: 'Satin Nickel', card: card('century-latitude-satin-nickel'), exterior: preview('century-latitude-satin-nickel', 'exterior'), interior: preview('century-latitude-satin-nickel', 'interior') },

  { manufacturer: 'Schlage', style: 'Camelot Trim with Georgian Knob', finish: 'Satin Nickel', card: card('camelot-georgian-satin-nickel'), exterior: preview('camelot-georgian-satin-nickel', 'exterior'), interior: preview('camelot-georgian-satin-nickel', 'interior') },
]

export function schlageCardAsset(style: string, finish: string) {
  return schlageHardware.find((item) => item.style === style && item.finish === finish)?.card
}
