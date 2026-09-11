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
  doorFinishType: 'paint', doorFinishColor: 'White', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'Terratone',
  glass: { id: 'clear', name: 'Clear Glass', thumbnailPath: '', overlaysByDoorStyle: {} },
  mainDoorGlass: { id: 'clear', name: 'Clear Glass', thumbnailPath: '', overlaysByDoorStyle: {} },
  grid: null,
  hardware: { id: 'test', manufacturer: 'Schlage', style: 'Century Handleset', finish: 'Matte Black', handing: 'Left', view: 'Exterior', asset: '', color: '#000000', type: 'long' },
  doorSwing: { id: 'LHI', name: 'Left Hand Inswing', image: '' },
  sidelites: 'none', sidelitePlacement: 'none',
}

const contact = { fullName: 'Jane Marie Smith', email: ' jane@example.com ', phone: ' (555) 123-4567 ', zip: ' 46741 ', notes: 'Call after 5.' }
const placements: SideliteConfiguration[] = ['none', 'hinge-side', 'lock-side', 'both-sides']
const configurationTypes: DoorConfigurationType[] = ['single', 'french', 'savannah']

for (const doorConfigurationType of configurationTypes) {
  for (const placement of placements) {
    const payload = buildDoorBuilderSubmissionPayload({
      submittedAt: '2026-08-29T00:00:00.000Z', contact,
      configuration: {
        ...baseConfiguration, doorConfigurationType,
        doubleDoorLockPrep: doorConfigurationType === 'single' ? undefined : 'DDLLBO',
        sidelites: placement, sidelitePlacement: placement, sideliteStyle: 'FSL',
        sideliteGlass: { glass: 'Clear Glass with Grids', glassCategory: 'Clear Glass', gridLocation: 'Internal', gridStyle: 'Flat', gridPattern: '4 Lite', gridColor: 'White', gridWidth: '5/8"' },
      },
    })
    assert.equal(payload.first_name, 'Jane')
    assert.equal(payload.last_name, 'Marie Smith')
    assert.equal(payload.email, 'jane@example.com')
    assert.equal(payload.door_configuration, doorConfigurationType === 'single' ? 'Single Door' : doorConfigurationType === 'french' ? 'French Door' : 'Savannah Door')
    assert.equal(payload.lock_setup, doorConfigurationType === 'single' ? 'Not applicable' : 'Locks on Both Doors')
    assert.equal(payload.hinge_option, doorConfigurationType === 'savannah' ? 'Hinge Off Outer Jamb' : 'Not applicable')
    assert.equal(payload.sidelite_slab, placement === 'none' ? 'Not applicable' : 'FSL')
  }
}

const configuration: DoorConfiguration = {
  ...baseConfiguration,
  finish: { ...baseConfiguration.finish, id: 'stain-auburn', name: 'Auburn', category: 'stain', finishType: 'stain' },
  doorFinishType: 'stain', doorFinishColor: 'Auburn', jambFinishType: 'stain', jambFinishColor: 'Cinnamon',
  hardware: { ...baseConfiguration.hardware, manufacturer: 'Baldwin', style: 'Seattle', finish: 'Satin Nickel' },
  grid: { glassCoating: 'Low-E', gridLocation: 'Internal', gridStyle: 'Prairie', gridPattern: '5 Lite', gridColor: 'White', gridWidth: '7/8"' },
  glassFrameColorMode: 'custom', glassFrameFinishId: 'paint-black', glassFrameFinishColor: 'Black', jambFinishOverridden: true,
}
const zapierPayload = buildDoorBuilderSubmissionPayload({ contact, configuration })
const submissionId = 'c1950cf7-6273-4a5c-a0c8-4a531831d906'
const snapshot = { schemaVersion: 1 as const, configuration }
const validRequest = { ...zapierPayload, submissionId, doorConfiguration: snapshot }

process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL = 'https://example.invalid/zapier-catch-hook'
process.env.SUPABASE_URL = 'https://dealer-portal.supabase.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

type Outcome = { supabase: boolean; zapier: boolean }
type Captures = { supabaseBodies: Record<string, unknown>[]; zapierBodies: Record<string, unknown>[]; supabaseUrls: string[]; supabaseHeaders: Headers[]; callOrder: string[] }

async function invoke(body: unknown, outcome: Outcome, seenIds = new Set<string>()) {
  const captures: Captures = { supabaseBodies: [], zapierBodies: [], supabaseUrls: [], supabaseHeaders: [], callOrder: [] }
  let fetchCount = 0
  globalThis.fetch = async (url, options) => {
    fetchCount += 1
    const target = String(url)
    const parsed = JSON.parse(String(options?.body)) as Record<string, unknown>
    if (target.includes('.supabase.invalid/rest/v1/leads')) {
      captures.callOrder.push('supabase')
      captures.supabaseUrls.push(target); captures.supabaseHeaders.push(new Headers(options?.headers)); captures.supabaseBodies.push(parsed)
      if (!outcome.supabase) return new Response(null, { status: 500 })
      const id = String(parsed.submission_id)
      if (!seenIds.has(id)) seenIds.add(id)
      return new Response(null, { status: 201 })
    }
    assert.equal(target, process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL)
    captures.callOrder.push('zapier')
    captures.zapierBodies.push(parsed)
    return new Response(null, { status: outcome.zapier ? 200 : 500 })
  }
  let status = 0
  let responseBody: unknown
  await submitDoorBuilder(
    { method: 'POST', body },
    { setHeader: () => undefined, status(code: number) { status = code; return this }, json(value: unknown) { responseBody = value } },
  )
  return { status, responseBody, captures, fetchCount }
}

