import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { sortByDisplayLabel } from '../src/utils/sortByDisplayLabel'
import { doorStyles, hardwareOptions } from '../src/data/options'

const source = Object.freeze([{ id: 'z', label: ' rain ' }, { id: 'b', label: 'Clear' }, { id: 'a', label: 'clear' }, { id: 'x', label: 'Bristol' }])
assert.deepEqual(sortByDisplayLabel(source, item => item.label).map(item => item.id), ['x', 'b', 'a', 'z'])
assert.equal(source[0].id, 'z', 'Sorting never changes original defaults')
assert.equal(sortByDisplayLabel(source, item => item.label)[1], source[1], 'Option objects/IDs are preserved')
assert.deepEqual(sortByDisplayLabel(['12 Lite', '4 Lite', '8 Lite'], item => item), ['4 Lite', '8 Lite', '12 Lite'])
assert.deepEqual(sortByDisplayLabel(source.filter(item => item.id !== 'x'), item => item.label).map(item => item.id), ['b', 'a', 'z'], 'Filtering stays authoritative')
const app = await readFile('src/App.tsx', 'utf8')
for (const list of ['availableDoorLines', 'signatureGrainOptions', 'visibleSideliteStyleOptions', 'visibleFinishes', 'jambFinishOptions', 'availableGlassCategories', 'visibleGlassFrameFinishes', 'availableGridLocations', 'availableSideliteGridLocations', 'glassOptionGroups', 'sideliteGlassOptionGroups', 'lowEGridStyles', 'compatibleGridColors', 'fslGridStyles', 'fslColors', 'hardwareStyleGroups', 'doorStyles']) {
  assert.ok(app.includes(`sortByDisplayLabel(${list},`), `${list} is sorted only at presentation`)
}
for (const list of ['doorConfigurationOptions', 'sideliteOptions', 'doorSwingOptions', 'doubleDoorLockPrepOptions', 'compatibleGridPatterns', 'compatibleGridWidths', 'fslPatterns', 'fslWidths']) assert.ok(app.includes(`${list}.map(`), `${list} retains intentional order`)

const draft = { version: 1, configuration: { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'F1')!.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'both-sides', sideliteStyleId: 'ssl', selectedFinishType: 'paint', selectedPaint: 'paint-black', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-black', hardwareId: hardwareOptions.at(-1)!.id, doorSwingId: 'LHI' } }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5195', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5195')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 390]) {
    for (const code of ['F1', 'F']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    const scenario = { ...draft, configuration: { ...draft.configuration, styleId: doorStyles.find(item => item.code === code)!.id } }
    await page.addInitScript(value => { localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value)); (window as unknown as { __name: (fn: unknown) => unknown }).__name = fn => fn }, scenario)
    await page.goto('http://127.0.0.1:5195/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    await page.getByRole('button', { name: 'Next configuration step' }).waitFor()
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.equal(restored.hardwareId, draft.configuration.hardwareId)
    assert.equal(restored.styleId, scenario.configuration.styleId)
    assert.equal(restored.selectedPaint, 'paint-black')
    const visited: string[] = []
    for (let i = 0; i < 30 && await page.getByRole('button', { name: 'Next configuration step' }).count(); i++) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      const heading = await page.locator('.step-heading h1').innerText()
      visited.push(heading)
      if (code === 'F' && /Glass Type$/.test(heading)) {
        const decorative = page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: /^Decorative Glass$/ }) })
        if (await decorative.count()) await decorative.click()
      }
      if (!/Door Configuration|Entry Type|Sidelites$|Door Swing|Lock Setup|Grid Pattern|Grid Width|Bar Size/i.test(heading)) {
        const labels = await page.locator('.builder-options-scroll .option-card strong, .builder-options-scroll .hardware-card-main strong').allTextContents()
        assert.deepEqual(labels, sortByDisplayLabel(labels, item => item), `${width}px ${heading} A–Z`)
      }
      if (/Hardware/.test(heading)) {
        for (const card of await page.locator('.hardware-option-card').all()) {
          const finishes = await card.locator('.hardware-finish-options button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')!))
          assert.deepEqual(finishes, sortByDisplayLabel(finishes, item => item))
        }
        assert.equal(await page.locator('.hardware-finish-options button.selected').count(), 1, 'Restored selection remains selected')
      }
      const firstOption = page.locator('.builder-options-scroll button').first()
      if (await firstOption.count()) {
        await firstOption.focus()
        assert.ok(await firstOption.evaluate(button => button === document.activeElement), 'Options remain keyboard focusable')
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'No viewport overflow')
      await page.getByRole('button', { name: 'Next configuration step' }).click()
      await page.waitForTimeout(150)
    }
    await page.getByRole('heading', { name: 'Configuration Summary' }).waitFor()
    assert.ok(visited.some(label => /Glass Type/.test(label)), 'Glass family screen exercised')
    assert.ok(visited.some(label => /Hardware/.test(label)), 'Hardware screen exercised')
    if (code === 'F') assert.ok(visited.includes('Choose Main Door Glass Type'), 'Main-door glass families exercised')
    console.log(`${width}px ${code}: ${visited.join(' → ')}`)
    await page.close()
    }
  }
  console.log('Display sorting, stable ties, nonmutation, numeric labels, filtering, saved selections and desktop/mobile builder passed.')
} finally { await browser?.close(); server.kill('SIGTERM') }
