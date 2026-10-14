import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles, finishes, hardwareOptions } from '../src/data/options'
import { assertCustomerFinish, UNSELECTED_FINISH } from '../src/utils/customerFinish'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import { generateSummaryPdf } from '../src/utils/pdf'
import { aiTestConfiguration } from './aiVisualizerFixture'
import submitHandler from '../api/submit-door-builder'

assert.throws(() => assertCustomerFinish(UNSELECTED_FINISH), /select a door finish/)
assert.throws(() => buildDoorBuilderSubmissionPayload({ contact: { fullName: 'Test', email: '', phone: '', zip: '', notes: '' }, configuration: { ...aiTestConfiguration, finish: UNSELECTED_FINISH } }), /select a door finish/)
assertCustomerFinish(finishes.find(finish => finish.id === 'paint-terratone'))
const explicit = finishes.find(finish => finish.id === 'paint-terratone')!
assert.equal(buildDoorBuilderSubmissionPayload({ contact: { fullName: 'Test', email: '', phone: '', zip: '', notes: '' }, configuration: { ...aiTestConfiguration, finish: explicit, doorFinishType: 'paint', doorFinishColor: explicit.name } }).door_finish_color, 'Terratone')
let status = 0
const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('Missing finish must not reach external services') }
try {
  await submitHandler({ method: 'POST', body: { full_name: 'Test', email: 'test@example.com', phone: '5551234567', postal_code: '12345', submissionId: 'c1950cf7-6273-4a5c-a0c8-4a531831d906', doorConfiguration: { schemaVersion: 1, configuration: { finish: UNSELECTED_FINISH } } } }, { status(code: number) { status = code; return this }, json() {}, setHeader() {} })
  assert.equal(status, 400)
} finally { globalThis.fetch = originalFetch }
const c = aiTestConfiguration
await assert.rejects(generateSummaryPdf({ fullName: 'Test', email: '', phone: '', zip: '', notes: '' }, c.product, c.style, c.grain, UNSELECTED_FINISH, c.glass, null, c.hardware, c.doorSwing, 'none', null, null, undefined, 'single', 'data:image/png;base64,invalid'), /select a door finish/)
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5216', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5216')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  const next = () => page.getByRole('button', { name: 'Next configuration step' }).click()
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
  const navigate = async (heading: string) => {
    for (let i = 0; i < 30 && !(await page.getByRole('heading', { name: heading, exact: true }).isVisible()); i++) {
      if (await page.getByRole('heading', { name: 'Choose Your Door Configuration', exact: true }).isVisible()) await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: /^Single Door$/ }) }).click()
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      if (await page.getByRole('button', { name: 'Next configuration step' }).isDisabled()) throw new Error(`Unexpected gate before ${heading}: ${await page.locator('.step-heading h1').innerText()}`)
      await next()
      await page.waitForTimeout(150)
    }
    await page.getByRole('heading', { name: heading, exact: true }).waitFor()
  }
  await page.goto('http://127.0.0.1:5216/')
  await page.getByRole('button', { name: 'Start Building', exact: true }).click()
  assert.equal((await saved()).selectedPaint, '', 'No finish assigned at startup')
  assert.equal((await saved()).selectedStain, '')
  assert.equal((await saved()).styleId, doorStyles.find(style => style.code === 'F')!.id, 'Full Lite initial default unchanged')
  await navigate('Choose Your Door Finish')
  const firstName = await page.locator('.builder-options-scroll .option-card strong').first().innerText()
  const firstState = await saved()
  const firstFinish = finishes.find(finish => finish.name === firstName && finish.finishType === firstState.selectedFinishType)!
  assert.equal((await saved()).selectedPaint, firstFinish.id)
  assert.equal((await saved()).selectedStain, '')
  assert.equal(await page.locator('.builder-options-scroll .option-card.selected strong').innerText(), firstName)
  assert.ok(await page.getByRole('button', { name: 'Next configuration step' }).isEnabled())
  assert.ok((await page.locator('aside').innerText()).includes(firstName))
  const defaultPayload = buildDoorBuilderSubmissionPayload({ contact: { fullName: 'Test', email: '', phone: '', zip: '', notes: '' }, configuration: { ...aiTestConfiguration, finish: firstFinish, doorFinishType: firstFinish.finishType, doorFinishColor: firstFinish.name } })
  assert.equal(defaultPayload.door_finish_color, firstName)
  await page.getByRole('tab', { name: 'Paint', exact: true }).click()
  await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: /^Terratone$/ }) }).click()
  assert.equal((await saved()).selectedPaint, 'paint-terratone')
  await next()
  await page.getByRole('button', { name: 'Previous configuration step' }).click()
  await page.getByRole('heading', { name: 'Choose Your Door Finish', exact: true }).waitFor()
  assert.equal((await saved()).selectedPaint, 'paint-terratone', 'Manual selection survives reentering Finish')
  assert.equal(await page.locator('.builder-options-scroll .option-card.selected strong').innerText(), 'Terratone')
  await navigate('Configuration Summary')
  assert.match(await page.locator('.summary-row').filter({ hasText: 'Door finish color' }).innerText(), /Terratone/)
  await page.reload()
  await page.getByRole('button', { name: 'Start Building', exact: true }).click()
  assert.equal((await saved()).selectedPaint, 'paint-terratone', 'Explicit saved finish survives reload')
  for (const [id, type, sourceLine, targetLine, retained] of [
    ['paint-terratone', 'paint', '20-gauge-smooth-steel', 'Brushed Smooth Fiberglass', true],
    ['stain-nutmeg', 'stain', 'signature-series', 'Smooth Steel', false],
  ] as const) {
    await page.evaluate(draft => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: draft })), {
      selectedDoorConfigurationType: 'single', styleId: doorStyles.find(style => style.code === 'F')!.id, doorLineId: sourceLine, grainId: sourceLine === 'signature-series' ? 'Cherry' : '',
      sidelites: 'none', doorSwingId: 'LHI', selectedFinishType: type, selectedPaint: type === 'paint' ? id : '', selectedStain: type === 'stain' ? id : '', hardwareId: hardwareOptions[0].id,
    })
    await page.reload()
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    await navigate('Choose Your Door Line')
    await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: new RegExp(`^${targetLine}$`) }) }).click()
    await page.waitForTimeout(100)
    assert.equal((await saved()).selectedPaint, retained ? id : '', 'Invalid selection clears upstream without assigning a default')
    await navigate('Choose Your Door Finish')
    const state = await saved()
    const displayedFirst = await page.locator('.builder-options-scroll .option-card strong').first().innerText()
    assert.equal(state.selectedPaint, retained ? id : finishes.find(finish => finish.finishType === 'paint' && finish.name === displayedFirst)!.id)
    assert.equal(state.selectedStain, '')
    assert.ok(await page.getByRole('button', { name: 'Next configuration step' }).isEnabled())
  }
  console.log('Startup stays blank/Full Lite; entering Finish selects displayed first color; manual/saved colors persist; incompatible material changes default only on entering Finish; placeholder exports remain blocked.')
  await page.close()
} finally { await browser?.close(); server.kill('SIGTERM') }