const bothSucceed = await invoke(validRequest, { supabase: true, zapier: true })
assert.equal(bothSucceed.status, 200)
assert.deepEqual(bothSucceed.responseBody, { ok: true, destinations: { supabase: 'succeeded', zapier: 'succeeded' } })
assert.deepEqual(bothSucceed.captures.callOrder, ['supabase', 'zapier'])
assert.equal(bothSucceed.captures.supabaseBodies[0].dealer_id, null)
assert.equal(bothSucceed.captures.supabaseBodies[0].submission_id, submissionId)
assert.deepEqual(bothSucceed.captures.supabaseBodies[0].door_configuration, snapshot)
assert.equal(bothSucceed.captures.supabaseBodies[0].first_name, 'Jane')
assert.equal(bothSucceed.captures.supabaseBodies[0].last_name, 'Marie Smith')
assert.equal(bothSucceed.captures.supabaseBodies[0].source, 'door_builder')
assert.equal(bothSucceed.captures.supabaseBodies[0].status, 'new')
assert.match(bothSucceed.captures.supabaseUrls[0], /on_conflict=submission_id/)
assert.match(bothSucceed.captures.supabaseHeaders[0].get('prefer') ?? '', /resolution=ignore-duplicates/)
assert.equal(bothSucceed.captures.supabaseHeaders[0].get('apikey'), process.env.SUPABASE_SERVICE_ROLE_KEY)

// The existing Zapier contract remains exactly the same flat allowlisted payload.
assert.deepEqual(bothSucceed.captures.zapierBodies[0], zapierPayload)
assert.equal('submissionId' in bothSucceed.captures.zapierBodies[0], false)
assert.equal('doorConfiguration' in bothSucceed.captures.zapierBodies[0], false)

const supabaseOnly = await invoke(validRequest, { supabase: true, zapier: false })
assert.equal(supabaseOnly.status, 502)
assert.deepEqual(supabaseOnly.responseBody, { error: 'Submission could not be completed. Please try again.', destinations: { supabase: 'succeeded', zapier: 'failed' } })
assert.equal(supabaseOnly.captures.supabaseBodies.length, 1)
assert.equal(supabaseOnly.captures.zapierBodies.length, 1)
const zapierOnly = await invoke(validRequest, { supabase: false, zapier: true })
assert.equal(zapierOnly.status, 502)
assert.deepEqual(zapierOnly.responseBody, { error: 'Submission could not be completed. Please try again.', destinations: { supabase: 'failed', zapier: 'skipped' } })
assert.equal(zapierOnly.captures.supabaseBodies.length, 1)
assert.equal(zapierOnly.captures.zapierBodies.length, 0)
const bothFail = await invoke(validRequest, { supabase: false, zapier: false })
assert.equal(bothFail.status, 502)
assert.deepEqual(bothFail.responseBody, { error: 'Submission could not be completed. Please try again.', destinations: { supabase: 'failed', zapier: 'skipped' } })
assert.equal(bothFail.captures.zapierBodies.length, 0)

const seenIds = new Set<string>()
const failedZapierAttempt = await invoke(validRequest, { supabase: true, zapier: false }, seenIds)
const successfulRetry = await invoke(validRequest, { supabase: true, zapier: true }, seenIds)
assert.equal(failedZapierAttempt.status, 502)
assert.equal(successfulRetry.status, 200)
assert.equal(seenIds.size, 1)

const invalidId = await invoke({ ...validRequest, submissionId: 'not-a-uuid' }, { supabase: true, zapier: true })
assert.equal(invalidId.status, 400); assert.equal(invalidId.fetchCount, 0)
const invalidConfiguration = await invoke({ ...validRequest, doorConfiguration: [] }, { supabase: true, zapier: true })
assert.equal(invalidConfiguration.status, 400); assert.equal(invalidConfiguration.fetchCount, 0)
const oversizedConfiguration = await invoke({ ...validRequest, doorConfiguration: { value: 'x'.repeat(129 * 1024) } }, { supabase: true, zapier: true })
assert.equal(oversizedConfiguration.status, 413); assert.equal(oversizedConfiguration.fetchCount, 0)

console.info('Verified flattened Zapier compatibility, Supabase-first sequencing/idempotency, destination failure behavior, and API validation.')
