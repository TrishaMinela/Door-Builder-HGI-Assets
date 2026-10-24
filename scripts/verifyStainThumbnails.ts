import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles } from '../src/data/options'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5208', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5208')) resolve() })
    server.once('error', reject)
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [390, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(styleId => {
      localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: {
        selectedDoorConfigurationType: 'single', styleId, doorLineId: '22-gauge-steel',
        sidelites: 'none', doorSwingId: 'LHI', selectedFinishType: 'stain', selectedStain: 'stain-nutmeg',
      } }))
    }, doorStyles.find(style => style.code === 'F')!.id)
    await page.goto('http://127.0.0.1:5208/')
    await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
    for (let i = 0; i < 15 && await page.locator('.step-heading h1').innerText() !== 'Choose Your Door Finish'; i++) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      await page.getByRole('button', { name: 'Next configuration step' }).click()
    }
    await page.locator('.finish-tile-image').first().waitFor()
    await page.waitForTimeout(200)
    const cards = await page.locator('.builder-options-scroll .option-card:has(.finish-tile-image)').evaluateAll(cards => cards.map(card => {
      const image = card.querySelector<HTMLImageElement>('.finish-tile-image')!
      const imageBox = image.getBoundingClientRect(), visual = card.querySelector('.option-visual')!.getBoundingClientRect()
      const style = getComputedStyle(image)
      return { height: card.getBoundingClientRect().height, fit: style.objectFit, position: style.objectPosition,
        image: [imageBox.x, imageBox.y, imageBox.width, imageBox.height], visual: [visual.x, visual.y, visual.width, visual.height] }
    }))
    assert.equal(cards.length, 21, 'All stain thumbnails are checked')
    for (const card of cards) {
      assert.equal(card.fit, 'cover'); assert.equal(card.position, '50% 50%')
      card.image.forEach((value, index) => assert.ok(Math.abs(value - card.visual[index]) < 1, 'Stain image fills the entire reserved card image region'))
      assert.ok(Math.abs(card.height - cards[0].height) < 1, 'Finish cards retain equal heights')
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await page.locator('.builder-options-scroll').screenshot({ path: `/tmp/stain-thumbnails-${width}.png` })
    console.log(`${width}px: 21 stain thumbnails use centered cover, fill the image region and retain equal card heights.`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
