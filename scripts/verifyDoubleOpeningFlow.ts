import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles, hardwareOptions } from '../src/data/options'
import { savannahOpening, doorSwingDisplayName, frenchActiveDoorSide, doorHandingSides } from '../src/data/doorHanding'
import { doorHardwarePlacements, requiredDoorConfigurationProductOption } from '../src/data/doorConfigurationRules'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import { aiTestConfiguration } from './aiVisualizerFixture'

for (const id of ['LHI', 'RHI'] as const) {
  const opening = savannahOpening(id), outside = id === 'LHI' ? 'right' : 'left', inside = id === 'LHI' ? 'left' : 'right'
  assert.deepEqual(opening.activeSlab, { Interior: inside, Exterior: outside })
  assert.deepEqual(opening.hardwareSide, opening.activeSlab)
  assert.equal(opening.referenceView, 'Interior')
  assert.equal(opening.hingeArrangement, 'beside-stationary-slab')
  assert.deepEqual(doorHardwarePlacements('savannah', outside, outside), [{ leafIndex: outside === 'left' ? 0 : 1, side: outside, mode: 'full' }])
  assert.equal(requiredDoorConfigurationProductOption('savannah'), undefined)
  const configuration = { ...aiTestConfiguration, doorConfigurationType: 'savannah' as const, doorSwing: { id, name: id === 'LHI' ? 'Left Hand Inswing' : 'Right Hand Inswing', image: '' }, savannahOpening: opening }
  const payload = buildDoorBuilderSubmissionPayload({ contact: { fullName: 'Test', email: '', phone: '', zip: '', notes: '' }, configuration })
  assert.equal(payload.door_swing, doorSwingDisplayName('savannah', configuration.doorSwing))
  assert.ok(payload.door_swing.includes(`${inside} inside / ${outside} outside`))
  assert.equal(payload.hinge_option, 'Not applicable')
  assert.equal(payload.lock_setup, 'Lock on Main Door Only')
}
for (const id of ['LHI','LHO','RHI','RHO'] as const) {
  assert.equal(doorSwingDisplayName('french', { id, name: '', image: '' }), 'Both slabs operable')
  assert.equal(doorHardwarePlacements('french', doorHandingSides(id).lockSide, doorHandingSides(id).lockSide)[0].leafIndex, frenchActiveDoorSide(id) === 'left' ? 0 : 1)
}
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5217', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5217')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280,390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(value => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: value })), { selectedDoorConfigurationType: 'savannah', styleId: doorStyles.find(style => style.code === 'F')!.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'right', sideliteStyleId: 'fsl', selectedFinishType: 'paint', selectedPaint: 'paint-white', doorSwingId: 'LHI', hardwareId: hardwareOptions[0].id })
    await page.goto('http://127.0.0.1:5217/')
    await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
    const next = async () => { await page.getByRole('button', { name: 'Next configuration step' }).click(); await page.waitForTimeout(100) }
    const card = (label: RegExp) => page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: label }) }).click()
    await next(); await next()
    assert.deepEqual(await page.locator('.builder-options-scroll .option-card strong').allTextContents(), ['LHI – Left Hand Inswing', 'RHI – Right Hand Inswing'])
    assert.deepEqual(await page.locator('.door-swing-image').evaluateAll(images => images.map(image => image.getAttribute('src'))), ['/assets/door-swing/lhi.webp','/assets/door-swing/rhi.webp'])
    for (const id of ['LHI','RHI'] as const) {
      await card(new RegExp(`^${id} `))
      const leaf = id === 'LHI' ? 'right' : 'left'
      const scene = page.locator(width === 1280 ? 'aside .preview-scene' : '.mobile-live-preview .preview-scene').first()
      for (const view of ['Exterior','Interior','Exterior']) {
        await page.getByRole('button', { name: view, exact: true }).first().click()
        const hardware = scene.locator('.hardware')
        assert.equal(await hardware.count(), 1)
        assert.equal(await scene.locator(`.door-leaf-${leaf} .hardware`).count(), 1)
        assert.equal(await hardware.getAttribute('data-hardware-side'), leaf)
        assert.equal(await scene.locator('.savannah-interior-mirrored').count(), view === 'Interior' ? 1 : 0)
        const side = await hardware.evaluate(element => { const h=element.getBoundingClientRect(), f=element.closest('.door-frame')!.getBoundingClientRect(); return (h.left+h.right)/2 < (f.left+f.right)/2 ? 'left' : 'right' })
        assert.equal(side, view === 'Exterior' ? leaf : leaf === 'left' ? 'right' : 'left')
      }
    }
    for (let i=0;i<30 && !(await page.getByRole('heading', { name: 'Configuration Summary', exact:true }).isVisible());i++) {
      if(await page.getByRole('button',{name:'Start Configuring',exact:true}).isVisible()) await page.getByRole('button',{name:'Start Configuring',exact:true}).click()
      await next()
    }
    const savannahSummary = await page.locator('.summary-card').innerText()
    assert.match(savannahSummary, /RHI.*right inside \/ left outside/)
    assert.match(savannahSummary, /Lock on Main Door Only/)
    assert.doesNotMatch(savannahSummary, /HINGEOJ|Hinge Off Outer Jamb/)
    await page.reload()
    await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
    await card(/^French Door$/)
    await next(); await next()
    await page.getByRole('heading', { name: 'Choose a Door Style', exact: true }).waitFor()
    assert.equal(await page.getByRole('heading', { name: 'Which door is active?', exact: true }).count(), 0)
    assert.ok(!(await page.locator('.stepper').innerText()).includes('Active Door'))
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.ok(state.doorSwingId, 'French internal handing retained without a question')
    for (let i=0;i<30 && !(await page.getByRole('heading', { name: 'Configuration Summary', exact:true }).isVisible());i++) {
      if(await page.getByRole('button',{name:'Start Configuring',exact:true}).isVisible()) await page.getByRole('button',{name:'Start Configuring',exact:true}).click()
      await next()
    }
    assert.match(await page.locator('.summary-card').innerText(), /Both slabs operable/)
    assert.doesNotMatch(await page.locator('.summary-card').innerText(), /Left Active|Right Active/)
    await page.evaluate(() => { const draft=JSON.parse(localStorage.getItem('hgi-door-builder-draft')!); draft.configuration.doorSwingId=''; localStorage.setItem('hgi-door-builder-draft',JSON.stringify(draft)) })
    await page.reload()
    await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.doorSwingId), 'LHI', 'Missing French internal handing safely initializes without a step')
    await card(/^Savannah Door$/)
    await next(); await next()
    assert.deepEqual(await page.locator('.builder-options-scroll .option-card strong').allTextContents(), ['LHI – Left Hand Inswing', 'RHI – Right Hand Inswing'])
    console.log(`${width}px: Savannah two inswings, both views, main-only hardware, entry switching and French skip passed`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
