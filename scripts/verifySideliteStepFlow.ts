import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { doorStyles, hardwareOptions } from '../src/data/options'
import { doorHandingSides } from '../src/data/doorHanding'

const draft = { version: 1, configuration: { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'F1')!.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'hinge-side', sideliteStyleId: 'ssl', sideliteGlassCategory: 'clear', sideliteGlassId: 'clear-no-grids', sideliteGlassGroupKey: 'clear-glass-with-no-grids', sideliteGlassVariantConfirmed: true, selectedFinishType: 'paint', selectedPaint: 'paint-black', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-black', glassFrameColorMode: 'match-door', hardwareId: '', doorSwingId: '' } }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5199', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5199')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  await page.addInitScript(value => { localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value)); (window as unknown as { __name: (fn: unknown) => unknown }).__name = fn => fn }, draft)
  await page.goto('http://127.0.0.1:5199/')
  await page.getByRole('button', { name: 'Start Building', exact: true }).click()
  await page.getByRole('button', { name: 'Next configuration step' }).waitFor()
  assert.equal(await page.locator('aside .door-frame').getAttribute('data-sidelites'), 'none', 'Hinge intent is not resolved before handing')
  assert.match((await page.locator('aside .hardware img').getAttribute('src'))!, /georgian/i)
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.hardwareId), '', 'Temporary Georgian is not saved as selected hardware')
  await page.getByRole('button', { name: 'Next configuration step' }).click()
  await page.getByRole('heading', { name: 'Choose Your Sidelites' }).waitFor()
  await page.getByRole('button', { name: 'Next configuration step' }).click()
  await page.getByRole('heading', { name: 'Choose Your Door Swing' }).waitFor()
  const labels = await page.getByRole('navigation', { name: 'Configuration progress' }).locator('em').allTextContents()
  assert.deepEqual(labels.slice(0, 4), ['Entry Type', 'Sidelites', 'Door Swing', 'Door'])
  for (const handing of ['RHI', 'LHI', 'LHO', 'RHO'] as const) {
    await page.locator('.option-card').filter({ has: page.locator('strong').filter({ hasText: new RegExp(`^${handing}`) }) }).click()
    assert.equal(await page.locator('aside .door-frame').getAttribute('data-sidelites'), doorHandingSides(handing).hingeSide)
  }
  await page.getByRole('button', { name: 'Previous configuration step' }).click()
  await page.getByRole('heading', { name: 'Choose Your Sidelites' }).waitFor()
  await page.locator('.option-card').filter({ has: page.locator('strong').filter({ hasText: /^Lock Side$/ }) }).click()
  assert.equal(await page.locator('aside .door-frame').getAttribute('data-sidelites'), doorHandingSides('RHO').lockSide)
  await page.getByRole('button', { name: 'Next configuration step' }).click()
  await page.getByRole('heading', { name: 'Choose Your Door Swing' }).waitFor()
  await page.getByRole('button', { name: 'Next configuration step' }).click()
  await page.getByRole('heading', { name: 'Choose a Door Style' }).waitFor()
  for (let i = 0; i < 20 && await page.getByRole('button', { name: 'Next configuration step' }).count(); i++) {
    if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
    assert.ok((await page.locator('.step-heading h1').innerText()).trim(), 'No blank step')
    await page.getByRole('button', { name: 'Next configuration step' }).click(); await page.waitForTimeout(120)
  }
  await page.getByRole('heading', { name: 'Configuration Summary' }).waitFor()
  assert.equal(await page.locator('.summary-row').filter({ hasText: 'Sidelite Configuration' }).locator('strong').innerText(), 'Lock Side')
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
  assert.equal(saved.sidelites, 'lock-side'); assert.equal(saved.doorSwingId, 'RHO')
  await page.close()
  const legacy = await browser.newPage()
  await legacy.addInitScript(value => localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value)), { ...draft, configuration: { ...draft.configuration, hardwareId: hardwareOptions[0].id, doorSwingId: 'RHI' } })
  await legacy.goto('http://127.0.0.1:5199/')
  await legacy.getByRole('button', { name: 'Start Building', exact: true }).click()
  await legacy.getByRole('button', { name: 'Next configuration step' }).waitFor()
  const restored = await legacy.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
  assert.equal(restored.hardwareId, hardwareOptions[0].id); assert.equal(restored.sidelites, 'hinge-side')
  await legacy.close()
  console.log('Real builder: early handing, Back/Next, moving sidelites, semantic review/draft, temporary Georgian and saved-hardware preservation passed.')
} finally { await browser?.close(); server.kill('SIGTERM') }
