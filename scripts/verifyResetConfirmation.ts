import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles, hardwareOptions } from '../src/data/options'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5220', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5220')) resolve() })
    server.once('error', reject)
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [320, 390, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    let browserDialogs = 0
    page.on('dialog', dialog => { browserDialogs++; void dialog.dismiss() })
    await page.addInitScript(configuration => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration })), {
      selectedDoorConfigurationType: 'single', styleId: doorStyles.find(style => style.code === 'N1')!.id,
      doorLineId: '20-gauge-smooth-steel', sidelites: 'right', sideliteStyleId: 'ssl',
      sideliteGlassCategory: 'clear', sideliteGlassId: 'clear-no-grids', selectedFinishType: 'paint',
      selectedPaint: 'paint-clay', hardwareId: hardwareOptions[0].id, doorSwingId: 'RHI',
    })
    await page.goto('http://127.0.0.1:5220/')
    await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
    await page.waitForTimeout(250)
    const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    const original = await state()
    const trigger = page.locator('.preview-reset-design:visible').first()
    const modal = page.getByRole('dialog', { name: 'Start over?', exact: true })
    for (const cancel of ['Keep editing', 'Escape', 'Backdrop']) {
      await trigger.click()
      await modal.waitFor()
      assert.match(await modal.innerText(), /This will clear your current door selections so you can build a new configuration\./)
      assert.equal(await modal.getByRole('button').count(), 2)
      assert.ok(await modal.getByRole('button', { name: 'Keep editing' }).evaluate(el => el === document.activeElement), 'Safe initial focus')
      await page.keyboard.press('Shift+Tab')
      assert.ok(await modal.getByRole('button', { name: 'Start over', exact: true }).evaluate(el => el === document.activeElement), 'Reverse focus wrap')
      await page.keyboard.press('Tab')
      assert.ok(await modal.getByRole('button', { name: 'Keep editing' }).evaluate(el => el === document.activeElement), 'Forward focus wrap')
      await modal.locator('p').click()
      assert.ok(await modal.isVisible(), 'Inside clicks do not dismiss')
      await page.screenshot({ path: `/private/tmp/hgi-reset-modal-${width}.png` })
      if (cancel === 'Keep editing') await modal.getByRole('button', { name: 'Keep editing' }).click()
      else if (cancel === 'Escape') await page.keyboard.press('Escape')
      else await page.mouse.click(2, 2)
      await modal.waitFor({ state: 'hidden' })
      assert.deepEqual(await state(), original, `${cancel} preserves all configuration values`)
      assert.ok(await trigger.evaluate(el => el === document.activeElement), `${cancel} restores trigger focus`)
    }
    await trigger.click()
    await modal.getByRole('button', { name: 'Start over', exact: true }).click()
    await modal.waitFor({ state: 'hidden' })
    await page.waitForTimeout(250)
    const reset = await state()
    assert.equal(reset.styleId, doorStyles.find(style => style.code === 'F')!.id, 'Original Full Lite starting default')
    assert.equal(reset.selectedPaint, '')
    assert.equal(reset.hardwareId, '')
    assert.equal(reset.sideliteStyleId, '')
    assert.equal(await page.locator('.step-heading h1').innerText(), 'Choose Your Door Configuration')
    assert.equal(browserDialogs, 0, 'No browser confirmation used')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    console.log(`${width}px: button/Escape/backdrop cancel, focus trapping/restoration, unchanged selections, and confirmed reset defaults passed`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
