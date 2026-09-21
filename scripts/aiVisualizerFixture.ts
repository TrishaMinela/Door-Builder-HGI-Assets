import { doorStyles, finishes, hardwareOptions } from '../src/data/options'
import type { DoorConfiguration } from '../src/types'

const style = doorStyles.find(item => item.code === 'F1')!
const variant = style.variants.find(item => item.lineId === '22-gauge-steel')!
export const aiTestConfiguration: DoorConfiguration = {
  doorConfigurationType: 'single', style, grain: null,
  product: { doorTypeLabel: 'Door Line', doorType: variant.lineName, doorTypes: [variant.lineId], matchingVariants: [variant], styleCodes: [variant.code] },
  finish: finishes.find(item => item.id === 'paint-black')!, glass: null, grid: null,
  hardware: hardwareOptions[0], doorSwing: { id: 'LHI', name: 'Left Hand Inswing', image: '' },
  sidelites: 'none', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'Black',
}
