import assert from 'node:assert/strict'
import { createCipheriv, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import submitDoorBuilder from '../api/submit-door-builder'

process.env.NODE_ENV = 'production'
process.env.VERCEL_ENV = 'production'
process.env.SUPABASE_URL = 'https://dealer-portal.supabase.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.DOOR_BUILDER_WEBHOOK_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')

const master = 'https://hooks.zapier.com/hooks/catch/100/masterkey/'
const abEnv = 'https://hooks.zapier.com/hooks/catch/200/abenvkey/'
const wdmEnv = 'https://hooks.zapier.com/hooks/catch/300/wdmenvkey/'
const uhrEnv = 'https://hooks.zapier.com/hooks/catch/400/uhrenvkey/'
const abDb = 'https://hooks.zapier.com/hooks/catch/201/abdbkey1/'
const wdmDb = 'https://hooks.zapier.com/hooks/catch/301/wdmdbkey1/'
const diligentHook = 'https://hooks.zapier.com/hooks/catch/123456/abcdefgh/'
const futureHook = 'https://hooks.zapier.com/hooks/catch/500/futurekey/'
const dealerBHook = 'https://hooks.zapier.com/hooks/catch/600/dealerbkey/'
process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL = master
process.env.ZAPIER_AB_DOOR_BUILDER_WEBHOOK_URL = abEnv
process.env.ZAPIER_WDM_DOOR_BUILDER_WEBHOOK_URL = wdmEnv
process.env.ZAPIER_UHR_DOOR_BUILDER_WEBHOOK_URL = uhrEnv

const dealers = new Map([
  ['americas-best-windows-and-doors', { id: '11111111-1111-4111-8111-111111111111', company_name: "America's Best Windows and Doors" }],
  ['wdm', { id: '22222222-2222-4222-8222-222222222222', company_name: 'Windows Doors & More' }],
  ['future-dealer', { id: '33333333-3333-4333-8333-333333333333', company_name: 'Future Dealer' }],
  ['uhr', { id: '44444444-4444-4444-8444-444444444444', company_name: 'Unified Home Remodeling' }],
  ['diligent', { id: '55555555-5555-4555-8555-555555555555', company_name: 'Diligent' }],
  ['dealer-b', { id: '66666666-6666-4666-8666-666666666666', company_name: 'Dealer B' }],
])

const portalVector = {
  webhook_ciphertext: 'XtzUZjhAMS0RFTEwyW3dZJlIkJyOursYQLHsws2fIcjYwg8M+JTIb6bnJG7+4YQkU0d767iwDkMZHgHCXE/sDZGEU1eN2w==',
  webhook_iv: 'AwMDAwMDAwMDAwMD',
  webhook_auth_tag: 'sWTGKW3FTvFTR7aq3XxeUg==',
  credential_key_version: 1,
}

function seal(url: string) {
  const iv = Buffer.from('AwMDAwMDAwMDAwMD', 'base64')
  const cipher = createCipheriv('aes-256-gcm', Buffer.alloc(32, 7), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ webhookUrl: url }), 'utf8'), cipher.final()])
  return {
    webhook_ciphertext: ciphertext.toString('base64'),
    webhook_iv: iv.toString('base64'),
    webhook_auth_tag: cipher.getAuthTag().toString('base64'),
    credential_key_version: 1,
  }
}

const stored = new Map<string, Record<string, unknown>>()
const claims = new Set<string>()
const httpStatus = new Map<string, number>()
let missingTable = false
let requests: Array<{ url: string; method: string; body: Record<string, unknown> | null }> = []
let supabaseWrites = 0

function resetCalls() {
  requests = []
  supabaseWrites = 0
}

globalThis.fetch = async (input, options) => {
  const url = new URL(String(input))
  const method = options?.method ?? 'GET'
  if (url.pathname.endsWith('/dealers')) {
    const slug = url.searchParams.get('slug')?.replace(/^eq\./, '') ?? ''
    const dealer = dealers.get(slug)
    return Response.json(dealer ? [{ ...dealer, slug, is_active: true }] : [])
  }
  if (url.pathname.endsWith('/dealer_door_builder_webhooks')) {
    if (missingTable) return new Response(JSON.stringify({ code: 'PGRST205', message: 'schema cache' }), { status: 404 })
    if (method === 'PATCH') return new Response(null, { status: 204 })
    const dealerId = url.searchParams.get('dealer_id')?.replace(/^eq\./, '') ?? ''
    const row = stored.get(dealerId)
    return Response.json(row ? [row] : [])
  }
  if (url.pathname.endsWith('/dealer_door_builder_webhook_deliveries')) {
    const body = options?.body ? JSON.parse(String(options.body)) as Record<string, unknown> : null
    if (method === 'POST' && body) {
      const key = `${String(body.dealer_id)}:${String(body.submission_id)}`
      if (claims.has(key)) return new Response(null, { status: 409 })
      claims.add(key)
      return new Response(null, { status: 201 })
    }
    return new Response(null, { status: 204 })
  }
  if (url.pathname.endsWith('/leads')) {
    supabaseWrites += 1
    return new Response(null, { status: 201 })
  }
  const body = options?.body ? JSON.parse(String(options.body)) as Record<string, unknown> : null
  requests.push({ url: url.href, method, body })
  return new Response(null, { status: httpStatus.get(url.href) ?? 200, headers: httpStatus.get(url.href) === 302 ? { Location: 'https://evil.example/collect' } : undefined })
}

