import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles, hardwareOptions } from '../src/data/options'
import { doorLineChoices, doorLineChoicesForStyle } from '../src/data/productCatalog'
import { sideliteAssetFamilyForSlab, sideliteStylesForFamily } from '../src/data/sideliteAssets'
import { sortByDisplayLabel } from '../src/utils/sortByDisplayLabel'
import { validOptionId } from '../src/utils/optionSelection'

const firstSide = (lineId: string, grain: string | null) => sortByDisplayLabel(
  sideliteStylesForFamily(sideliteAssetFamilyForSlab({ doorLineId: lineId, grain })).map(id => ({ id })), item => item.id,
)[0]?.id ?? ''
assert.equal(validOptionId('missing', []), '', 'Empty lists clear safely')
assert.equal(validOptionId('manual', [{ id: 'first' }, { id: 'manual' }]), 'manual', 'Normal reconciliation preserves a valid manual choice')
assert.equal(firstSide('unsupported', null), '', 'No available sidelite family clears safely')

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5197', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5197')) resolve() })
    server.once('error', reject)
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 390]) for (const restoredCherry of [false, true]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    if (restoredCherry) await page.addInitScript(value => {
      localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: value }))
    }, { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'CANGSS')!.id,
      doorLineId: 'signature-series', grainId: 'Cherry', sidelites: 'none', doorSwingId: 'LHI' })
    await page.goto('http://127.0.0.1:5197/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    for (let i = 0; i < 10 && await page.locator('.step-heading h1').innerText() !== 'Choose a Door Style'; i++) {
      if (await page.locator('.step-heading h1').innerText() === 'Choose Your Door Configuration') {
        await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: /^Single Door$/ }) }).click()
      }
      await page.getByRole('button', { name: 'Next configuration step' }).click()
    }
    assert.equal(await page.locator('.step-heading h1').innerText(), 'Choose a Door Style')
    assert.equal(await page.locator('.builder-options-scroll .door-catalog-card').count(), 42, `${width}px ${restoredCherry ? 'saved Signature/Cherry' : 'fresh session'}: full initial browsing`)
    const savedStyle = () => page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.styleId)
    assert.equal(await savedStyle(), doorStyles.find(item => item.code === (restoredCherry ? 'CANGSS' : 'F'))!.id, 'Fresh configurations start Full Lite; existing draft styles remain unchanged')
    if (!restoredCherry) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      await page.locator('.builder-options-scroll .door-catalog-card').filter({ has: page.locator('strong').filter({ hasText: /^N1 / }) }).click()
      await page.getByRole('button', { name: 'Next configuration step' }).click()
      await page.getByRole('button', { name: 'Previous configuration step' }).click()
      assert.equal(await page.locator('.step-heading h1').innerText(), 'Choose a Door Style')
      assert.equal(await savedStyle(), doorStyles.find(item => item.code === 'N1')!.id, 'Returning to Door Style preserves the manual choice, not Full Lite')
      assert.equal(await page.locator('.builder-options-scroll .door-catalog-card').count(), 42)
    }
    await page.close()
  }
  for (const width of [1280, 390]) for (const relationship of ['hinge-side', 'lock-side', 'both-sides']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(value => {
      if (!localStorage.getItem('hgi-door-builder-draft')) localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: value }))
      ;(window as unknown as { __name: (fn: unknown) => unknown }).__name = fn => fn
    }, {
      selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'F')!.id,
      doorLineId: '20-gauge-smooth-steel', sidelites: relationship, sideliteStyleId: 'ssl',
      sideliteGlassCategory: 'clear', sideliteGlassId: 'clear-grids', sideliteGridLocation: 'internal',
      sideliteGridStyle: 'Flat', sideliteGridPattern: '3 Lite', sideliteGridColor: 'White', sideliteGridWidth: '5/8"',
      doorSwingId: 'RHI', hardwareId: hardwareOptions[0].id,
    })
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    const next = () => page.getByRole('button', { name: 'Next configuration step' }).click()
    const back = () => page.getByRole('button', { name: 'Previous configuration step' }).click()
    const card = (name: RegExp) => page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: name }) }).click()
    const defaults = async (line: string, grain = '') => {
      await page.waitForTimeout(150)
      const state = await saved()
      assert.equal(state.doorLineId, line)
      assert.equal(state.grainId, grain)
      assert.equal(state.styleId, doorStyles.find(item => item.code === 'F')!.id, 'Material/grain never replaces the already-selected slab')
      assert.equal(state.sideliteStyleId, firstSide(line, grain || doorLineChoices.find(item => item.id === line)?.autoGrain || null))
      assert.equal(state.sidelites, relationship)
      assert.equal(state.doorSwingId, 'RHI')
      assert.equal(state.hardwareId, hardwareOptions[0].id)
    }
    await page.goto('http://127.0.0.1:5197/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    for (let i = 0; i < 10 && await page.locator('.step-heading h1').innerText() !== 'Choose Your Door Line'; i++) {
      if (await page.locator('.step-heading h1').innerText() === 'Choose a Door Style') assert.equal(await page.locator('.builder-options-scroll .door-catalog-card').count(), 42, 'Style-first browsing includes the full inventory')
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      await next()
    }
    await card(/^Signature Series/)
    const signature = doorLineChoices.find(item => item.id === 'signature-series')!
    const firstGrain = signature.lineIds.flatMap(id => doorStyles.flatMap(slab => slab.variants.filter(v => v.lineId === id).flatMap(v => v.grains)))[0]
    await defaults(signature.id, firstGrain)
    assert.equal((await saved()).sideliteGlassId, '', 'Old SSL glass is cleared when sidelite slab resets')
    assert.equal((await saved()).sideliteGridStyle, '', 'Old SSL grid state is cleared with the old slab')
    await next()
    await card(/^Mahogany$/)
    await defaults(signature.id, 'Mahogany')
    await page.waitForTimeout(250)
    assert.equal((await saved()).grainId, 'Mahogany', 'Manual grain remains')
    await back() // Line
    await back() // Style
    assert.equal(await page.locator('.builder-options-scroll .door-catalog-card').count(), 42, 'Signature/Mahogany does not restrict earlier browsing')
    await card(/^F Full /)
    await page.waitForTimeout(200)
    assert.equal((await saved()).styleId, doorStyles.find(item => item.code === 'F')!.id, 'Manual slab remains')
    assert.equal((await saved()).grainId, 'Mahogany')
    await next(); await next(); await next() // line, grain, sidelite slab
    await card(/^SSL$/)
    await page.waitForTimeout(250)
    assert.equal((await saved()).sideliteStyleId, 'ssl', 'Manual sidelite remains')
    await back(); await back() // line
    await card(/^Smooth Steel$/)
    await defaults('20-gauge-smooth-steel')
    await card(/^Signature Series/)
    await defaults(signature.id, firstGrain)
    assert.notEqual((await saved()).grainId, 'Mahogany', 'Returning category does not restore old manual grain')
    await card(/^Paintable and Stainable Steel$/)
    await defaults('22-gauge-steel')
    await back()
    assert.equal(await page.locator('.builder-options-scroll .door-catalog-card').count(), 42)
    await card(/^CR14 Craftsman /)
    await page.waitForTimeout(150)
    assert.equal((await saved()).styleId, doorStyles.find(item => item.code === 'CR14')!.id)
    assert.equal((await saved()).grainId, 'Fir', 'CR14 defaults to Fir, never incompatible Cherry')
    await next()
    const cr14 = doorStyles.find(item => item.code === 'CR14')!
    const expectedLines = sortByDisplayLabel(doorLineChoicesForStyle(cr14), item => item.name).map(item => item.name)
    assert.deepEqual(await page.locator('.builder-options-scroll .option-card strong').allTextContents(), expectedLines)
    await card(/^Signature Series/)
    await next()
    assert.deepEqual(await page.locator('.builder-options-scroll .option-card strong').allTextContents(), ['Fir'], 'Signature grains follow the selected CR14 style')
    await back(); await back()
    assert.equal(await page.locator('.builder-options-scroll .door-catalog-card').count(), 42)
    await card(/^N1 Nine Panel /)
    await page.waitForTimeout(150)
    assert.equal((await saved()).doorLineId, doorLineChoicesForStyle(doorStyles.find(item => item.code === 'N1')!)[0].id, 'Incompatible Signature is replaced by the first valid material')
    assert.equal((await saved()).grainId, '')
    await next()
    assert.equal(await page.locator('.builder-options-scroll .option-card strong').filter({ hasText: /^Signature Series/ }).count(), 0)
    await page.close()
  }
  console.log('Style-first defaults passed: desktop/mobile; all 42 styles before/after material selection; style-filtered materials/grains; CR14→Fir (not Cherry); incompatible downstream recalculation; first sidelite defaults; manual overrides; all relationships; handing/hardware preserved.')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
