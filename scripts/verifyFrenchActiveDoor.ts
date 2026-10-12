import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles, hardwareOptions } from '../src/data/options'
import { DEFAULT_FRENCH_LOCK_PREP, doorHardwarePlacements } from '../src/data/doorConfigurationRules'
import { doorHandingSides, doorSwingDisplayName, frenchActiveDoorSide } from '../src/data/doorHanding'
import { resolveDoorProduct } from '../src/data/productCatalog'
import { finishes } from '../src/data/options'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import { resolveSidelitePosition, sideliteProductCode } from '../src/data/sideliteConfigurations'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { aiStructuralInstructionBlock, resolveAiProduct } from '../server/aiDoorVisualization'
import { loadDoorBuilderDraft } from '../src/utils/doorBuilderDraft'

assert.equal(DEFAULT_FRENCH_LOCK_PREP, 'DDLLAC')
for (const [id, leaf, label] of [['LHI', 0, 'Left Active'], ['RHI', 1, 'Right Active'], ['LHO', 1, 'Right Active'], ['RHO', 0, 'Left Active']] as const) {
  const side = doorHandingSides(id).lockSide
  assert.equal(doorHardwarePlacements('french', side, side)[0].leafIndex, leaf)
  assert.equal(doorSwingDisplayName('french', { id, name: 'Legacy swing', image: '' }), label)
  assert.equal(frenchActiveDoorSide(id), leaf === 0 ? 'left' : 'right')
  assert.equal(doorSwingDisplayName('single', { id, name: 'Legacy swing', image: '' }), 'Legacy swing')
  const style = doorStyles.find(item => item.code === 'F1')!, finish = finishes.find(item => item.id === 'paint-white')!
  const payload = buildDoorBuilderSubmissionPayload({ contact: { fullName: 'Active Test', email: '', phone: '', zip: '', notes: '' }, configuration: {
    style, finish, product: resolveDoorProduct(style, finish, undefined, '20-gauge-smooth-steel'), grain: null,
    glass: null, grid: null, hardware: hardwareOptions[0], sidelites: 'none', doorConfigurationType: 'french',
    doorSwing: { id, name: 'Legacy swing', image: '' },
  } })
  assert.equal(payload.door_swing, label)
  assert.equal(payload.lock_setup, 'Lock on Main Door Only')
  for (const [relationship, position] of [['hinge-side', 'left'], ['lock-side', 'right'], ['both-sides', 'both']] as const) {
    assert.equal(resolveSidelitePosition({ relationship, handing: id, configurationType: 'french' }), position)
    assert.equal(resolveSidelitePosition({ relationship, handing: id, configurationType: 'french', view: 'Interior' }), position === 'both' ? 'both' : position === 'left' ? 'right' : 'left')
    assert.equal(sideliteProductCode(relationship, id, 'french'), position === 'left' ? 'LEFTSIDE' : position === 'right' ? 'RIGHTSIDE' : 'BOTHSIDES')
    const configuration = { ...aiTestConfiguration, doorConfigurationType: 'french' as const, sidelites: relationship, sideliteSlab: 'ssl' as const, doorSwing: { ...aiTestConfiguration.doorSwing, id } }
    const submission = buildDoorBuilderSubmissionPayload({ contact: { fullName: 'Test', email: '', phone: '', zip: '', notes: '' }, configuration })
    assert.equal(submission.sidelite_placement, position === 'both' ? 'Sidelites on Both Sides' : `Sidelite on ${position === 'left' ? 'Left' : 'Right'}`)
    assert.ok(aiStructuralInstructionBlock(resolveAiProduct(configuration).snapshot).includes(`sidelite_structure: ${position}`))
    const draft = loadDoorBuilderDraft({ getItem: () => JSON.stringify({ version: 1, configuration: { selectedDoorConfigurationType: 'french', sidelites: position === 'left' ? 'LEFTSIDE' : position === 'right' ? 'RIGHTSIDE' : 'BOTHSIDES', doorSwingId: id } }), setItem() {}, removeItem() {} })!
    assert.equal(draft.sidelites, relationship, 'French physical sidelite aliases survive draft reload independently of active leaf')
  }
}
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5207', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5207')) resolve() })
    server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(value => {
      localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: value }))
    }, { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'F1')!.id,
      doorLineId: '20-gauge-smooth-steel', sidelites: 'lock-side', sideliteStyleId: 'ssl', selectedFinishType: 'paint', selectedPaint: 'paint-white',
      hardwareId: hardwareOptions[0].id, doorSwingId: 'LHI' })
    const card = (label: RegExp) => page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: label }) }).click()
    const next = () => page.getByRole('button', { name: 'Next configuration step' }).click()
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    await page.goto('http://127.0.0.1:5207/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    await card(/^French Door$/)
    assert.equal((await saved()).doubleDoorLockPrep, 'DDLLAC')
    await next(); await next()
    await page.getByRole('heading', { name: 'Which door is active?', exact: true }).waitFor()
    assert.deepEqual(await page.locator('.builder-options-scroll .option-card strong').allTextContents(), ['Left Active', 'Right Active'])
    const diagrams = await page.locator('.active-door-preview').evaluateAll(elements => elements.map(element => {
      const box = element.getBoundingClientRect(), visual = element.closest('.option-visual')!.getBoundingClientRect()
      return { box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom }, visual: { left: visual.left, right: visual.right, top: visual.top, bottom: visual.bottom } }
    }))
    assert.ok(diagrams.every(({ box, visual }) => box.left >= visual.left - 1 && box.right <= visual.right + 1 && box.top >= visual.top - 1 && box.bottom <= visual.bottom + 1), `Active-leaf diagrams fit inside desktop/mobile cards: ${JSON.stringify(diagrams)}`)
    const beforeActiveChange = await saved()
    for (const [label, leaf, id] of [['Left Active', 'left', 'LHI'], ['Right Active', 'right', 'RHI'], ['Left Active', 'left', 'LHI'], ['Right Active', 'right', 'RHI']] as const) {
      await card(new RegExp(`^${label}$`))
      await page.waitForTimeout(200)
      assert.equal((await saved()).doorSwingId, id)
      const preview = page.locator(width === 1280 ? 'aside .preview-scene' : '.mobile-live-preview .preview-scene').first()
      assert.equal(await preview.locator('.door-frame').getAttribute('data-sidelites'), 'right', 'French sidelite stays on the right regardless of active leaf')
      const afterActiveChange = await saved()
      for (const key of ['sidelites', 'sideliteStyleId', 'sideliteGlassId', 'sideliteGridStyle']) assert.equal(afterActiveChange[key], beforeActiveChange[key], `${key} is independent of active leaf`)
      assert.equal(await preview.locator(`.door-leaf-${leaf} .hardware`).count(), 1)
      assert.equal(await preview.locator(`.door-leaf-${leaf === 'left' ? 'right' : 'left'} .hardware`).count(), 0)
    }
    await page.screenshot({ path: `/tmp/french-active-${width}.png` })
    for (let i = 0; i < 30 && await page.locator('.step-heading h1').count(); i++) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      if (await page.locator('.step-heading h1').innerText() === 'Lock Setup') {
        await card(/^Locks on Both Doors$/)
        assert.equal((await saved()).doubleDoorLockPrep, 'DDLLBO')
      }
      await next(); await page.waitForTimeout(100)
    }
    await page.getByRole('heading', { name: 'Configuration Summary' }).waitFor()
    assert.match(await page.locator('.summary-card').innerText(), /Active door\s*Right Active/i)
    assert.equal((await saved()).doubleDoorLockPrep, 'DDLLBO', 'Manual lock option survives navigation')
    await page.locator('.summary-row').filter({ hasText: 'Door Configuration' }).getByRole('button', { name: 'Edit', exact: true }).click()
    await card(/^French Door$/)
    assert.equal((await saved()).doubleDoorLockPrep, 'DDLLBO', 'Clicking the selected type does not discard manual prep')
    await card(/^Single Door$/)
    await next(); await next()
    await page.getByRole('heading', { name: 'Choose Your Door Swing', exact: true }).waitFor()
    assert.equal(await page.locator('.builder-options-scroll .option-card').count(), 4)
    assert.match(await page.locator('.builder-options-scroll').innerText(), /Left Hand Inswing/)
    await page.close()
    console.log(`${width}px French active-door flow passed: two choices, correct hardware leaf, main-only default, manual prep retained, summary, single-door restoration.`)
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