const base = {
  full_name: 'Routing Test', email: 'routing@example.invalid', phone: '5550100000', postal_code: '46741',
  doorConfiguration: { schemaVersion: 1, configuration: { finish: { id: 'paint-white', finishType: 'paint' } } },
}
const submissionFields = [
  'submitted_at', 'first_name', 'last_name', 'full_name', 'email', 'phone', 'postal_code', 'notes',
  'door_configuration', 'door_line', 'door_style', 'sidelite_placement', 'sidelite_slab', 'sidelite_glass',
  'main_door_glass', 'door_finish_type', 'door_finish_color', 'jamb_type', 'jamb_finish_type',
  'jamb_finish_color', 'hardware', 'lock_setup', 'door_swing', 'hinge_option',
  'lead_source', 'dealer_name', 'dealer_slug',
  'working_with_dealer', 'working_dealer_name',
]

async function invoke(body: Record<string, unknown> = {}) {
  resetCalls()
  let status = 0
  let result: { ok?: boolean; destinations?: Record<string, string>; error?: string } | undefined
  await submitDoorBuilder(
    { method: 'POST', body: { ...base, submissionId: randomUUID(), ...body } },
    { setHeader() {}, status(value) { status = value; return this }, json(value) { result = value as typeof result } },
  )
  return { status, result, requests: [...requests], supabaseWrites }
}

function urls(result: Awaited<ReturnType<typeof invoke>>) {
  return result.requests.map((request) => request.url)
}

const root = await invoke()
assert.equal(root.status, 200)
assert.deepEqual(urls(root), [master])
assert.equal(root.requests[0].body?.lead_source, 'HGI')
assert.equal(root.requests[0].body?.test, undefined)

const homeownerDealer = await invoke({ notes: 'Call after 5.', working_with_dealer: 'yes', working_dealer_name: 'Lake Door Co' })
assert.equal(homeownerDealer.status, 200)
assert.equal(homeownerDealer.requests[0].body?.working_with_dealer, 'yes')
assert.equal(homeownerDealer.requests[0].body?.working_dealer_name, 'Lake Door Co')
assert.equal(homeownerDealer.requests[0].body?.dealer_name, 'Home Guard Industries')
assert.equal(homeownerDealer.requests[0].body?.notes, 'Call after 5.\nWorking with a dealer: Yes — Dealer: Lake Door Co')
assert.equal('customFields' in (homeownerDealer.requests[0].body ?? {}), false)
assert.equal('tags' in (homeownerDealer.requests[0].body ?? {}), false)

process.env.PERSONIFY_FIELD_WORKING_WITH_DEALER = 'contact.working_with_dealer'
process.env.PERSONIFY_FIELD_DEALER_NAME = 'personify-dealer-name-id'
const mappedDealer = await invoke({ working_with_dealer: 'Yes', working_dealer_name: 'Lake Door Co' })
assert.equal(mappedDealer.status, 200)
assert.deepEqual(mappedDealer.requests[0].body?.customFields, [
  { key: 'contact.working_with_dealer', field_value: 'Yes' },
  { id: 'personify-dealer-name-id', field_value: 'Lake Door Co' },
])
delete process.env.PERSONIFY_FIELD_WORKING_WITH_DEALER
delete process.env.PERSONIFY_FIELD_DEALER_NAME

const declinedDealer = await invoke({ notes: 'Call after 5.', working_with_dealer: 'no', working_dealer_name: 'Lake Door Co' })
assert.equal(declinedDealer.requests[0].body?.working_with_dealer, 'no')
assert.equal(declinedDealer.requests[0].body?.working_dealer_name, '')
assert.equal(declinedDealer.requests[0].body?.dealer_name, 'Home Guard Industries')
assert.equal(declinedDealer.requests[0].body?.notes, 'Call after 5.\nWorking with a dealer: No')
assert.equal('customFields' in (declinedDealer.requests[0].body ?? {}), false)

const ab = await invoke({ dealerSlug: 'americas-best-windows-and-doors' })
assert.deepEqual(urls(ab), [master, abEnv])
assert.ok(ab.requests.every((request) => request.body?.lead_source === 'AB' && request.body.dealer_slug === 'americas-best-windows-and-doors'))
assert.ok(ab.requests.every((request) => request.body?.working_with_dealer === 'yes' && request.body.working_dealer_name === "America's Best Windows and Doors"))

