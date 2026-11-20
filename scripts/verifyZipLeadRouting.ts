import assert from 'node:assert/strict'
import submitDoorBuilder from '../api/submit-door-builder'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import { normalizeUsZip, postalCodeForSubmission } from '../src/utils/usZip'
import type { DoorConfiguration } from '../src/types'

const cases: Array<[string, string | null]> = [
  ['01234', '01234'],
  [' 01234 ', '01234'],
  ['01234-6789', '01234'],
  [' 44101-1234 ', '44101'],
  ['46741', '46741'],
]
for (const [input, expected] of cases) assert.equal(normalizeUsZip(input), expected)
for (const invalid of ['', '   ', '1234', '123456', '12345-678', '12345-67890', 'ABCDE', '12345 6789', 'K1A 0B1', '01234-678']) {
  assert.equal(normalizeUsZip(invalid), null)
}
assert.equal(normalizeUsZip('01234'), '01234')
assert.notEqual(normalizeUsZip('01234'), String(Number('01234')))
assert.equal(postalCodeForSubmission(' 01234-6789 ', null), '01234')
assert.equal(postalCodeForSubmission(' 01234-6789 ', 'uhr'), '01234-6789')
assert.equal(postalCodeForSubmission('01234', 'americas-best-windows-and-doors'), '01234')

const configuration = {
  doorConfigurationType: 'single',
  product: { doorTypeLabel: 'Door Line', doorType: '22 Gauge Steel', doorTypes: ['22 Gauge Steel'], matchingVariants: [], styleCodes: ['F'] },
  doorLine: '22 Gauge Steel',
  style: { id: 'f-full-lite', code: 'F', name: 'Full Lite', description: '', eyebrow: '', image: '', hasGlass: true, allowedGrains: [], allowsColors: true, variants: [], panel: 'modern' },
  grain: null,
  finish: { id: 'paint-white', name: 'White', description: '', image: '', color: '#ffffff', accent: '#eeeeee', category: 'paint', finishType: 'paint', proMatch: true },
  doorFinishType: 'paint', doorFinishColor: 'White', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'White',
  glass: null, mainDoorGlass: null, grid: null,
  hardware: { id: 'test', manufacturer: 'Schlage', style: 'Century Handleset', finish: 'Matte Black', handing: 'Left', view: 'Exterior', asset: '', color: '#000000', type: 'long' },
  doorSwing: { id: 'LHI', name: 'Left Hand Inswing', image: '' },
  sidelites: 'none', sidelitePlacement: 'none',
} as DoorConfiguration

const submittedAt = '2026-11-17T16:00:00.000Z'
const submissionId = 'c1950cf7-6273-4a5c-a0c8-4a531831d906'
const snapshot = { schemaVersion: 1 as const, configuration }
const contact = { fullName: 'Jane Marie Smith', email: 'jane@example.invalid', phone: '5550100000', zip: '01234', notes: 'Call after 5.' }

process.env.NODE_ENV = 'production'
process.env.VERCEL_ENV = 'production'
process.env.SUPABASE_URL = 'https://dealer-portal.supabase.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
const masterWebhook = 'https://hooks.zapier.com/hooks/catch/test/master/'
const abWebhook = 'https://hooks.zapier.com/hooks/catch/test/ab/'
const wdmWebhook = 'https://hooks.zapier.com/hooks/catch/test/wdm/'
process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL = masterWebhook
process.env.ZAPIER_AB_DOOR_BUILDER_WEBHOOK_URL = abWebhook
process.env.ZAPIER_WDM_DOOR_BUILDER_WEBHOOK_URL = wdmWebhook

const dealers = new Map([
  ['uhr', { id: '44444444-4444-4444-8444-444444444444', company_name: 'Uhr Doors', slug: 'uhr' }],
  ['americas-best-windows-and-doors', { id: '11111111-1111-4111-8111-111111111111', company_name: "America's Best Windows and Doors", slug: 'americas-best-windows-and-doors' }],
  ['wdm', { id: '22222222-2222-4222-8222-222222222222', company_name: 'Windows Doors & More', slug: 'wdm' }],
])

