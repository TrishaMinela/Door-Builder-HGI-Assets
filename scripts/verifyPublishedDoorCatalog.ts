import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createCatalogHandler } from '../api/catalog'
import { readPublishedDoorCatalog, PUBLISHED_CATALOG_DEV_ORIGIN } from '../server/publishedDoorCatalog'
import { comparePublishedDoorCatalog } from '../server/publishedDoorShadow'
import { devCredentials } from './importInventoryCatalog'

const revisionId = '11111111-1111-5111-a111-111111111111'
const environment = { SUPABASE_URL: PUBLISHED_CATALOG_DEV_ORIGIN, SUPABASE_SERVICE_ROLE_KEY: 'unit-test-server-only-secret', PUBLISHED_CATALOG_READ_ENABLED: 'true' }
const fact = (id: string) => ({ id, catalog_revision_id: revisionId, legacy_id: id, display_name: id, status: 'active', customer_selectable: true, display_order: 0, notes: 'ADMIN ONLY', source: 'ADMIN ONLY', audit: 'ADMIN ONLY' })
const fixture: Record<string, Record<string, unknown>[]> = {
  catalog_revisions: [{ id: revisionId, status: 'published', published_at: '2026-10-16T00:00:00Z', published_by: 'PRIVATE', notes: 'ADMIN ONLY' }],
  materials: [fact('steel')], series: [{ ...fact('series'), material_id: 'steel' }], grains: [],
  door_lines: [{ ...fact('line'), material_id: 'steel', series_id: 'series' }], door_line_groups: [fact('group')],
  door_line_group_members: [{ ...fact('member'), door_line_group_id: 'group', door_line_id: 'line' }],
  door_styles: [{ ...fact('style'), product_code: 'VERIFIED', description: 'Verified description' }],
  door_variants: [{ ...fact('variant'), door_style_id: 'style', door_line_id: 'line', grain_id: null, product_code: 'VERIFIED', opening_code: 'VERIFIED', supports_glass: true }],
  door_variant_assets: [{ ...fact('binding'), door_variant_id: 'variant', asset_id: 'asset', role: 'thumbnail', view_key: '' }],
  assets: [{ ...fact('asset'), current_path: '/assets/doors/F1.webp', checksum: null, byte_size: 100, mime_type: 'image/webp', storage_bucket: null, storage_object_path: null }],
}
function mock(data = fixture, alter?: (table: string, rows: Record<string, unknown>[], call: number) => Record<string, unknown>[]) {
  let publicationCalls = 0
  const calls: string[] = []
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(init?.method, 'GET'); assert.equal(init?.redirect, 'error')
    const url = new URL(String(input)), table = url.pathname.split('/').pop()!
    assert.equal(url.origin, PUBLISHED_CATALOG_DEV_ORIGIN)
    calls.push(table)
    const select = url.searchParams.get('select')!
    assert.ok(select && !select.includes('*') && !/notes|audit|published_by|source|provenance/.test(select), 'Explicit customer-safe query fields')
    if (table === 'catalog_revisions') {
      if (url.searchParams.get('status') === 'in.(published,retired)') return Response.json([])
      assert.equal(url.searchParams.get('status'), 'eq.published'); publicationCalls++
    }
    else assert.equal(url.searchParams.get('catalog_revision_id'), `eq.${data.catalog_revisions[0].id}`)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    let rows = structuredClone((data[table] ?? []).slice(offset, offset + 500))
    rows = alter ? alter(table, rows, publicationCalls) : rows
    return Response.json(rows)
  }
  return { fetcher, calls }
}
async function request(options: Parameters<typeof createCatalogHandler>[0], method = 'GET', url = '/api/catalog') {
  let status = 0, body: unknown
  const headers: Record<string, string> = {}
  const response = { status(value: number) { status = value; return response }, json(value: unknown) { body = value }, setHeader(key: string, value: string) { headers[key] = value } }
  await createCatalogHandler(options)({ method, url }, response)
  return { status, body, headers }
}
const normal = mock(), options = { env: environment, fetcher: normal.fetcher }
const good = await request(options)
assert.equal(good.status, 200)
assert.equal(good.headers['Cache-Control'], 'no-store')
assert.ok(!/ADMIN ONLY|PRIVATE|unit-test-server-only-secret|notes|published_by/.test(JSON.stringify(good.body)))
assert.equal((await request(options, 'POST')).status, 405)
assert.equal((await request(options, 'GET', '/api/catalog?revision=draft')).status, 400)
let disabledReads = 0
assert.equal((await request({ env: {}, fetcher: async () => { disabledReads++; throw Error('No read allowed') } })).status, 404)
assert.equal(disabledReads, 0)
await assert.rejects(readPublishedDoorCatalog({ env: { ...environment, SUPABASE_URL: 'https://production.example' }, fetcher: normal.fetcher }), /DEV target/)
for (const alter of [
  (table: string, rows: Record<string, unknown>[]) => table === 'catalog_revisions' ? [] : rows,
  (table: string, rows: Record<string, unknown>[]) => table === 'catalog_revisions' ? [...rows, ...rows] : rows,
  (table: string, rows: Record<string, unknown>[]) => table === 'catalog_revisions' ? rows.map(row => ({ ...row, status: 'draft' })) : rows,
  (table: string, rows: Record<string, unknown>[], call: number) => table === 'catalog_revisions' && call > 1 ? rows.map(row => ({ ...row, id: '22222222-2222-5222-a222-222222222222' })) : rows,
  (table: string, rows: Record<string, unknown>[]) => table === 'door_styles' ? rows.map(row => ({ ...row, catalog_revision_id: 'foreign' })) : rows,
  (table: string, rows: Record<string, unknown>[]) => table === 'door_variants' ? rows.map(row => ({ ...row, door_style_id: 'missing' })) : rows,
]) assert.equal((await request({ env: environment, fetcher: mock(fixture, alter).fetcher })).status, 503)
const next = structuredClone(fixture), nextId = '22222222-2222-5222-a222-222222222222'
for (const rows of Object.values(next)) for (const row of rows) if (row.catalog_revision_id) row.catalog_revision_id = nextId
next.catalog_revisions[0].id = nextId
assert.equal((await readPublishedDoorCatalog({ env: environment, fetcher: mock(next).fetcher })).revision.id, nextId, 'Publication is discovered, never pinned to a baseline UUID')
const unsafe = await request({ env: environment, fetcher: async () => { throw Error(`private ${environment.SUPABASE_SERVICE_ROLE_KEY}`) } })
assert.equal(unsafe.status, 503); assert.ok(!JSON.stringify(unsafe).includes(environment.SUPABASE_SERVICE_ROLE_KEY))
await assert.rejects(readPublishedDoorCatalog({ env: environment, timeoutMs: 10, fetcher: async (_input, init) => new Promise((_done, reject) => init!.signal!.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')))) }), /Timeout/)
const storageFixture = structuredClone(fixture)
storageFixture.assets[0].storage_bucket = 'door-catalog-assets'
storageFixture.assets[0].storage_object_path = `revisions/${revisionId}/styles/verified.webp`
assert.equal((await readPublishedDoorCatalog({ env: environment, fetcher: mock(storageFixture).fetcher })).assets[0].storage?.access, 'authenticated')
storageFixture.assets[0].storage_object_path = 'revisions/33333333-3333-5333-a333-333333333333/styles/draft.webp'
assert.equal((await request({ env: environment, fetcher: mock(storageFixture).fetcher })).status, 503, 'Unpublished object scope cannot leak via a bad published binding')
storageFixture.assets[0].storage_object_path = `revisions/${revisionId}/../private.webp`
assert.equal((await request({ env: environment, fetcher: mock(storageFixture).fetcher })).status, 503, 'Storage traversal refused')
console.log('PASS: published-only discovery, changed publication, draft/cross-revision refusal, allowlisted GETs, safe DTO, API opt-in, sanitized failures and timeout.')

if (process.argv.includes('--live')) {
  const credentials = devCredentials()
  const env = { SUPABASE_URL: credentials.origin, SUPABASE_SERVICE_ROLE_KEY: credentials.key, PUBLISHED_CATALOG_READ_ENABLED: 'true' }
  const endpoint = await request({ env, timeoutMs: 30000 })
  assert.equal(endpoint.status, 200)
  const catalog = endpoint.body as Awaited<ReturnType<typeof readPublishedDoorCatalog>>
  assert.equal(catalog.revision.id, '1af5506c-c723-5d6d-a341-93815d0205e2')
  assert.ok(!JSON.stringify(catalog).includes('af9dd06f-019e-4a31-b44c-248c862ba7d3'))
  assert.ok(!JSON.stringify(catalog).includes(credentials.key))
  const result = comparePublishedDoorCatalog(catalog)
  assert.equal(result.counts.styles, 42); assert.equal(result.counts.variants, 127)
  assert.equal(result.counts.storageAssets, 159)
  console.log(JSON.stringify({ ...result, reports: result.reports.filter(report => !report.matches) }, null, 2))
  assert.equal(result.mismatches, 0)
  const changed = structuredClone(catalog); changed.styles[0].name += ' injected'
  assert.ok(comparePublishedDoorCatalog(changed).mismatches > 0)
  const hidden = structuredClone(catalog); hidden.variants[0].customerSelectable = false
  assert.ok(comparePublishedDoorCatalog(hidden).mismatches > 0)
  let storageMatches = 0, localMatches = 0
  const assetFailures: { path: string; reason: string }[] = []
  const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
  for (let index = 0; index < catalog.assets.length; index += 6) await Promise.all(catalog.assets.slice(index, index + 6).map(async asset => {
    assert.ok(asset.storage)
    const response = await fetch(asset.storage.url, { method: 'GET', redirect: 'error', headers: { apikey: credentials.key, Authorization: `Bearer ${credentials.key}` }, signal: AbortSignal.timeout(30000) })
    if (!response.ok) { assetFailures.push({ path: asset.localPath, reason: `Storage HTTP ${response.status}` }); return }
    const bytes = Buffer.from(await response.arrayBuffer())
    if (digest(bytes) === asset.checksum && bytes.length === asset.byteSize) storageMatches++
    else assetFailures.push({ path: asset.localPath, reason: 'Storage checksum/size mismatch' })
    const local = readFileSync(`public${decodeURIComponent(asset.localPath.split('?')[0])}`)
    if (digest(local) === digest(bytes)) localMatches++
    else assetFailures.push({ path: asset.localPath, reason: 'Local/Storage bytes differ' })
  }))
  console.log(JSON.stringify({ storageObjectsVerified: storageMatches, localByteMatches: localMatches, failures: assetFailures }, null, 2))
  assert.equal(storageMatches, 159); assert.equal(localMatches, 159); assert.equal(assetFailures.length, 0)
}
