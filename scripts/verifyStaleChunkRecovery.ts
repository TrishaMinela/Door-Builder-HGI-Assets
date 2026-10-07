import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { createStaleChunkRecovery, isStaleChunkError, STALE_CHUNK_MESSAGE, STALE_CHUNK_RECOVERY_KEY } from '../src/utils/staleChunkRecovery'
import { doorStyles, hardwareOptions } from '../src/data/options'

const values = new Map<string, string>()
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
let reloads = 0
const recovery = createStaleChunkRecovery({ storage, reload: () => { reloads++ } })
for (const message of ['Failed to fetch dynamically imported module: /assets/pdf-old.js', 'Importing a module script failed.', 'error loading dynamically imported module', 'Loading chunk 42 failed.', 'Loading chunk failed', 'ChunkLoadError']) assert.ok(isStaleChunkError(new Error(message)))
assert.ok(isStaleChunkError({ name: 'ChunkLoadError', message: 'missing' }))
for (const error of [new Error('Failed to fetch'), new Error('Cannot read properties of undefined'), new Error('PDF template missing'), 'network failure', null]) {
  assert.equal(recovery.recover(error), false)
}
assert.equal(reloads, 0)
assert.equal(await recovery.load(async () => 123), 123)
const ordinary = new Error('PDF field validation failed')
await assert.rejects(recovery.load(async () => { throw ordinary }), error => error === ordinary)
const missing = new TypeError('Failed to fetch dynamically imported module: /assets/pdf-old.js')
assert.ok(recovery.recover(missing), 'Global Vite event starts recovery')
await assert.rejects(recovery.load(async () => { throw missing }), /Updating the app/)
assert.equal(reloads, 1, 'Event plus catch still reloads only once')
const refreshed = createStaleChunkRecovery({ storage, reload: () => { reloads++ } })
await assert.rejects(refreshed.load(async () => { throw missing }), error => error instanceof Error && error.message === STALE_CHUNK_MESSAGE)
assert.equal(reloads, 1, 'Session marker survives the document reload')
const blocked = createStaleChunkRecovery({ storage: { getItem: () => { throw new Error('Blocked') }, setItem: () => {} }, reload: () => { reloads++ } })
assert.equal(blocked.recover(missing), false)
assert.equal(createStaleChunkRecovery({ storage: null, reload: () => { reloads++ } }).recover(missing), false)
assert.equal(reloads, 1, 'No storage means no unguarded reload')
const vercel = JSON.parse(await readFile('vercel.json', 'utf8'))
for (const source of ['/', '/index.html', '/:slug([a-z0-9-]+)']) assert.match(vercel.headers.find((rule: { source: string }) => rule.source === source).headers[0].value, /no-cache/)
const assetRule = vercel.headers.find((rule: { source: string }) => rule.source.startsWith('/assets/:file('))
const assetPattern = new RegExp(`^${assetRule.source.slice('/assets/:file('.length, -1)}$`)
assert.ok(assetPattern.test('pdf-068fWJOA.js')); assert.ok(assetPattern.test('index-lPzKu33J.css'))
for (const name of ['configuration-template.pdf', 'photo.webp', 'logo.js', 'hardware/asset.webp']) assert.equal(assetPattern.test(name), false, 'Mutable unversioned assets never become immutable')
assert.match(assetRule.headers[0].value, /immutable/)

// Exercise the actual production Vite preload event, not only a mocked helper.
const draft = { version: 1, configuration: { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'F1')!.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'none', selectedFinishType: 'paint', selectedPaint: 'paint-black', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-black', hardwareId: hardwareOptions[0].id, doorSwingId: 'LHI' } }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5201', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5201')) resolve() }); server.once('error', reject); server.once('exit', code => reject(new Error(`Preview exited ${code}`))); setTimeout(() => reject(new Error('Preview startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  await page.addInitScript(value => {
    if (window === window.top && !localStorage.getItem('hgi-door-builder-draft')) localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value))
    ;(window as unknown as { __name: (fn: unknown) => unknown }).__name = fn => fn
  }, draft)
  let blockPdf = true, missingRequests = 0, mainNavigations = 0
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) mainNavigations++ })
  await page.route('**/assets/pdf-*.js', route => { if (blockPdf) { missingRequests++; return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' }) }; return route.continue() })
  const toReview = async () => {
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    await page.getByRole('button', { name: 'Next configuration step' }).waitFor()
    for (let i = 0; i < 20 && await page.getByRole('button', { name: 'Next configuration step' }).count(); i++) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      await page.getByRole('button', { name: 'Next configuration step' }).click(); await page.waitForTimeout(100)
    }
    await page.getByRole('heading', { name: 'Configuration Summary' }).waitFor()
  }
  const download = () => page.locator('.attachment-card').getByRole('button', { name: 'Download PDF', exact: true }).click()
  await page.goto('http://127.0.0.1:5201/')
  await toReview()
  const beforeRecovery = mainNavigations
  const saved = await page.evaluate(() => localStorage.getItem('hgi-door-builder-draft'))
  await download()
  await page.getByRole('button', { name: 'Start Building', exact: true }).waitFor()
  assert.equal(mainNavigations, beforeRecovery + 1, 'Missing chunk causes exactly one real reload')
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), STALE_CHUNK_RECOVERY_KEY), 'attempted')
  assert.equal(await page.evaluate(() => localStorage.getItem('hgi-door-builder-draft')), saved, 'Complete configured draft survives recovery')
  await toReview()
  await download()
  await page.getByText(STALE_CHUNK_MESSAGE, { exact: true }).waitFor()
  assert.equal(mainNavigations, beforeRecovery + 1, 'Second missing chunk does not reload')
  assert.equal(missingRequests, 2)
  assert.equal(await page.locator('.submit-error').filter({ hasText: /assets\/pdf-/ }).count(), 0, 'No hashed chunk URL exposed in fallback')
  await page.evaluate(() => {
    const event = new Event('vite:preloadError') as Event & { payload: Error }
    event.payload = new Error('Ordinary runtime error')
    window.dispatchEvent(event)
  })
  assert.equal(mainNavigations, beforeRecovery + 1)
  blockPdf = false
  await page.reload() // User-directed refresh; the one-time recovery marker remains.
  await toReview()
  const downloaded = page.waitForEvent('download', { timeout: 30000 })
  await download()
  const pdf = await downloaded
  assert.equal(await pdf.failure(), null)
  const path = await pdf.path()
  assert.ok(path)
  const bytes = await readFile(path!)
  assert.ok(bytes.subarray(0, 5).toString() === '%PDF-')
  assert.ok(bytes.length > 10000, 'Real template and door preview produce a populated PDF')
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), STALE_CHUNK_RECOVERY_KEY), 'attempted', 'Successful imports do not reset the loop guard')
  console.log('Stale chunk signatures, blocked storage, ordinary errors, cache rules, actual production 404 → one reload → friendly second failure → working PDF and saved draft passed.')
} finally { await browser?.close(); server.kill('SIGTERM') }
