import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { sideliteAssetFamilyForSlab, sideliteStylesForFamily, sideliteSlabAsset, sideliteGlassMask } from '../src/data/sideliteAssets'
import { doorStyles, hardwareOptions } from '../src/data/options'
import { resolveDoorProduct } from '../src/data/productCatalog'
import { resolveAiProduct } from '../server/aiDoorVisualization'
import { aiTestConfiguration } from './aiVisualizerFixture'

const family = sideliteAssetFamilyForSlab({ doorLineId: '20-gauge-smooth-steel' })!
assert.deepEqual(sideliteStylesForFamily(family), ['fsl', 'f48sl', 'ssl', 's2sl'])
assert.deepEqual(sideliteStylesForFamily(sideliteAssetFamilyForSlab({ doorLineId: 'brushed-smooth-fiberglass' })), ['fsl', 'f48sl', 's2sl'], 'Unrelated smooth fiberglass options remain unchanged')
for (const style of ['fsl', 'f48sl', 's2sl'] as const) {
  assert.equal(sideliteSlabAsset(family, style), sideliteSlabAsset('20-gauge', style), 'Existing Smooth Steel assets remain unchanged')
  assert.equal(sideliteGlassMask(family, style), sideliteGlassMask('20-gauge', style))
}
assert.equal(sideliteSlabAsset(family, 'ssl'), sideliteSlabAsset('22-gauge', 'ssl'), 'Reuse the existing shared steel SSL artwork')
assert.equal(sideliteGlassMask(family, 'ssl'), '/assets/masks/Sidelites/SSL.png')
const aiConfiguration = { ...aiTestConfiguration, product: resolveDoorProduct(aiTestConfiguration.style, aiTestConfiguration.finish, undefined, '20-gauge-smooth-steel'), sidelites: 'both-sides', sideliteSlab: 'ssl' }
const aiProduct = resolveAiProduct(aiConfiguration)
assert.ok(aiProduct.references.some(reference => reference.paths.includes(sideliteSlabAsset(family, 'ssl')!)), 'AI product validation accepts the same Smooth Steel SSL asset without a gauge restriction')
for (const style of sideliteStylesForFamily(family)) {
  await access(`public${sideliteSlabAsset(family, style)}`)
  await access(`public${sideliteGlassMask(family, style)}`)
}
const draft = { version: 1, configuration: { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'F1')!.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'both-sides', sideliteStyleId: 'fsl', selectedFinishType: 'paint', selectedPaint: 'paint-black', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-black', jambFinishOverridden: true, hardwareId: hardwareOptions[0].id, doorSwingId: 'LHI' } }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5196', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5196')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(value => { localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value)); (window as unknown as { __name: (fn: unknown) => unknown }).__name = fn => fn }, draft)
    await page.goto('http://127.0.0.1:5196/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    await page.getByRole('button', { name: 'Next configuration step' }).waitFor()
    for (let step = 0; step < 4; step++) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      await page.getByRole('button', { name: 'Next configuration step' }).click()
      await page.waitForTimeout(150)
    }
    await page.locator('.option-card').filter({ has: page.locator('strong').filter({ hasText: /^Smooth Steel$/ }) }).click()
    await page.getByRole('button', { name: 'Next configuration step' }).click()
    for (const style of ['ssl', 'fsl', 'f48sl', 's2sl'] as const) {
      const card = page.locator('.sidelite-catalog-card').filter({ has: page.locator('strong').filter({ hasText: new RegExp(`^${style}$`, 'i') }) })
      assert.equal(await card.isVisible(), true)
      await card.click()
      const expected = sideliteSlabAsset(family, style)!
      await page.waitForFunction(asset => [...document.querySelectorAll<HTMLImageElement>('.door-frame-sidelite')].some(image => decodeURI(new URL(image.src).pathname) === asset && image.complete && image.naturalWidth > 0), expected)
      assert.ok(await page.locator('.door-frame-sidelite').count() >= 2, 'Both configured sidelites render')
      assert.equal(await card.getAttribute('class').then(value => value!.includes('selected')), true)
    }
    await page.locator('.sidelite-catalog-card').filter({ has: page.locator('strong').filter({ hasText: /^SSL$/ }) }).click()
    await page.screenshot({ path: `/tmp/smooth-steel-ssl-${width}.png` })
    console.log(`${width}px: Smooth Steel selection exposes SSL; SSL, FSL, F48SL and S2SL select and load their mapped preview assets.`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