const wdm = await invoke({ dealerSlug: 'wdm' })
assert.deepEqual(urls(wdm), [master, wdmEnv])
assert.ok(wdm.requests.every((request) => request.body?.lead_source === 'WDM'))
assert.ok(wdm.requests.every((request) => request.body?.working_with_dealer === 'yes' && request.body.working_dealer_name === 'Windows Doors & More'))

const uhr = await invoke({ dealerSlug: 'uhr' })
assert.deepEqual(urls(uhr), [master, uhrEnv])
assert.equal(uhr.requests[0].body?.lead_source, 'uhr-door-builder-lead')
assert.ok(uhr.requests.every((request) => request.body?.working_with_dealer === 'yes' && request.body.working_dealer_name === 'Unified Home Remodeling'))

const staleUhr = await invoke({ dealerSlug: 'uhr', notes: 'Call after 5.\nWorking with a dealer: No', working_with_dealer: 'no', working_dealer_name: 'Lake Door Co' })
assert.equal(staleUhr.requests[0].body?.working_with_dealer, 'yes')
assert.equal(staleUhr.requests[0].body?.working_dealer_name, 'Unified Home Remodeling')
assert.equal(staleUhr.requests[0].body?.notes, 'Call after 5.\nWorking with a dealer: Yes — Dealer: Unified Home Remodeling')
const alreadyUhr = await invoke({ dealerSlug: 'uhr', notes: 'Call after 5.\nWorking with a dealer: Yes — Dealer: Unified Home Remodeling', working_with_dealer: 'yes', working_dealer_name: 'Unified Home Remodeling' })
assert.equal(alreadyUhr.requests[0].body?.working_with_dealer, 'yes')
assert.equal(alreadyUhr.requests[0].body?.working_dealer_name, 'Unified Home Remodeling')
assert.equal(alreadyUhr.requests[0].body?.notes, 'Call after 5.\nWorking with a dealer: Yes — Dealer: Unified Home Remodeling')
assert.equal(String(alreadyUhr.requests[0].body?.notes).split('Working with a dealer:').length, 2)

const noWebhook = await invoke({ dealerSlug: 'future-dealer' })
assert.deepEqual(urls(noWebhook), [master])
assert.equal(noWebhook.requests[0].body?.lead_source, 'future-dealer-door-builder-lead')

