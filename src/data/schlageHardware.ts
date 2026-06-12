export type SchlageHardwareOption = {
  manufacturer: 'Schlage'
  style: string
  finish: string
  assets: {
    L: string
    R: string
  }
}

// Partial catalog. Keep disconnected from the selector until the remaining Schlage hardware is added.
export const schlageHardware: SchlageHardwareOption[] = [
  // Accent Lever
  { manufacturer: 'Schlage', style: 'Accent Lever', finish: 'Aged Bronze', assets: { L: 'ACLAZL.png', R: 'ACLAZR.png' } },
  { manufacturer: 'Schlage', style: 'Accent Lever', finish: 'Bright Brass', assets: { L: 'ACLBBL.png', R: 'ACLBBR.png' } },
  { manufacturer: 'Schlage', style: 'Accent Lever with Deadbolt', finish: 'Aged Bronze', assets: { L: 'ACLDAZL.png', R: 'ACLDAZR.png' } },
  { manufacturer: 'Schlage', style: 'Accent Lever with Deadbolt', finish: 'Bright Brass', assets: { L: 'ACLDBBL.png', R: 'ACLDBBR.png' } },
  { manufacturer: 'Schlage', style: 'Accent Lever with Deadbolt', finish: 'Matte Black', assets: { L: 'ACLDMBL.png', R: 'ACLDMBR.png' } },
  { manufacturer: 'Schlage', style: 'Accent Lever with Deadbolt', finish: 'Satin Nickel', assets: { L: 'ACLDSNL.png', R: 'ACLDSNR.png' } },
  { manufacturer: 'Schlage', style: 'Accent Lever', finish: 'Matte Black', assets: { L: 'ACLMBL.png', R: 'ACLMBR.png' } },
  { manufacturer: 'Schlage', style: 'Accent Lever', finish: 'Satin Nickel', assets: { L: 'ACLSNL.png', R: 'ACLSNR.png' } },

  // Bowery
  { manufacturer: 'Schlage', style: 'Bowery Knob with Deadbolt', finish: 'Matte Black', assets: { L: 'BOCDMBL.png', R: 'BOCDMBR.png' } },
  { manufacturer: 'Schlage', style: 'Bowery Knob with Deadbolt', finish: 'Satin Nickel', assets: { L: 'BOCDSNL.png', R: 'BOCDSNR.png' } },
  { manufacturer: 'Schlage', style: 'Bowery Knob', finish: 'Matte Black', assets: { L: 'BOCMBL.png', R: 'BOCMBR.png' } },
  { manufacturer: 'Schlage', style: 'Bowery Knob', finish: 'Satin Nickel', assets: { L: 'BOCSNL.png', R: 'BOCSNR.png' } },

  // Camelot
  { manufacturer: 'Schlage', style: 'Camelot Handleset', finish: 'Bright Brass', assets: { L: 'CAHSBBL.png', R: 'CAHSBBR.png' } },
  { manufacturer: 'Schlage', style: 'Camelot Handleset', finish: 'Matte Black', assets: { L: 'CAHSMBL.png', R: 'CAHSMBR.png' } },
  { manufacturer: 'Schlage', style: 'Camelot Handleset', finish: 'Satin Nickel', assets: { L: 'CAHSSNL.png', R: 'CAHSSNR.png' } },

  // Century
  { manufacturer: 'Schlage', style: 'Century Handleset', finish: 'Matte Black', assets: { L: 'CEHSMBL.png', R: 'CEHSMBR.png' } },
  { manufacturer: 'Schlage', style: 'Century Handleset', finish: 'Satin Nickel', assets: { L: 'CEHSSNL.png', R: 'CEHSSNR.png' } },
]
