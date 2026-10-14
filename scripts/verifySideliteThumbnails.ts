import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles } from '../src/data/options'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5213', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5213')) resolve() })
    server.once('error', reject)
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(styleId => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: {
      selectedDoorConfigurationType: 'single', styleId, doorLineId: '20-gauge-smooth-steel',
      sidelites: 'right', sideliteStyleId: 'ssl', selectedFinishType: 'paint', selectedPaint: 'paint-white', doorSwingId: 'LHI',
    } })), doorStyles.find(style => style.code === 'F1')!.id)
    await page.goto('http://127.0.0.1:5213/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    const next = () => page.getByRole('button', { name: 'Next configuration step' }).click()
    const back = () => page.getByRole('button', { name: 'Previous configuration step' }).click()
    const card = (label: string) => page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: new RegExp(`^${label}$`) }) })
    for (const [label, type, leaves] of [['Single Door', 'single', 1], ['French Door', 'french', 2], ['Single Door', 'single', 1]] as const) {
      await card(label).click()
      await next()
      const cards = page.locator('.builder-options-scroll .sidelite-catalog-card')
      assert.equal(await cards.count(), 4)
      await page.waitForFunction(() => [...document.querySelectorAll('.sidelite-layout-thumbnail .preview-scene')].every(element => element.getAttribute('aria-busy') === 'false'))
      const positions: string[] = []
      for (let i = 0; i < 4; i++) {
        const thumbnail = cards.nth(i).locator('.sidelite-layout-thumbnail')
        const frame = thumbnail.locator('.door-frame')
        assert.equal(await frame.getAttribute('data-door-configuration'), type)
        assert.equal(await frame.getAttribute('data-view'), 'Exterior')
        assert.equal(await frame.locator('.door-frame-door-slot > .door').count(), leaves)
        const position = (await frame.getAttribute('data-sidelites'))!
        positions.push(position)
        assert.equal(await frame.locator('.door-frame-sidelite').count(), position === 'both' ? 2 : position === 'none' ? 0 : 1)
        await page.waitForTimeout(100)
        const fits = await frame.evaluate(element => {
          const box = element.getBoundingClientRect(), area = element.closest('.option-visual')!.getBoundingClientRect()
          return box.left >= area.left - 1 && box.right <= area.right + 1 && box.top >= area.top - 1 && box.bottom <= area.bottom + 1
        })
        assert.ok(fits, `${width}px ${type} ${position} thumbnail fits`)
        await cards.nth(i).click()
        const main = page.locator(width === 1280 ? 'aside .door-frame' : '.mobile-live-preview .door-frame').first()
        assert.equal(await main.getAttribute('data-sidelites'), position)
        assert.equal(await main.locator('.door-frame-door-slot > .door').count(), leaves)
      }
      assert.deepEqual(positions.sort(), ['both', 'left', 'none', 'right'])
      await page.screenshot({ path: `/tmp/sidelite-thumbnails-${type}-${width}.png` })
      await back()
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow')
    console.log(`${width}px: all single/double arrangements, selection consistency and configuration switching passed`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