const allowedHosts = new Set(['dealer-portal.supabase.invalid', 'hooks.zapier.com'])
const leadColumns = ['comments', 'dealer_id', 'door_configuration', 'email', 'first_name', 'last_name', 'phone', 'source', 'status', 'submission_id', 'zip']

type Capture = { urls: string[]; supabaseBodies: Record<string, unknown>[]; zapierRaw: string[]; zapierUrls: string[] }

function flatFor(zip: string) {
  return buildDoorBuilderSubmissionPayload({ contact: { ...contact, zip }, configuration, submittedAt })
}

function zapierBytes(flat: ReturnType<typeof flatFor>, attribution: { lead_source: string; dealer_name: string; dealer_slug: string }) {
  return JSON.stringify({ ...flat, ...attribution })
}

async function invoke(body: Record<string, unknown>) {
  const capture: Capture = { urls: [], supabaseBodies: [], zapierRaw: [], zapierUrls: [] }
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input))
    assert.equal(allowedHosts.has(url.hostname), true, url.hostname)
    assert.equal(/opta|personify|resend|sendgrid|mail|notify/i.test(url.href), false)
    capture.urls.push(url.href)
    if (url.pathname.endsWith('/dealers')) {
      const slug = url.searchParams.get('slug')?.replace(/^eq\./, '') ?? ''
      const dealer = dealers.get(slug)
      return Response.json(dealer ? [{ ...dealer, is_active: true }] : [])
    }
    const raw = String(options?.body ?? '')
    if (url.pathname.endsWith('/leads')) {
      capture.supabaseBodies.push(JSON.parse(raw) as Record<string, unknown>)
      return new Response(null, { status: 201 })
    }
    capture.zapierRaw.push(raw)
    capture.zapierUrls.push(url.href)
    return new Response(null, { status: 200 })
  }
  let status = 0
  let result: unknown
  await submitDoorBuilder(
    { method: 'POST', body },
    { setHeader() {}, status(value) { status = value; return this }, json(value) { result = value } },
  )
  return { status, result, capture }
}

const hgi = { lead_source: 'HGI', dealer_name: 'Home Guard Industries', dealer_slug: '' }
const fiveDigit = flatFor('01234')
const mainRequest = { ...fiveDigit, submissionId, doorConfiguration: snapshot }
const main = await invoke(mainRequest)
assert.equal(main.status, 200)
assert.deepEqual(main.capture.urls, [`${process.env.SUPABASE_URL}/rest/v1/leads?on_conflict=submission_id`, masterWebhook])
assert.equal(main.capture.zapierRaw[0], zapierBytes(fiveDigit, hgi))
assert.equal(main.capture.zapierRaw[0].includes('"postal_code":"01234"'), true)
assert.equal(main.capture.zapierRaw[0].includes('"postal_code":1234'), false)
const mainRow = main.capture.supabaseBodies[0]
assert.deepEqual(Object.keys(mainRow).sort(), [...leadColumns].sort())
assert.equal(mainRow.zip, '01234')
assert.equal(mainRow.dealer_id, null)
assert.equal(mainRow.source, 'door_builder')
assert.equal(mainRow.status, 'new')
assert.deepEqual(mainRow.door_configuration, snapshot)
assert.equal(JSON.stringify(main.result).includes('notif'), false)

const plusFourFlat = flatFor('01234-6789')
const plusFour = await invoke({ ...plusFourFlat, submissionId, doorConfiguration: snapshot, postal_code: ' 01234-6789 ' })
assert.equal(plusFour.status, 200)
const normalizedFlat = { ...plusFourFlat, postal_code: '01234' }
assert.equal(plusFour.capture.zapierRaw[0], zapierBytes(normalizedFlat, hgi))
const legacyPlusFour = zapierBytes(plusFourFlat, hgi)
assert.equal(plusFour.capture.zapierRaw[0].replace('"postal_code":"01234"', '"postal_code":"01234-6789"'), legacyPlusFour)
assert.equal(plusFour.capture.supabaseBodies[0].zip, '01234')
assert.deepEqual(plusFour.capture.supabaseBodies[0].door_configuration, snapshot)

