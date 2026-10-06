import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import sharp from 'sharp'
import { doorStyles, finishes, hardwareOptions, glassOptions } from '../src/data/options'
import { cladColors } from '../src/data/finishes'
import { matchingJambFinish } from '../src/utils/matchingFrameFinish'

const clad = finishes.filter(item => item.finishType === 'paint' && cladColors.some(color => item.id === `paint-${color.id}`))
for (const finish of finishes) {
  assert.equal(matchingJambFinish(finish, 'timber', clad)?.id, finish.id)
  const expected = clad.find(item => item.id === finish.id) ?? clad[0]
  assert.equal(matchingJambFinish(finish, 'clad', clad)?.id, expected.id)
}
console.log(`Timber: all finish IDs match directly. Clad: ${clad.length} exact colors; other finishes use existing fallback ${clad[0].id}.`)
const glass = glassOptions.find(item => item.id === 'f-clear-no-grids')!
const draft = { version: 1, configuration: { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'F')!.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'none', selectedFinishType: 'paint', selectedPaint: 'paint-black', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-brown', jambFinishOverridden: true, selectedGlassCategory: 'clear', glassId: glass.id, selectedGlassGroupKey: glass.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), glassVariantConfirmed: true, glassFrameColorMode: 'custom', glassFrameFinishId: 'paint-brown', glassFrameFinishType: 'paint', hardwareId: hardwareOptions[0].id, doorSwingId: 'LHI' } }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5197', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5197')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const [jambEnabled, glassEnabled, materialEnabled] of [[false, false, false], [true, false, false], [false, true, false], [true, true, true]]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
    await page.addInitScript(value => { localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value)); (window as unknown as { __name: (fn: unknown) => unknown }).__name = fn => fn }, draft)
    await page.route('**/src/config/builderUx.ts*', async route => { const response = await route.fetch(); const source = (await response.text()).replace(/showJambColorSelection:\s*false/, `showJambColorSelection: ${jambEnabled}`).replace(/showGlassFrameColorSelection:\s*false/, `showGlassFrameColorSelection: ${glassEnabled}`).replace(/showJambMaterialSelection:\s*false/, `showJambMaterialSelection: ${materialEnabled}`); await route.fulfill({ response, body: source }) })
    let payload: Record<string, any> | undefined
    const image = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#ccc' } }).jpeg().toBuffer()
    await page.route('**/api/detect-entrance-structure', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ detection: { doorStructure: 'single', sidelites: 'none', transom: false, confidence: .96, summary: 'Single door.' } }) }))
    await page.route('**/api/generate-door-visualization', async route => { payload = route.request().postDataJSON(); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ image: `data:image/jpeg;base64,${image.toString('base64')}` }) }) })
    await page.goto('http://127.0.0.1:5197/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    await page.getByRole('button', { name: 'Next configuration step' }).waitFor()
    const loaded = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.equal(loaded.jambType, 'timber')
    assert.equal(loaded.jambFinishColor, 'paint-brown', 'Loading does not replace stored jamb color')
    assert.equal(loaded.glassFrameFinishId, 'paint-brown', 'Loading does not replace stored glass-frame color')
    assert.equal(loaded.glassFrameColorMode, 'custom')
    const seen: string[] = []
    const pick = (name: string) => page.locator('.option-card').filter({ has: page.locator('strong').filter({ hasText: new RegExp(`^${name}$`) }) }).click()
    for (let i = 0; i < 20 && await page.getByRole('button', { name: 'Next configuration step' }).count(); i++) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      const title = await page.locator('.step-heading h1').innerText(); seen.push(title)
      if (title === 'Choose Your Door Finish') {
        for (const color of ['White', 'Black', 'White']) {
          await pick(color)
          await page.waitForFunction(({ jambEnabled, glassEnabled, color }) => { const value = JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration; return (jambEnabled || value.jambFinishColor === `paint-${color}`) && (glassEnabled || value.glassFrameFinishId === `paint-${color}` && value.glassFrameColorMode === 'match-door') }, { jambEnabled, glassEnabled, color: color.toLowerCase() })
        }
      }
      if (title === 'Choose Your Jamb Finish') await pick('Black')
      if (title === 'Choose Your Jamb Type') {
        await page.locator('.option-card').filter({ has: page.locator('strong').filter({ hasText: /^Clad/ }) }).click()
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.jambType), 'clad')
        await page.locator('.option-card').filter({ has: page.locator('strong').filter({ hasText: /^Timber/ }) }).click()
      }
      if (title === 'Choose Glass Frame Color') await pick('Black')
      await page.getByRole('button', { name: 'Next configuration step' }).click(); await page.waitForTimeout(150)
    }
    await page.getByRole('heading', { name: 'Configuration Summary' }).waitFor()
    assert.equal(seen.includes('Choose Your Jamb Finish'), jambEnabled)
    assert.equal(seen.includes('Choose Your Jamb Type'), materialEnabled)
    assert.equal(seen.includes('Choose Glass Frame Color'), glassEnabled)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.equal(saved.jambFinishColor, jambEnabled ? 'paint-black' : 'paint-white')
    assert.equal(saved.glassFrameFinishId, glassEnabled ? 'paint-black' : 'paint-white')
    await page.getByRole('navigation', { name: 'Configuration progress' }).getByRole('button', { name: 'Finish' }).click()
    await pick('Black')
    await page.waitForTimeout(200)
    const changed = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.equal(changed.jambFinishColor, 'paint-black')
    assert.equal(changed.glassFrameFinishId, 'paint-black')
    // Return the door to White: enabled manual Black overrides must survive.
    await pick('White'); await page.waitForTimeout(200)
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.equal(restored.jambFinishColor, jambEnabled ? 'paint-black' : 'paint-white')
    assert.equal(restored.glassFrameFinishId, glassEnabled ? 'paint-black' : 'paint-white')
    if (!jambEnabled && !glassEnabled) {
      // Normal navigation intentionally requires Next after revisiting an
      // earlier step; hidden questions must not leave an empty screen.
      for (let i = 0; i < 20 && await page.getByRole('button', { name: 'Next configuration step' }).count(); i++) {
        await page.getByRole('button', { name: 'Next configuration step' }).click(); await page.waitForTimeout(150)
      }
      await page.getByRole('heading', { name: 'Configuration Summary' }).waitFor()
      await page.getByRole('button', { name: 'Launch Door Visualizer', exact: true }).click()
      await page.locator('input[type=file]').setInputFiles({ name: 'home.jpg', mimeType: 'image/jpeg', buffer: image })
      await page.getByText('AI Result', { exact: true }).waitFor()
      assert.equal(payload!.jambFinishId, 'paint-white'); assert.equal(payload!.glassFrameFinishId, 'paint-white')
      assert.equal(payload!.configuration.jambFinishColor, 'White'); assert.equal(payload!.configuration.glassFrameFinishColor, 'White')
      assert.equal(payload!.configuration.jambType, 'timber', 'AI receives the retained/default material field')
      assert.equal(await page.locator('.configured-door-capture-host .door-frame-svg-base stop').nth(1).getAttribute('stop-color'), '#EBEEE8')
      const reference = await sharp(Buffer.from(payload!.productReference.split(',')[1], 'base64')).raw().toBuffer({ resolveWithObject: true })
      const offset = (Math.floor(reference.info.height / 2) * reference.info.width + 20) * reference.info.channels
      assert.ok(reference.data[offset] > 200, 'Captured jamb is White')
    }
    console.log(`Flags material=${materialEnabled}, jamb=${jambEnabled}, glass=${glassEnabled}: loaded values, step visibility, White/Black matching, saved data, manual overrides and navigation passed.`)
    await page.close()
  }
  const fresh = await browser.newPage()
  await fresh.addInitScript('window.__name = (fn) => fn')
  await fresh.goto('http://127.0.0.1:5197/')
  await fresh.getByRole('button', { name: 'Start Building', exact: true }).click()
  await fresh.locator('.option-card').filter({ has: fresh.locator('strong').filter({ hasText: /^Single Door$/ }) }).click()
  await fresh.waitForFunction(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft') ?? 'null')?.configuration.jambType === 'timber')
  assert.equal(await fresh.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.selectedDoorConfigurationType), 'single', 'New configuration stores its Timber default after a normal entry selection')
  await fresh.close()
  const legacy = await browser.newPage()
  await legacy.addInitScript(value => localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value)), { ...draft, configuration: { ...draft.configuration, jambType: 'clad', jambFinishType: 'clad' } })
  await legacy.goto('http://127.0.0.1:5197/')
  await legacy.locator('.home-app').waitFor()
  const legacyValues = await legacy.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
  assert.equal(legacyValues.jambType, 'clad', 'Valid stored Clad material is not forced to Timber')
  assert.equal(legacyValues.jambFinishColor, 'paint-brown')
  assert.equal(legacyValues.glassFrameFinishId, 'paint-brown')
  await legacy.close()
  console.log('Fresh Timber default and stored Clad/material/color preservation passed.')
} finally { await browser?.close(); server.kill('SIGTERM') }
