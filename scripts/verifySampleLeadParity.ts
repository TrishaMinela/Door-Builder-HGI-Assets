import assert from 'node:assert/strict'
import { buildSampleDoorBuilderLead } from '../src/utils/sampleDoorBuilderLead'

const payload = buildSampleDoorBuilderLead({
  fullName: 'Trisha Sumiran',
  email: 'Trisha.byu@gmail.com',
  phone: '8083934057',
  postalCode: '91762',
  notes: 'TEST LEAD — NOT A REAL CUSTOMER',
  submittedAt: '2026-11-20T16:00:00.000Z',
})

assert.deepEqual(payload, {
  submitted_at: '2026-11-20T16:00:00.000Z',
  first_name: 'Trisha',
  last_name: 'Sumiran',
  full_name: 'Trisha Sumiran',
  email: 'Trisha.byu@gmail.com',
  phone: '8083934057',
  postal_code: '91762',
  notes: 'TEST LEAD — NOT A REAL CUSTOMER',
  door_configuration: 'French Door',
  door_line: 'Paintable and Stainable Steel',
  door_style: 'F764 - FULL TWIN LITE',
  sidelite_placement: 'Sidelites on Both Sides',
  sidelite_slab: 'FSL - Full Sidelite',
  sidelite_glass: 'Clear Glass',
  main_door_glass: 'Clear Glass',
  door_finish_type: 'Paint',
  door_finish_color: 'White',
  jamb_type: 'Timber',
  jamb_finish_type: 'Paint',
  jamb_finish_color: 'White',
  hardware: 'Schlage Century Handleset - Matte Black',
  lock_setup: 'Lock on Main Door Only',
  door_swing: 'Both slabs operable',
  hinge_option: 'Not applicable',
})

console.log('PASS sample lead matches the live Door Builder payload builder')