stored.set('11111111-1111-4111-8111-111111111111', { ...seal(abDb), id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', verified: true })
stored.set('22222222-2222-4222-8222-222222222222', { ...seal(wdmDb), id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', verified: true })
stored.set('55555555-5555-4555-8555-555555555555', { ...portalVector, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', verified: true })
stored.set('66666666-6666-4666-8666-666666666666', { ...seal(dealerBHook), id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', verified: true })

const abStored = await invoke({ dealerSlug: 'americas-best-windows-and-doors' })
assert.equal(abStored.status, 200)
assert.deepEqual(urls(abStored), [master, abDb])
assert.equal(abStored.result?.destinations?.zapier, 'succeeded')
assert.equal(abStored.result?.destinations?.dealerWebhook, 'succeeded')
assert.deepEqual(abStored.requests[0].body, abStored.requests[1].body)
assert.deepEqual(Object.keys(abStored.requests[0].body ?? {}).sort(), [...submissionFields].sort())
assert.equal(abStored.requests[1].body?.test, undefined)
assert.equal('personify' in (abStored.requests[1].body ?? {}), false)
assert.equal('spreadsheet' in (abStored.requests[1].body ?? {}), false)

const wdmStored = await invoke({ dealerSlug: 'wdm' })
assert.deepEqual(urls(wdmStored), [master, wdmDb])
assert.equal(wdmStored.requests[1].body?.lead_source, 'WDM')

const diligent = await invoke({ dealerSlug: 'diligent' })
assert.equal(diligent.status, 200)
assert.deepEqual(urls(diligent), [master, diligentHook])
assert.equal(diligent.requests[1].body?.lead_source, 'diligent-door-builder-lead')
assert.equal(diligent.requests[1].body?.dealer_slug, 'diligent')
assert.equal(diligent.supabaseWrites, 1)

stored.set('33333333-3333-4333-8333-333333333333', { ...seal(futureHook), id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', verified: true })
const future = await invoke({ dealerSlug: 'future-dealer' })
assert.deepEqual(urls(future), [master, futureHook])

const spoofed = await invoke({
  dealerSlug: 'dealer-b',
  dealer_id: '11111111-1111-4111-8111-111111111111',
  webhookUrl: 'https://hooks.zapier.com/hooks/catch/999/attacker1/',
})
assert.deepEqual(urls(spoofed), [master, dealerBHook])
assert.equal(urls(spoofed).includes(abDb), false)

const spoofedRoot = await invoke({
  dealer_id: '66666666-6666-4666-8666-666666666666',
  webhookUrl: dealerBHook,
})
assert.deepEqual(urls(spoofedRoot), [master])

const submissionId = randomUUID()
const first = await invoke({ dealerSlug: 'diligent', submissionId })
const second = await invoke({ dealerSlug: 'diligent', submissionId })
assert.equal(urls(first).filter((url) => url === diligentHook).length, 1)
assert.equal(urls(second).filter((url) => url === diligentHook).length, 0)
assert.equal(second.status, 200)
assert.equal(second.result?.destinations?.dealerWebhook, 'duplicate')
assert.equal(second.result?.destinations?.zapier, 'succeeded')
assert.deepEqual(urls(second), [master])

httpStatus.set(futureHook, 500)
const failedDealer = await invoke({ dealerSlug: 'future-dealer' })
assert.equal(failedDealer.status, 200)
assert.equal(failedDealer.supabaseWrites, 1)
assert.deepEqual(urls(failedDealer), [master, futureHook])
assert.equal(failedDealer.result?.destinations?.zapier, 'succeeded')
assert.equal(failedDealer.result?.destinations?.dealerWebhook, 'failed')
assert.equal(failedDealer.result?.ok, true)
httpStatus.delete(futureHook)

httpStatus.set(master, 500)
const failedMaster = await invoke({ dealerSlug: 'future-dealer' })
assert.equal(failedMaster.status, 502)
assert.equal(failedMaster.supabaseWrites, 1)
assert.deepEqual(urls(failedMaster), [master])
assert.equal(failedMaster.result?.destinations?.zapier, 'failed')
httpStatus.delete(master)

httpStatus.set(dealerBHook, 302)
const redirected = await invoke({ dealerSlug: 'dealer-b' })
assert.equal(redirected.status, 200)
assert.equal(urls(redirected).includes('https://evil.example/collect'), false)
assert.equal(redirected.result?.destinations?.dealerWebhook, 'failed')
assert.equal(urls(redirected).filter((url) => url === dealerBHook).length, 1)
httpStatus.delete(dealerBHook)

stored.set('33333333-3333-4333-8333-333333333333', { ...seal(master), id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', verified: true })
const sameAsMaster = await invoke({ dealerSlug: 'future-dealer' })
assert.deepEqual(urls(sameAsMaster), [master])
assert.equal(sameAsMaster.result?.destinations?.dealerWebhook, 'skipped')

stored.set('11111111-1111-4111-8111-111111111111', {
  webhook_ciphertext: 'not-ciphertext',
  webhook_iv: portalVector.webhook_iv,
  webhook_auth_tag: portalVector.webhook_auth_tag,
  credential_key_version: 1,
})
const unverified = await invoke({ dealerSlug: 'americas-best-windows-and-doors' })
assert.equal(unverified.status, 200)
assert.deepEqual(urls(unverified), [master, abEnv])
stored.set('11111111-1111-4111-8111-111111111111', {
  ...stored.get('11111111-1111-4111-8111-111111111111'),
  verified: true,
})
const unreadableVerified = await invoke({ dealerSlug: 'americas-best-windows-and-doors' })
assert.equal(unreadableVerified.status, 200)
assert.deepEqual(urls(unreadableVerified), [master])
assert.equal(unreadableVerified.result?.destinations?.dealerWebhook, 'failed')
assert.equal(urls(unreadableVerified).includes(abEnv), false)

missingTable = true
const duringOutage = await invoke({ dealerSlug: 'wdm' })
assert.deepEqual(urls(duringOutage), [master, wdmEnv])
missingTable = false

delete process.env.ZAPIER_AB_DOOR_BUILDER_WEBHOOK_URL
stored.delete('11111111-1111-4111-8111-111111111111')
const missingAbEnv = await invoke({ dealerSlug: 'americas-best-windows-and-doors' })
assert.equal(missingAbEnv.status, 502)
assert.equal(missingAbEnv.supabaseWrites, 0)
assert.deepEqual(urls(missingAbEnv), [])
process.env.ZAPIER_AB_DOOR_BUILDER_WEBHOOK_URL = abEnv

const dealerContext = readFileSync('api/dealer-context.ts', 'utf8')
const branding = readFileSync('src/types/dealerBranding.ts', 'utf8')
const resolution = readFileSync('server/dealerResolution.ts', 'utf8')
assert.doesNotMatch(dealerContext, /webhook/i)
assert.doesNotMatch(branding, /webhook/i)
assert.doesNotMatch(resolution, /dealer_door_builder_webhooks|webhook_ciphertext/)

console.log('PASS per-dealer webhook precedence, isolation, idempotency, and master preservation')
