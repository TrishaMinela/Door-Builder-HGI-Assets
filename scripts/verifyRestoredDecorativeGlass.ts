import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles, glassOptions, hardwareOptions } from '../src/data/options'
import { fslGlassOptions } from '../src/data/fslGlass'
import { restoredFullLiteDecorativeGlassIds } from '../src/data/decorativeGlass'
import { isGlassFamilyCompatible } from '../src/data/glassFamilyCompatibility'

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

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5214', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5214')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 390]) for (const scope of ['F', 'F48', 'FSL']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    const requestedAssets = new Set<string>()
    page.on('request', request => requestedAssets.add(decodeURIComponent(new URL(request.url()).pathname)))
    await page.addInitScript(value => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: value })), {
      selectedDoorConfigurationType: 'single', styleId: doorStyles.find(style => style.code === (scope === 'F48' ? 'F48' : 'F'))!.id,
      doorLineId: '20-gauge-smooth-steel', sidelites: scope === 'FSL' ? 'right' : 'none', sideliteStyleId: 'fsl', doorSwingId: 'LHI',
      selectedFinishType: 'paint', selectedPaint: 'paint-white', selectedGlassCategory: 'decorative', glassId: 'courtyard',
      sideliteGlassCategory: 'decorative', sideliteGlassId: 'cou', hardwareId: hardwareOptions[0].id,
    })
    await page.goto('http://127.0.0.1:5214/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
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
    const required = ['Ashbury', 'Calandra', 'Courtyard', 'Elegant', 'Monterey', ...(scope !== 'F' ? ['Berkley'] : []), ...(scope === 'F48' ? ['Briselle'] : [])]
    for (const label of required) {
      assert.ok(labels.includes(label), `${scope}: ${label} visible`)
      await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: new RegExp(`^${label}$`) }) }).click()
      const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
      const selected = scope === 'FSL' ? fslGlassOptions.find(option => option.id === state.sideliteGlassId)! : glassOptions.find(option => option.id === state.glassId)!
      assert.ok(selected.name.startsWith(label), 'Selected product identity survives')
      const asset = scope === 'FSL' ? (selected as typeof fslGlassOptions[number]).asset : (selected as typeof glassOptions[number]).overlaysByDoorStyle[scope]
      assert.ok(asset && existsSync(`public${asset}`))
      const preview = page.locator(width === 1280 ? 'aside .preview-scene' : '.mobile-live-preview .preview-scene').first()
      await page.waitForTimeout(250)
      assert.ok(requestedAssets.has(asset!), `${scope}: exact selected artwork requested`)
      assert.ok(await preview.locator(scope === 'FSL' ? '.door-frame-sidelite-glass' : '.door-glass-overlay').evaluateAll(images => images.some(image => (image as HTMLImageElement).naturalWidth > 0)))
    }
    // End on a single-variant family to exercise the real summary flow.
    await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: /^Calandra$/ }) }).click()
    for (let i = 0; i < 30 && !(await page.getByRole('heading', { name: 'Configuration Summary', exact: true }).isVisible()); i++) await next()
    await page.getByRole('heading', { name: 'Configuration Summary', exact: true }).waitFor()
    assert.match(await page.locator('.summary-card').innerText(), /Calandra/)
    await page.screenshot({ path: `/tmp/restored-glass-${scope}-${width}.png` })
    console.log(`${scope} ${width}px: alphabetized unique families, selections, artwork and summary passed`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
