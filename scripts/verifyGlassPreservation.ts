import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles, glassOptions } from '../src/data/options'
import { fslGlassOptions } from '../src/data/fslGlass'
import { cr14slGlassOptions } from '../src/data/cr14slGlass'
import { isCustomerSelectableGlass } from '../src/data/customerGlassAvailability'
import { isGlassFamilyCompatible } from '../src/data/glassFamilyCompatibility'
import { clearGlassOption, retainGlassSelection } from '../src/utils/retainGlassSelection'
import { glassDisplayName } from '../src/data/productDisplayNames'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import { aiTestConfiguration } from './aiVisualizerFixture'

const allowed = <T extends { id: string; name: string }>(options: T[], line = 'signature-series') => options.filter(option => isCustomerSelectableGlass(option) && isGlassFamilyCompatible(option, line))
assert.equal(retainGlassSelection(fslGlassOptions.find(x => x.id === 'par'), allowed(cr14slGlassOptions))?.id, 'paris', 'Verified Paris declarations bridge opening-specific IDs')
assert.equal(retainGlassSelection(fslGlassOptions.find(x => x.id === 'cob'), allowed(cr14slGlassOptions, '20-gauge-smooth-steel'))?.id, 'clear', 'Restricted families fall back to Clear')
assert.equal(retainGlassSelection(glassOptions.find(x => x.id === 'dorian-nickel'), [{ id: 'different', name: 'Dorian - Patina' }, { id: 'clear', name: 'Clear Glass' }])?.id, 'clear', 'Never substitute another caming variant')
assert.equal(clearGlassOption([{ id: 'a', name: 'Alphabetical First' }]), undefined, 'No invented Clear or alphabetical fallback')
assert.equal(retainGlassSelection(glassOptions.find(x => x.id === 'rain'), [])?.id, undefined, 'No-glass openings clear safely')
for (const code of ['F', 'F48', 'S', 'CR14', 'HRT', 'SAT', 'FRT', 'SW']) {
  assert.ok(clearGlassOption(glassOptions.filter(option => Boolean(option.overlaysByDoorStyle[code]))), `${code} resolves an authored Clear option`)
}
assert.equal(clearGlassOption(glassOptions.filter(option => Boolean(option.overlaysByDoorStyle.CA))), undefined, 'CA has no declared Clear; do not invent availability')
for (const id of ['rain', 'oak-park', 'f-clear-no-grids']) {
  const glass = glassOptions.find(option => option.id === id)!
  const configuration = { ...aiTestConfiguration, glass, mainDoorGlass: glass }
  const payload = buildDoorBuilderSubmissionPayload({ configuration, contact: { fullName: 'Test User', email: 'test@example.com', phone: '', zip: '', notes: '' } })
  assert.ok(payload.main_door_glass.includes(glass.name), 'Submission uses the resolved selection, not a preview default')
}

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5224', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5224')) resolve() })
    server.once('error', reject)
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const scenarios = [
    { glass: 'oak-park', target: /^Signature Series/, expected: 'oak-park' },
    { glass: 'cobblestone', line: 'signature-series', grain: 'Cherry', target: /^Smooth Steel$/, expected: 'f-clear-no-grids', sideGlass: 'cob', expectedSide: 'clear-no-grids' },
    { glass: 'rain', target: /^Half Lite$/, step: 'style', expected: 'rain' },
    { glass: 'cadence', target: /^Craftsman Rectangle$/, step: 'style', expected: 'clear' },
    { glass: 'rain', target: /^Nine Panel$/, step: 'style', expected: '' },
    { glass: 'rain', target: /^Full Round Top$/, step: 'style', expected: 'frt-clear-f17rt' },
    { glass: 'rain', target: /^8 Panel Center Arch$/, step: 'style', expected: '' },
    { glass: 'rain', line: 'signature-series', grain: 'Cherry', target: /^Fir$/, step: 'grain', expected: 'rain', side: 'ssl', sideGlass: 'cad', expectedSide: 'clear' },
    { glass: 'rain', line: 'signature-series', grain: 'Cherry', target: /^Oak$/, step: 'grain', expected: 'rain', sideGlass: 'par', expectedSide: 'par' },
    { glass: 'rain', line: 'signature-series', grain: 'Fir', target: /^CR14SL$/, step: 'sidelite', expected: 'rain', sideGlass: 'par', expectedSide: 'paris' },
    { glass: 'rain', target: /^Brushed Smooth Fiberglass$/, expected: 'rain' },
    { glass: 'rain', target: /^Textured Fiberglass$/, expected: 'rain' },
    { glass: 'rain', target: /^Paintable and Stainable Steel$/, expected: 'rain' },
  ]
  for (const width of [1280, 390]) for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(configuration => {
      localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration }))
    }, { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(x => x.code === 'F')!.id,
      doorLineId: scenario.line ?? '20-gauge-smooth-steel', grainId: scenario.grain ?? '',
      glassId: scenario.glass, selectedGlassCategory: scenario.glass === 'rain' ? 'privacy' : 'decorative',
      sidelites: 'right', sideliteStyleId: scenario.side ?? 'fsl', sideliteGlassCategory: 'decorative',
      sideliteGlassId: scenario.sideGlass ?? 'par', doorSwingId: 'LHI' })
    await page.goto('http://127.0.0.1:5224/')
    await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
    for (let i = 0; i < 10 && await page.locator('.step-heading h1').innerText() !== 'Choose Your Door Line'; i++) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      await page.getByRole('button', { name: 'Next configuration step' }).click()
    }
    if (scenario.step === 'style') await page.getByRole('button', { name: 'Previous configuration step' }).click()
    if (scenario.step === 'grain' || scenario.step === 'sidelite') await page.getByRole('button', { name: 'Next configuration step' }).click()
    if (scenario.step === 'sidelite') await page.getByRole('button', { name: 'Next configuration step' }).click()
    await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: scenario.target }) }).click()
    await page.waitForTimeout(250)
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.equal(state.glassId, scenario.expected, `${width}px ${scenario.glass} → ${scenario.target}`)
    assert.equal(state.sideliteGlassId, scenario.expectedSide ?? 'par', 'Sidelite compatibility is independent')
    assert.equal(state.sidelites, 'right')
    assert.equal(state.doorSwingId, 'LHI')
    assert.deepEqual(errors, [])
    if (scenario.expected) {
      assert.ok(state.selectedGlassGroupKey, 'Retained glass remains visible as a selected group')
      assert.ok(state.selectedGlassCategory, 'Retained glass keeps its category')
      const selected = glassOptions.find(option => option.id === state.glassId)!
      assert.ok(selected.overlaysByDoorStyle, 'Resolved state contains destination artwork for shared output paths')
      assert.ok((await page.locator('.preview-scene').first().getAttribute('aria-label'))?.includes(glassDisplayName(selected.name)), 'Live preview agrees with the selected glass')
    }
    console.log(`${width}px: ${scenario.glass} → ${scenario.target}: ${state.glassId || 'no glass'}; sidelite ${state.sideliteGlassId}`)
    await page.close()
  }
  console.log('Glass preservation passed: desktop/mobile material, style, grain and sidelite changes; restricted/unavailable → Clear; no-glass; opening-specific IDs; no variant substitution.')
} finally { await browser?.close(); server.kill('SIGTERM') }