for (const postalCode of ['1234', 'ABCDE', '12345-678', '123456', 'K1A 0B1']) {
  const rejected = await invoke({ ...mainRequest, postal_code: postalCode, submissionId: 'd1950cf7-6273-4a5c-a0c8-4a531831d906' })
  assert.equal(rejected.status, 400)
  assert.deepEqual(rejected.capture.urls, [])
  assert.deepEqual(rejected.capture.zapierRaw, [])
}

const uhrFlat = flatFor('01234-6789')
const uhr = await invoke({ ...uhrFlat, submissionId, doorConfiguration: snapshot, dealerSlug: 'uhr' })
assert.equal(uhr.status, 200)
assert.deepEqual(uhr.capture.zapierUrls, [masterWebhook])
assert.equal(uhr.capture.zapierRaw[0], zapierBytes(uhrFlat, { lead_source: 'uhr-door-builder-lead', dealer_name: 'Uhr Doors', dealer_slug: 'uhr' }))
assert.equal(uhr.capture.zapierRaw[0].includes('"postal_code":"01234-6789"'), true)
assert.equal(uhr.capture.zapierRaw[0].includes('"lead_source":"HGI"'), false)
assert.equal(uhr.capture.supabaseBodies[0].zip, '01234-6789')
assert.equal(uhr.capture.supabaseBodies[0].dealer_id, '44444444-4444-4444-8444-444444444444')
assert.deepEqual(uhr.capture.supabaseBodies[0].door_configuration, snapshot)
assert.deepEqual(Object.keys(uhr.capture.supabaseBodies[0]).sort(), [...leadColumns].sort())

const abFlat = flatFor('44101-1234')
const ab = await invoke({ ...abFlat, submissionId, doorConfiguration: snapshot, dealerSlug: 'americas-best-windows-and-doors' })
assert.equal(ab.status, 200)
assert.deepEqual(ab.capture.zapierUrls, [masterWebhook, abWebhook])
const abBytes = zapierBytes(abFlat, { lead_source: 'AB', dealer_name: "America's Best Windows and Doors", dealer_slug: 'americas-best-windows-and-doors' })
assert.equal(ab.capture.zapierRaw[0], abBytes)
assert.equal(ab.capture.zapierRaw[1], abBytes)
assert.equal(ab.capture.supabaseBodies[0].zip, '44101-1234')

const wdmFlat = flatFor('46741')
const wdm = await invoke({ ...wdmFlat, submissionId, doorConfiguration: snapshot, dealerSlug: 'wdm' })
assert.equal(wdm.status, 200)
assert.deepEqual(wdm.capture.zapierUrls, [masterWebhook, wdmWebhook])
assert.equal(wdm.capture.zapierRaw[0], zapierBytes(wdmFlat, { lead_source: 'WDM', dealer_name: 'Windows Doors & More', dealer_slug: 'wdm' }))
assert.equal(wdm.capture.zapierRaw[0], wdm.capture.zapierRaw[1])

const unchangedDealer = flatFor('01234')
const uhrFive = await invoke({ ...unchangedDealer, submissionId, doorConfiguration: snapshot, dealerSlug: 'uhr' })
assert.equal(uhrFive.capture.zapierRaw[0], zapierBytes(unchangedDealer, { lead_source: 'uhr-door-builder-lead', dealer_name: 'Uhr Doors', dealer_slug: 'uhr' }))

console.log('PASS ZIP normalization, main-HGI validation, unchanged dealer-slug payloads, and no notification calls')
