import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles } from '../src/data/options'
import { existsSync } from 'node:fs'

const expectedAssets = {
  single: { 'No Sidelite': 'No Sidelites.webp', 'Both Sidelites': 'Both-Sides Sidelites.webp', Left: 'Lock-Side Sidelite.webp', Right: 'Hinge-Side Sidelite.webp' },
  french: { 'No Sidelite': 'Double Door No Side.webp', 'Both Sidelites': 'Double Door Both Sides.webp', 'Left Sidelite': 'Double Door Left Side.webp', 'Right Sidelite': 'Double Door Right Side.webp' },
}

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
      assert.equal(await cards.locator('.preview-scene').count(), 0, 'Options must be static images, not live door renders')
      const positions: string[] = []
      for (let i = 0; i < 4; i++) {
        const thumbnail = cards.nth(i).locator('.sidelite-option-image')
        const title = await cards.nth(i).locator('strong').innerText()
        const filename = expectedAssets[type][title as keyof typeof expectedAssets[typeof type]]
        assert.ok(filename, `Known ${type} layout: ${title}`)
        const asset = `/assets/hgi-assets/Sidelites/options/${filename}`
        assert.equal(await thumbnail.getAttribute('src'), asset)
        assert.ok(existsSync(`public${asset}`), `Existing asset: ${asset}`)
        await thumbnail.evaluate(image => new Promise<void>((resolve, reject) => {
          const img = image as HTMLImageElement
          if (img.complete) return img.naturalWidth > 0 ? resolve() : reject(new Error('Missing thumbnail'))
          img.onload = () => resolve(); img.onerror = () => reject(new Error('Missing thumbnail'))
        }))
        assert.equal(await thumbnail.evaluate(image => getComputedStyle(image).transform), 'none', 'Static assets retain exterior left/right orientation')
        const position = title === 'No Sidelite' ? 'none' : title === 'Both Sidelites' ? 'both' : title.startsWith('Left') ? 'left' : 'right'
        positions.push(position)
        await page.waitForTimeout(100)
        const fits = await thumbnail.evaluate(element => {
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
