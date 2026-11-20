import { buildDoorBuilderSubmissionPayload } from './submission'
import type { DoorConfiguration } from '../types'

// Catalog display values only. This object is not saved and is not a product-row id.
const sampleConfiguration = {
  doorConfigurationType: 'french',
  doubleDoorLockPrep: 'DDLLAC',
  product: {
    doorTypeLabel: 'Door Line',
    doorType: 'Paintable and Stainable Steel',
    doorTypes: ['Paintable and Stainable Steel'],
    matchingVariants: [{ lineId: '22-gauge-steel' }],
    styleCodes: ['F764'],
  },
  doorLine: 'Paintable and Stainable Steel',
  style: {
    id: 'f764',
    code: 'F764',
    name: 'F764 - FULL TWIN LITE',
    description: '',
    eyebrow: '',
    image: '',
    hasGlass: true,
    allowedGrains: [],
    allowsColors: true,
    variants: [],
    panel: 'modern',
  },
  grain: 'Oak',
  finish: {
    id: 'paint-white',
    name: 'White',
    description: '',
    image: '',
    color: '#ffffff',
    accent: '#eeeeee',
    category: 'paint',
    finishType: 'paint',
    proMatch: true,
  },
  doorFinishType: 'paint',
  doorFinishColor: 'White',
  jambType: 'timber',
  jambFinishType: 'paint',
  jambFinishColor: 'White',
  glass: { id: 'clear', name: 'Clear Glass', thumbnailPath: '', overlaysByDoorStyle: {} },
  mainDoorGlass: { id: 'clear', name: 'Clear Glass', thumbnailPath: '', overlaysByDoorStyle: {} },
  grid: null,
  hardware: {
    id: 'schlage-century-matte-black',
    manufacturer: 'Schlage',
    style: 'Century Handleset',
    finish: 'Matte Black',
    handing: 'Left',
    view: 'Exterior',
    asset: '',
    color: '#191919',
    type: 'long',
  },
  doorSwing: { id: 'LHI', name: 'Left Hand Inswing', image: '' },
  sidelites: 'both-sides',
  sidelitePlacement: 'both-sides',
  sideliteStyle: 'FSL - Full Sidelite',
  sideliteGlass: { glass: 'Clear Glass', glassCategory: 'Clear Glass' },
} as unknown as DoorConfiguration

export function buildSampleDoorBuilderLead(input: {
  fullName: string
  email: string
  phone: string
  postalCode: string
  notes: string
  submittedAt: string
}) {
  return buildDoorBuilderSubmissionPayload({
    submittedAt: input.submittedAt,
    contact: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      zip: input.postalCode,
      notes: input.notes,
    },
    configuration: sampleConfiguration,
  })
}
