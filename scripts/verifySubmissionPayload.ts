import assert from 'node:assert/strict'
import submitDoorBuilder from '../api/submit-door-builder'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import type { DoorConfiguration, DoorConfigurationType, SideliteConfiguration } from '../src/types'

const baseConfiguration: DoorConfiguration = {
  doorConfigurationType: 'single',
  product: { doorTypeLabel: 'Door Line', doorType: '22 Gauge Steel', doorTypes: ['22 Gauge Steel'], matchingVariants: [], styleCodes: ['F764'] },
  doorLine: '22 Gauge Steel',
  style: { id: 'f764', code: 'F764', name: 'FULL TWIN LITE', description: '', eyebrow: '', image: '', hasGlass: true, allowedGrains: [], allowsColors: true, variants: [], panel: 'modern' },
  grain: null,
  finish: { id: 'paint-white', name: 'White', description: '', image: '', color: '#ffffff', accent: '#eeeeee', category: 'paint', finishType: 'paint', proMatch: true },
  doorFinishType: 'paint',
  doorFinishColor: 'White',
  jambType: 'timber',
  jambFinishType: 'paint',
  jambFinishColor: 'Terratone',
  glass: { id: 'clear', name: 'Clear Glass', thumbnailPath: '', overlaysByDoorStyle: {} },
  mainDoorGlass: { id: 'clear', name: 'Clear Glass', thumbnailPath: '', overlaysByDoorStyle: {} },
  grid: null,
  hardware: { id: 'test', manufacturer: 'Schlage', style: 'Century Handleset', finish: 'Matte Black', handing: 'Left', view: 'Exterior', asset: '', color: '#000000', type: 'long' },
  doorSwing: { id: 'LHI', name: 'Left Hand Inswing', image: '' },
  sidelites: 'none',
  sidelitePlacement: 'none',
}

const contact = { fullName: 'Jane Marie Smith', email: ' jane@example.com ', phone: ' (555) 123-4567 ', zip: ' 46741 ', notes: 'Call after 5.' }
const placements: SideliteConfiguration[] = ['none', 'hinge-side', 'lock-side', 'both-sides']
const configurationTypes: DoorConfigurationType[] = ['single', 'french', 'savannah']

for (const doorConfigurationType of configurationTypes) {
  for (const placement of placements) {
    const payload = buildDoorBuilderSubmissionPayload({
      submittedAt: '2026-08-29T00:00:00.000Z',
      contact,
      configuration: {
        ...baseConfiguration,
        doorConfigurationType,
        doubleDoorLockPrep: doorConfigurationType === 'single' ? undefined : 'DDLLBO',
        sidelites: placement,
        sidelitePlacement: placement,
        // Deliberately retain stale state to verify it is ignored for NOSIDE.
        sideliteStyle: 'FSL',
        sideliteGlass: { glass: 'Clear Glass with Grids', glassCategory: 'Clear Glass', gridLocation: 'Internal', gridStyle: 'Flat', gridPattern: '4 Lite', gridColor: 'White', gridWidth: '5/8"' },
      },
    })

    assert.equal(payload.first_name, 'Jane')
    assert.equal(payload.last_name, 'Marie Smith')
    assert.equal(payload.email, 'jane@example.com')
    assert.equal(payload.door_configuration, doorConfigurationType === 'single' ? 'Single Door' : doorConfigurationType === 'french' ? 'French Door' : 'Savannah Door')
    assert.ok(!payload.lock_setup.includes('DDLL'))
    assert.equal(payload.lock_setup, doorConfigurationType === 'single' ? 'Not applicable' : 'Locks on Both Doors')
    assert.equal(payload.hinge_option, doorConfigurationType === 'savannah' ? 'Hinge Off Outer Jamb' : 'Not applicable')
    if (placement === 'none') {
      assert.equal(payload.sidelite_placement, 'No Sidelites')
      assert.equal(payload.sidelite_slab, 'Not applicable')
      assert.equal(payload.sidelite_glass, 'Not applicable')
    } else {
      assert.equal(payload.sidelite_slab, 'FSL')
      assert.match(payload.sidelite_glass, /Clear Glass with Grids/)
    }
  }
}

const stainPayload = buildDoorBuilderSubmissionPayload({
  contact,
  configuration: {
    ...baseConfiguration,
    finish: { ...baseConfiguration.finish, id: 'stain-auburn', name: 'Auburn', category: 'stain', finishType: 'stain' },
    doorFinishType: 'stain',
    doorFinishColor: 'Auburn',
    jambFinishType: 'stain',
    jambFinishColor: 'Cinnamon',
    hardware: { ...baseConfiguration.hardware, manufacturer: 'Baldwin', style: 'Seattle', finish: 'Satin Nickel' },
    grid: { glassCoating: 'Low-E', gridLocation: 'Internal', gridStyle: 'Prairie', gridPattern: '5 Lite', gridColor: 'White', gridWidth: '7/8"' },
  },
})
assert.equal(stainPayload.door_finish_type, 'Stain')
assert.equal(stainPayload.jamb_finish_type, 'Stain')
assert.equal(stainPayload.jamb_finish_color, 'Cinnamon')
assert.equal(stainPayload.hardware, 'Baldwin Seattle - Satin Nickel')
assert.match(stainPayload.main_door_glass, /Prairie/)

process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL = 'https://example.invalid/zapier-catch-hook'
let forwardedPayload: Record<string, string> | undefined
globalThis.fetch = async (url, options) => {
  assert.equal(url, process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL)
  forwardedPayload = JSON.parse(String(options?.body))
  return new Response(JSON.stringify({ status: 'success' }), { status: 200 })
}
let responseStatus = 0
let responseBody: unknown
await submitDoorBuilder(
  { method: 'POST', body: { ...stainPayload, ignored_extra_field: 'must not reach Zapier' } },
  {
    setHeader: () => undefined,
    status(code: number) { responseStatus = code; return this },
    json(body: unknown) { responseBody = body },
  },
)
assert.equal(responseStatus, 200)
assert.deepEqual(responseBody, { ok: true })
assert.equal(forwardedPayload?.ignored_extra_field, undefined)
assert.deepEqual(Object.keys(forwardedPayload ?? {}).sort(), Object.keys(stainPayload).sort())

console.info(`Verified ${configurationTypes.length * placements.length + 1} Door Builder submission scenarios and server forwarding.`)
