import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorHandingSides } from '../src/data/doorHanding'
import { normalizeLegacySidelite, sideliteProductCode, sideliteProductLabel } from '../src/data/sideliteConfigurations'
import { loadDoorBuilderDraft } from '../src/utils/doorBuilderDraft'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { resolveAiProduct } from '../server/aiDoorVisualization'
import { doorStyles, hardwareOptions } from '../src/data/options'

const hinges = { LHI: 'left', LHO: 'right', RHI: 'right', RHO: 'left' } as const
for (const [handing, hinge] of Object.entries(hinges)) for (const side of ['left', 'right'] as const) {
  const id = handing as keyof typeof hinges, code = hinge === side ? 'HINGESIDE' : 'LOCKSIDE'
  assert.equal(doorHandingSides(id, 'Exterior').hingeSide, hinge)
  assert.equal(sideliteProductCode(side, id, 'single'), code)
  const configuration = { ...aiTestConfiguration, doorConfigurationType: 'single' as const, sidelites: side, sideliteSlab: 'ssl' as const, doorSwing: { ...aiTestConfiguration.doorSwing, id } }
  const submission = buildDoorBuilderSubmissionPayload({ contact: { fullName: 'OSLI Test', email: '', phone: '', zip: '', notes: '' }, configuration })
  assert.equal(submission.sidelite_placement, sideliteProductLabel(side, id, 'single'))
  assert.ok(submission.sidelite_placement.startsWith(code))
  assert.equal(resolveAiProduct(configuration).snapshot.sidelites.placement, side)
  for (const type of ['french', 'savannah'] as const) assert.equal(sideliteProductCode(side, id, type), side === 'left' ? 'LEFTSIDE' : 'RIGHTSIDE')
  assert.equal(sideliteProductCode('none', id, 'single'), 'NOSIDE')
  assert.equal(sideliteProductCode('both-sides', id, 'single'), 'BOTHSIDES')
  const old = side === hinge ? 'hinge-side' : 'lock-side'
  const draft = loadDoorBuilderDraft({ getItem: () => JSON.stringify({ version: 1, configuration: { selectedDoorConfigurationType: 'single', sidelites: old, doorSwingId: id } }), setItem() {}, removeItem() {} })!
  assert.equal(draft.sidelites, side, 'Legacy single drafts preserve their exterior position')
  assert.equal(normalizeLegacySidelite(side, id, 'single'), side)
}
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5212', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5212')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(({ styleId, hardwareId }) => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: {
      selectedDoorConfigurationType: 'single', styleId, doorLineId: '20-gauge-smooth-steel', sidelites: 'right', sideliteStyleId: 'ssl',
      selectedFinishType: 'paint', selectedPaint: 'paint-white', sideliteGlassCategory: 'clear', sideliteGlassId: 'clear-no-grids', hardwareId, doorSwingId: 'LHI',
    } })), { styleId: doorStyles.find(style => style.code === 'F1')!.id, hardwareId: hardwareOptions[0].id })
    await page.goto('http://127.0.0.1:5212/')
    await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
    const next = () => page.getByRole('button', { name: 'Next configuration step' }).click()
    await next()
    assert.ok(await page.locator('.builder-options-scroll').getByText('Left', { exact: true }).count())
    assert.ok(await page.locator('.builder-options-scroll').getByText('Right', { exact: true }).count())
    for (const side of ['left', 'right'] as const) {
      await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: side === 'left' ? /^Left$/ : /^Right$/ }) }).click()
      await next()
      for (const id of ['LHI', 'RHI', 'LHO', 'RHO'] as const) {
        await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: new RegExp(`^${id} `) }) }).click()
        const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
        assert.equal(state.sidelites, side, 'Changing swing does not change the chosen exterior sidelite position')
        assert.equal(sideliteProductCode(state.sidelites, state.doorSwingId, 'single'), hinges[id] === side ? 'HINGESIDE' : 'LOCKSIDE')
        const preview = page.locator(width === 1280 ? 'aside .preview-scene' : '.mobile-live-preview .preview-scene').first()
        assert.equal(await preview.locator('.door-frame').getAttribute('data-sidelites'), side)
        assert.equal(await preview.locator('.hardware').getAttribute('data-hardware-side'), doorHandingSides(id, 'Exterior').lockSide)
      }
      await page.getByRole('button', { name: 'Previous configuration step' }).click()
    }
    console.log(`${width}px: fixed Left/Right sidelites, all four swing definitions, recomputed codes and exterior hardware positions passed.`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
