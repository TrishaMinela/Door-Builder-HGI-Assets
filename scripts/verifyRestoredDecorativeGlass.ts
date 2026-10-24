import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles, glassOptions, hardwareOptions } from '../src/data/options'
import { fslGlassOptions } from '../src/data/fslGlass'
import { restoredFullLiteDecorativeGlassIds } from '../src/data/decorativeGlass'
import { isGlassFamilyCompatible } from '../src/data/glassFamilyCompatibility'
import { isCustomerSelectableGlass, isHiddenDecorativeGlass } from '../src/data/customerGlassAvailability'
import { sanitizeDoorBuilderDraft } from '../src/utils/doorBuilderDraft'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import { aiTestConfiguration } from './aiVisualizerFixture'
import submitHandler from '../api/submit-door-builder'

const main = glassOptions.filter(option => restoredFullLiteDecorativeGlassIds.has(option.id))
assert.equal(main.length, 10)
assert.equal(new Set(main.map(option => option.id)).size, 10)
for (const option of main) {
  assert.ok(existsSync(`public${option.thumbnailPath}`))
  for (const [opening, asset] of Object.entries(option.overlaysByDoorStyle)) {
    assert.ok(['F', 'F48'].includes(opening), 'Restoration must not broaden unrelated openings')
    assert.ok(existsSync(`public${asset}`))
  }
  for (const line of ['signature-series', '20-gauge-smooth-steel', '22-gauge-steel', 'brushed-smooth-fiberglass', 'textured-fiberglass']) assert.ok(isGlassFamilyCompatible(option, line))
}
assert.equal(main.filter(option => option.overlaysByDoorStyle.F).length, 8)
assert.equal(main.filter(option => option.overlaysByDoorStyle.F48).length, 10)
assert.equal(glassOptions.find(option => option.id === 'briselle')!.overlaysByDoorStyle.F, undefined)
assert.equal(glassOptions.find(option => option.id === 'berkley')!.overlaysByDoorStyle.F, undefined)
assert.ok(!fslGlassOptions.some(option => /briselle/i.test(option.name)), 'Never relabel Bristol BRI as Briselle')
for (const option of [...main, ...fslGlassOptions.filter(isHiddenDecorativeGlass)]) {
  assert.ok(!isCustomerSelectableGlass(option))
  const draft = sanitizeDoorBuilderDraft({ version: 1, configuration: { glassId: option.id, sideliteGlassId: option.id, selectedGlassGroupKey: option.name.toLowerCase(), sideliteGlassGroupKey: option.name.toLowerCase(), gridStyle: 'Flat', sideliteGridStyle: 'Flat' } })!
  assert.equal(draft.glassId, ''); assert.equal(draft.sideliteGlassId, '')
  assert.equal(draft.gridStyle, ''); assert.equal(draft.sideliteGridStyle, '')
  assert.throws(() => buildDoorBuilderSubmissionPayload({ contact: { fullName: 'Test', email: '', phone: '', zip: '', notes: '' }, configuration: { ...aiTestConfiguration, glass: { ...main[0], id: option.id, name: option.name } } }), /available glass/)
  assert.throws(() => buildDoorBuilderSubmissionPayload({ contact: { fullName: 'Test', email: '', phone: '', zip: '', notes: '' }, configuration: { ...aiTestConfiguration, sideliteGlass: { glass: option.name, glassCategory: 'Decorative Glass' } } }), /available glass/)
  let status = 0
  const response = { status(code: number) { status = code; return this }, json() {}, setHeader() {} }
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('Hidden submissions must not access external services') }
  try {
    await submitHandler({ method: 'POST', body: { full_name: 'Test', email: 'test@example.com', phone: '5551234', postal_code: '12345', submissionId: 'c1950cf7-6273-4a5c-a0c8-4a531831d906', main_door_glass: option.name, doorConfiguration: { schemaVersion: 1, configuration: { ...aiTestConfiguration, glass: option } } } }, response)
    assert.equal(status, 400)
  } finally { globalThis.fetch = originalFetch }
}
assert.ok(isCustomerSelectableGlass({ id: 'bri', name: 'Bristol' }))
assert.equal(sanitizeDoorBuilderDraft({ version: 1, configuration: { sideliteGlassId: 'bri', sideliteGlassGroupKey: 'bristol' } })!.sideliteGlassId, 'bri')

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5214', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5214')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 390]) for (const scope of ['F', 'F48', 'FSL']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(value => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: value })), {
      selectedDoorConfigurationType: 'single', styleId: doorStyles.find(style => style.code === (scope === 'F48' ? 'F48' : 'F'))!.id,
      doorLineId: '20-gauge-smooth-steel', sidelites: scope === 'FSL' ? 'right' : 'none', sideliteStyleId: 'fsl', doorSwingId: 'LHI',
      selectedFinishType: 'paint', selectedPaint: 'paint-white', selectedGlassCategory: 'decorative', glassId: 'courtyard',
      sideliteGlassCategory: 'decorative', sideliteGlassId: 'cou', hardwareId: hardwareOptions[0].id,
    })
    await page.goto('http://127.0.0.1:5214/')
    await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
    const next = () => page.getByRole('button', { name: 'Next configuration step' }).click()
    const target = scope === 'FSL' ? 'Choose Sidelite Glass' : 'Choose Main Door Glass'
    for (let i = 0; i < 30 && !(await page.getByRole('heading', { name: target, exact: true }).isVisible()); i++) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      await next()
    }
    await page.getByRole('heading', { name: target, exact: true }).waitFor()
    const labels = await page.locator('.builder-options-scroll .option-card strong').allTextContents()
    assert.deepEqual(labels, [...labels].sort((a,b) => a.trim().localeCompare(b.trim(), undefined, { sensitivity: 'base' })))
    assert.equal(new Set(labels).size, labels.length)
    for (const label of ['Ashbury', 'Calandra', 'Courtyard', 'Elegant', 'Monterey', 'Berkley', 'Briselle']) assert.ok(!labels.includes(label), `${scope}: ${label} hidden`)
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.ok(!isHiddenDecorativeGlass({ id: state.glassId }))
    assert.ok(!isHiddenDecorativeGlass({ id: state.sideliteGlassId }))
    await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: /^Cadence$/ }) }).click()
    for (let i = 0; i < 30 && !(await page.getByRole('heading', { name: 'Configuration Summary', exact: true }).isVisible()); i++) await next()
    await page.getByRole('heading', { name: 'Configuration Summary', exact: true }).waitFor()
    assert.match(await page.locator('.summary-card').innerText(), /Cadence/)
    assert.doesNotMatch(await page.locator('.summary-card').innerText(), /Courtyard|Briselle|Berkley|Ashbury|Elegant|Monterey|Calandra/)
    await page.screenshot({ path: `/tmp/restored-glass-${scope}-${width}.png` })
    console.log(`${scope} ${width}px: hidden families absent, restored drafts sanitized, alphabetized lists and valid summary passed`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
