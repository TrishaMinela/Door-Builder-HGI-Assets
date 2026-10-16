import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'esbuild'
import { createServer, loadConfigFromFile } from 'vite'
import { chromium, type Page, type Response } from 'playwright-core'
import { devCredentials } from './importInventoryCatalog'
import { doorStyles, hardwareOptions } from '../src/data/options'

const saved = { legacy: process.env.VITE_INVENTORY_SHADOW, published: process.env.VITE_PUBLISHED_CATALOG_SHADOW }
const restore = (name: string, value: string | undefined) => { if (value === undefined) delete process.env[name]; else process.env[name] = value }
let server: Awaited<ReturnType<typeof createServer>> | undefined
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const bundled = await build({ entryPoints: ['api/catalog.ts'], platform: 'node', format: 'esm', bundle: true, packages: 'external', metafile: true, write: false })
  assert.deepEqual(Object.keys(bundled.metafile!.inputs).sort(), ['api/catalog.ts', 'server/publishedDoorCatalog.ts'])
  const configBundle = await build({ entryPoints: ['vite.config.ts'], platform: 'node', format: 'esm', bundle: true, packages: 'external', metafile: true, write: false })
  assert.deepEqual(Object.keys(configBundle.metafile!.inputs), ['vite.config.ts'], 'No DEV modules bundled by config loading')
  process.env.VITE_INVENTORY_SHADOW = 'false'
  process.env.VITE_PUBLISHED_CATALOG_SHADOW = 'true'
  const production = await loadConfigFromFile({ command: 'build', mode: 'production' })
  assert.ok(production); assert.equal(production.config.plugins?.length, 0)
  assert.match(JSON.stringify(production.config.resolve?.alias), /published-catalog\/disabled\.ts/)
  process.env.VITE_PUBLISHED_CATALOG_SHADOW = 'false'
  server = await createServer({ cacheDir: await mkdtemp(join(tmpdir(), 'published-shadow-off-')), optimizeDeps: { noDiscovery: true }, server: { host: '127.0.0.1', port: 5208, strictPort: true } })
  await server.listen()
  // GET may receive Vite's ordinary SPA index fallback when no middleware is
  // registered. POST proves the endpoint is absent rather than a JSON reader.
  assert.equal((await fetch('http://127.0.0.1:5208/api/catalog', { method: 'POST' })).status, 404)
  assert.equal((await fetch('http://127.0.0.1:5208/__dev/published-catalog-shadow/compare', { method: 'POST' })).status, 404)
  assert.doesNotMatch((await fetch('http://127.0.0.1:5208/api/catalog')).headers.get('content-type') ?? '', /application\/json/)
  await server.close(); server = undefined

  process.env.VITE_PUBLISHED_CATALOG_SHADOW = 'true'
  server = await createServer({ cacheDir: await mkdtemp(join(tmpdir(), 'published-shadow-on-')), optimizeDeps: { entries: ['index.html'], include: ['react/jsx-dev-runtime'] }, server: { host: '127.0.0.1', port: 5208, strictPort: true } })
  await server.listen()
  const endpoint = await fetch('http://127.0.0.1:5208/api/catalog')
  assert.equal(endpoint.status, 200)
  const payload = await endpoint.json()
  assert.equal(payload.revision.id, '1af5506c-c723-5d6d-a341-93815d0205e2')
  assert.equal(payload.styles.length, 42); assert.equal(payload.variants.length, 127)
  assert.equal((await fetch('http://127.0.0.1:5208/api/catalog?revision=draft')).status, 400)
  const credentials = devCredentials()
  assert.ok(!JSON.stringify(payload).includes(credentials.key))
  for (const name of readdirSync('dist/assets').filter(name => /\.(js|css)$/.test(name))) {
    const text = readFileSync(`dist/assets/${name}`, 'utf8')
    assert.ok(!text.includes(credentials.key), 'Server secret not in production browser output')
    assert.ok(!text.includes('/__dev/published-catalog-shadow/compare'), 'Opt-in hook is removed from production')
  }
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const outcomes = []
  for (const [width, outage] of [[1280, false], [390, true]] as const) {
    const page: Page = await browser.newPage({ viewport: { width, height: 900 } })
    const remoteProductRequests: string[] = [], errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => { if (request.url().includes('.supabase.co/storage/')) remoteProductRequests.push(request.url()) })
    const savedDraft = { version: 1, configuration: { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(style => style.code === 'F1')!.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'none', selectedFinishType: 'paint', selectedPaint: 'paint-black', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-black', doorSwingId: 'LHI', hardwareId: hardwareOptions[0].id } }
    await page.addInitScript(value => {
      (window as unknown as { __name: (fn: unknown) => unknown }).__name = fn => fn
      if (value) localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value))
    }, outage ? savedDraft : null)
    if (outage) await page.route('**/__dev/published-catalog-shadow/compare', route => route.fulfill({ status: 503, body: '{}' }))
    const reportRequest: Promise<Response> = page.waitForResponse(response => response.url().includes('/__dev/published-catalog-shadow/compare'), { timeout: 30000 })
    await page.goto('http://127.0.0.1:5208/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    await page.getByRole('heading', { name: 'Choose Your Door Configuration', exact: true }).waitFor()
    await page.getByRole('button', { name: /Entry configuration Single Door/ }).click()
    const before: string | null = await page.evaluate(() => localStorage.getItem('hgi-door-builder-draft'))
    const reportResponse: Response = await reportRequest
    if (!outage) { const report = await reportResponse.json(); assert.equal(report.status, 'ok'); assert.equal(report.mismatches, 0) }
    else assert.equal(reportResponse.status(), 503)
    assert.equal(await page.evaluate(() => localStorage.getItem('hgi-door-builder-draft')), before, 'Diagnostics do not alter saved selections')
    if (outage) {
      const selected = JSON.parse(before!).configuration
      assert.equal(selected.styleId, savedDraft.configuration.styleId)
      assert.equal(selected.selectedPaint, 'paint-black')
      assert.equal(selected.hardwareId, savedDraft.configuration.hardwareId)
    }
    assert.equal(await page.getByRole('alert').count(), 0, 'No customer-facing catalog outage error')
    await page.getByRole('button', { name: 'Next configuration step', exact: true }).click()
    const nextHeading = await page.getByRole('heading', { level: 1 }).innerText()
    assert.ok(nextHeading && nextHeading !== 'Choose Your Door Configuration', 'Existing next-step flow continues')
    assert.deepEqual(remoteProductRequests, [], 'Visible images remain local')
    assert.deepEqual(errors, [])
    outcomes.push({ width, outage, navigationWorks: true, selectionsUnchanged: true, hostedProductRequests: 0 })
    await page.close()
  }
  console.log(JSON.stringify({ apiModules: Object.keys(bundled.metafile!.inputs), productionFlagIgnored: true, disabledEndpointsAbsent: true, livePublishedApi: true, noBrowserCredentials: true, outcomes }, null, 2))
} finally {
  await browser?.close(); await server?.close()
  restore('VITE_INVENTORY_SHADOW', saved.legacy); restore('VITE_PUBLISHED_CATALOG_SHADOW', saved.published)
}
