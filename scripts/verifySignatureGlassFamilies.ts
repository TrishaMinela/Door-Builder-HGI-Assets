import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { isGlassFamilyCompatible } from '../src/data/glassFamilyCompatibility'
import { glassOptions } from '../src/data/glassOptions'
import { fslGlassOptions } from '../src/data/fslGlass'
import { sslGlassOptions } from '../src/data/sslGlass'
import { f48slGlassOptions } from '../src/data/f48slGlass'
import { cr14slGlassOptions } from '../src/data/cr14slGlass'
import { doorLineChoices } from '../src/data/productCatalog'
import { doorStyles } from '../src/data/options'

const families = ['cobblestone', 'dutchcraft', 'leland']
const restricted = (name: string) => /^(cobblestone|dutch\s?craft|leland)$/i.test(name)
for (const catalog of [glassOptions, fslGlassOptions, sslGlassOptions, f48slGlassOptions, cr14slGlassOptions]) {
  for (const line of doorLineChoices) {
    const visible = catalog.filter(option => isGlassFamilyCompatible(option, line.id))
    assert.deepEqual(visible.map(option => option.id), catalog.filter(option => line.id === 'signature-series' || !restricted(option.name)).map(option => option.id), `${line.name}: only the three restricted families change`)
  }
  for (const lineId of doorLineChoices.find(line => line.id === 'signature-series')!.lineIds) assert.ok(catalog.every(option => isGlassFamilyCompatible(option, lineId)), 'Actual Signature grain-line IDs are supported too')
}
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5211', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5211')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 390]) for (const family of (width === 1280 ? families : ['cobblestone'])) for (const line of doorLineChoices) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(({ styleId, family }) => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: {
      selectedDoorConfigurationType: 'single', styleId, doorLineId: 'signature-series', grainId: 'Oak', sidelites: 'both-sides', doorSwingId: 'LHI',
      sideliteStyleId: 'ssl', sideliteGlassCategory: 'decorative', sideliteGlassId: ({ cobblestone: 'cob', dutchcraft: 'dut', leland: 'lel' } as Record<string, string>)[family], sideliteGlassGroupKey: family, sideliteGlassVariantConfirmed: true,
      selectedFinishType: 'paint', selectedPaint: 'paint-white', selectedGlassCategory: 'decorative', glassId: family, selectedGlassGroupKey: family, glassVariantConfirmed: true,
    } })), { styleId: doorStyles.find(style => style.code === 'F')!.id, family })
    await page.goto('http://127.0.0.1:5211/')
    await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
    const next = () => page.getByRole('button', { name: 'Next configuration step' }).click()
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    for (let i = 0; i < 12 && await page.locator('.step-heading h1').innerText() !== 'Choose Your Door Line'; i++) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      await next()
    }
    await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: line.name }) }).click()
    await page.waitForTimeout(150)
    if (line.id !== 'signature-series') {
      const state = await saved()
      assert.notEqual(state.glassId, family)
      assert.equal(state.glassId, 'f-clear-no-grids', 'Restricted selection falls back to Clear, not alphabetical decorative glass')
      assert.ok(isGlassFamilyCompatible(glassOptions.find(option => option.id === state.glassId)!, line.id))
      if (state.sideliteStyleId) {
        assert.ok(state.sideliteGlassId, `${line.id}/${family}: restricted sidelite receives a replacement: ${JSON.stringify(state)}`)
        const side = [...fslGlassOptions, ...sslGlassOptions, ...f48slGlassOptions, ...cr14slGlassOptions].find(option => option.id === state.sideliteGlassId)!
        assert.ok(side && isGlassFamilyCompatible(side, line.id))
      }
    } else assert.equal((await saved()).glassId, family)
    for (let i = 0; i < 12 && await page.locator('.step-heading h1').innerText() !== 'Choose Main Door Glass'; i++) await next()
    const names = await page.locator('.builder-options-scroll .option-card strong').allTextContents()
    for (const name of ['Cobblestone', 'Dutchcraft', 'Leland']) assert.equal(names.includes(name), line.id === 'signature-series', `${line.name}: ${name} visibility`)
    const selectedName = line.id !== 'signature-series' ? /^Clear Glass with No Grids$/ : new RegExp(`^${family}$`, 'i')
    assert.ok(await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: selectedName }) }).evaluate(element => element.classList.contains('selected')), 'Retained glass or Clear fallback is visibly selected')
    await page.close()
  }
  console.log('Signature-only families verified across all five material choices, main/sidelite catalogs, Clear fallbacks and selected cards on desktop/mobile; unrelated families unchanged.')
} finally { await browser?.close(); server.kill('SIGTERM') }
