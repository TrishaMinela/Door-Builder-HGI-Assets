import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { doorHandingSides } from '../src/data/doorHanding'
import { resolveSidelitePosition, sideliteProductCode, normalizeLegacySidelite } from '../src/data/sideliteConfigurations'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import { resolveAiProduct, aiStructuralInstructionBlock } from '../server/aiDoorVisualization'
import { loadDoorBuilderDraft } from '../src/utils/doorBuilderDraft'
const mappings = { LHI: ['left', 'right'], LHO: ['right', 'left'], RHI: ['right', 'left'], RHO: ['left', 'right'] } as const
for (const handing of ['LHI', 'LHO', 'RHI', 'RHO'] as const) {
  const [hinge, lock] = mappings[handing]
  assert.deepEqual(doorHandingSides(handing), { hingeSide: hinge, lockSide: lock })
  for (const view of ['Exterior', 'Interior'] as const) {
    for (const relationship of ['none', 'both-sides', 'hinge-side', 'lock-side'] as const) {
      const sides = doorHandingSides(handing, view)
      const expected = relationship === 'none' ? 'none' : relationship === 'both-sides' ? 'both' : relationship === 'hinge-side' ? sides.hingeSide : sides.lockSide
      assert.equal(resolveSidelitePosition({ relationship, handing, view }), expected)
    }
  }
  for (const relationship of ['hinge-side', 'lock-side'] as const) {
    const physical = relationship === 'hinge-side' ? hinge : lock
    assert.equal(sideliteProductCode(relationship, handing), physical === 'left' ? 'LEFTSIDE' : 'RIGHTSIDE')
    const configuration = { ...aiTestConfiguration, sidelites: relationship, doorSwing: { ...aiTestConfiguration.doorSwing, id: handing }, sideliteSlab: 'ssl' as const }
    const payload = buildDoorBuilderSubmissionPayload({ contact: { fullName: 'Test User', email: 'test@example.com', phone: '', zip: '', notes: '' }, configuration })
    assert.equal(payload.sidelite_placement, `Sidelite on ${physical === 'left' ? 'Left' : 'Right'}`)
    const product = resolveAiProduct(configuration)
    assert.ok(aiStructuralInstructionBlock(product.snapshot).includes(`sidelite_structure: ${physical}`))
  }
  for (const code of ['LEFTSIDE', 'RIGHTSIDE'] as const) {
    const relationship = normalizeLegacySidelite(code, handing)
    assert.equal(sideliteProductCode(relationship, handing), code, 'Legacy physical codes retain their physical placement')
    const draft = loadDoorBuilderDraft({ getItem: () => JSON.stringify({ version: 1, configuration: { sidelites: code, doorSwingId: handing, hardwareId: aiTestConfiguration.hardware.id } }), setItem() {}, removeItem() {} })!
    assert.equal(draft.sidelites, relationship); assert.equal(draft.hardwareId, aiTestConfiguration.hardware.id)
  }
}
assert.equal(resolveSidelitePosition({ relationship: 'hinge-side' }), null, 'No premature physical side before handing')
assert.equal(resolveSidelitePosition({ relationship: 'lock-side' }), null)
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5198', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5198')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  await page.addInitScript('window.__name = (fn) => fn')
  await page.goto('http://127.0.0.1:5198/scripts/sideliteHandingHarness.html')
  assert.equal(await page.locator('[data-test-view="Exterior"] .door-frame').getAttribute('data-sidelites'), 'none')
  let previousCapture = ''
  for (const handing of ['LHI', 'LHO', 'RHI', 'RHO'] as const) for (const relationship of ['none', 'both-sides', 'hinge-side', 'lock-side'] as const) {
    await page.getByRole('button', { name: handing, exact: true }).click()
    await page.getByRole('button', { name: relationship, exact: true }).click()
    for (const view of ['Exterior', 'Interior'] as const) {
      assert.equal(await page.locator(`[data-test-view="${view}"] .door-frame`).getAttribute('data-sidelites'), resolveSidelitePosition({ relationship, handing, view }))
      assert.equal(await page.locator(`[data-test-view="${view}"] .hardware`).getAttribute('data-hardware-side'), doorHandingSides(handing, view).lockSide)
    }
    await page.locator(`img[data-capture="${relationship}:${handing}"]`).waitFor()
    await page.waitForFunction(previous => { const image = document.querySelector<HTMLImageElement>('img[data-capture]'); return image && image.src !== previous && image.complete }, previousCapture)
    previousCapture = (await page.locator('img[data-capture]').getAttribute('src'))!
    const result = await page.evaluate(() => (window as unknown as { renderHandingPdf: () => Promise<{ geometry: { hasLeft: boolean; hasRight: boolean } }> }).renderHandingPdf())
    const side = resolveSidelitePosition({ relationship, handing })
    assert.equal(result.geometry.hasLeft, side === 'left' || side === 'both')
    assert.equal(result.geometry.hasRight, side === 'right' || side === 'both')
  }
  console.log('32 relationship/handing/view mappings, changing handing/relationship, Both views, capture, PDF, AI values, submissions and legacy drafts passed.')
} finally { await browser?.close(); server.kill('SIGTERM') }
