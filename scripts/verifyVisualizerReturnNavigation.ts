import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import sharp from 'sharp'
import { hardwareOptions, doorStyles } from '../src/data/options'

const draft = { version: 1, configuration: { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'F1')!.id, doorLineId: '20-gauge-smooth-steel', grainId: '', sidelites: 'none', selectedFinishType: 'paint', selectedPaint: 'paint-black', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-black', jambFinishOverridden: true, glassFrameColorMode: 'match-door', hardwareId: hardwareOptions[0].id, doorSwingId: 'LHI' } }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5195', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5195')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  await page.addInitScript(value => { localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value)); (window as unknown as { __name: (fn: unknown) => unknown }).__name = fn => fn }, draft)
  await page.route('**/api/detect-entrance-structure', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ detection: { doorStructure: 'double', sidelites: 'none', transom: false, widthClass: 'wide', structurallyWide: true, confidence: .96, summary: 'Double doors.' } }) }))
  let generations = 0
  await page.route('**/api/generate-door-visualization', async route => { generations++; await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }) })
  await page.goto('http://127.0.0.1:5195/')
  await page.getByRole('button', { name: 'Start Building', exact: true }).click()
  await page.waitForTimeout(250)
  if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
  await page.getByRole('button', { name: 'Next configuration step' }).waitFor()
  assert.equal(await page.locator('.saved-door-visualizer-action').count(), 0, 'Restored drafts do not expose an early shortcut')
  for (let i = 0; i < 15 && await page.getByRole('button', { name: 'Next configuration step' }).count(); i++) {
    console.log('Configuration page:', await page.locator('.step-heading h1').innerText())
    if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
    assert.equal(await page.locator('.saved-door-visualizer-action').count(), 0)
    await page.getByRole('button', { name: 'Next configuration step' }).click()
    await page.waitForTimeout(120)
  }
  await page.getByRole('heading', { name: 'Configuration Summary' }).waitFor()
  await page.getByRole('button', { name: 'Launch Door Visualizer', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({ name: 'home.jpg', mimeType: 'image/jpeg', buffer: await sharp({ create: { width: 800, height: 600, channels: 3, background: '#cccccc' } }).jpeg().toBuffer() })
  await page.getByRole('dialog').getByRole('button', { name: 'Review Configuration' }).click()
  await page.getByRole('heading', { name: 'Configuration Summary' }).waitFor()
  await page.getByRole('navigation', { name: 'Configuration progress' }).getByRole('button', { name: 'Finish' }).click()
  const shortcut = page.locator('.saved-door-visualizer-action').getByRole('button', { name: 'Return to Visualizer' })
  assert.equal(await shortcut.isVisible(), true)
  await page.locator('.option-card').filter({ has: page.locator('strong').filter({ hasText: /^White$/ }) }).click()
  assert.equal(await shortcut.isEnabled(), true, 'Current complete configuration remains visualizer-ready')
  await shortcut.click()
  await page.getByRole('heading', { name: 'Add your house photo' }).waitFor()
  await page.waitForFunction(() => document.querySelector('.configured-door-capture-host .preview-scene')?.getAttribute('data-render-configuration-key')?.includes('paint-white'))
  await page.getByRole('button', { name: 'Back to Door Builder', exact: true }).click()
  assert.equal(await page.locator('.saved-door-visualizer-action').count(), 0, 'Return flag clears upon entering Visualizer')
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await page.getByRole('button', { name: 'Start Building', exact: true }).click()
  assert.equal(await page.locator('.saved-door-visualizer-action').count(), 0, 'New normal session has no shortcut')
  await page.reload()
  await page.getByRole('button', { name: 'Start Building', exact: true }).click()
  if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
  assert.equal(await page.locator('.saved-door-visualizer-action').count(), 0, 'Refresh does not retain a stale return flag')
  assert.equal(generations, 0, 'Incompatible test entrance never generates')
  console.log('Normal/restored builder, Visualizer review, updated configuration return, flag clearing, new session and refresh checks passed.')
} finally { await browser?.close(); server.kill('SIGTERM') }
