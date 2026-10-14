import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles, finishes, hardwareOptions } from '../src/data/options'
import { resolveDoorProduct, resolvedDoorStyleCode, resolvedDoorStyleLabel, doorLineChoices } from '../src/data/productCatalog'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { readFileSync } from 'node:fs'

const style = doorStyles.find(style => style.variants.some(variant => variant.code === 'S1NGSS'))!
const finish = finishes.find(finish => finish.id === 'paint-white')!
const cases = ['signature-series', '20-gauge-smooth-steel', '22-gauge-steel', 'brushed-smooth-fiberglass', 'textured-fiberglass']
const original = JSON.stringify(style)
for (const line of cases) {
  const product = resolveDoorProduct(style, finish, line === 'signature-series' ? 'Cherry' : undefined, line)
  const code = line === 'signature-series' ? 'S1NGSS' : 'S1'
  assert.equal(resolvedDoorStyleCode(style, product), code)
  assert.equal(resolvedDoorStyleLabel(style, product), `${code} - SIX PANEL NO GLASS`)
  const payload = buildDoorBuilderSubmissionPayload({ contact: { fullName: 'Test', email: '', phone: '', zip: '', notes: '' }, configuration: { ...aiTestConfiguration, style, product, finish } })
  assert.equal(payload.door_style, `${code} - SIX PANEL NO GLASS`)
}
assert.equal(JSON.stringify(style), original, 'Catalog ID and artwork are unchanged')
const pdfSource = readFileSync('src/utils/pdf.ts', 'utf8')
assert.equal(pdfSource.match(/resolvedDoorStyleLabel\(style, product\)/g)?.length, 2, 'Both PDF summary paths share the material-aware formatter')
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5215', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5215')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const line of cases) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
    await page.addInitScript(value => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: value })), {
      selectedDoorConfigurationType: 'single', styleId: style.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'none', doorSwingId: 'LHI',
      selectedFinishType: 'paint', selectedPaint: 'paint-white', hardwareId: hardwareOptions[0].id,
    })
    await page.goto('http://127.0.0.1:5215/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    const next = () => page.getByRole('button', { name: 'Next configuration step' }).click()
    for (let i = 0; i < 20 && !(await page.getByRole('heading', { name: 'Choose Your Door Line', exact: true }).isVisible()); i++) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      await next()
    }
    const name = doorLineChoices.find(option => option.id === line)!.name
    await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).click()
    for (let i = 0; i < 25 && !(await page.getByRole('heading', { name: 'Configuration Summary', exact: true }).isVisible()); i++) await next()
    await page.getByRole('heading', { name: 'Configuration Summary', exact: true }).waitFor()
    const code = line === 'signature-series' ? 'S1NGSS' : 'S1'
    assert.match(await page.locator('.summary-row').filter({ hasText: 'Door style' }).innerText(), new RegExp(`${code} - SIX PANEL NO GLASS`))
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.equal(state.styleId, style.id, 'Material switching preserves six-panel selection')
    console.log(`${name}: ${code}, material switch, preserved slab and summary passed`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
