import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import { doorStyles } from '../src/data/options'
import { assertDoorStyleCards } from './doorStyleCardAssertions'

const before = process.argv.includes('--before')
const output = '/private/tmp/hgi-compact-product-cards'
await mkdir(output, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5199', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5199')) resolve() })
    server.once('error', reject)
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [390, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(configuration => {
      localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration }))
      ;(window as unknown as { __name: (fn: unknown) => unknown }).__name = fn => fn
    }, { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(style => style.code === 'F')!.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'right', sideliteStyleId: 'ssl', doorSwingId: 'LHI' })
    await page.goto('http://127.0.0.1:5199/')
    await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
    const next = page.getByRole('button', { name: 'Next configuration step' })
    for (let step = 0; step < 10; step++) {
      const heading = await page.locator('.step-heading h1').innerText()
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      if (/Door Style/.test(heading) && !before) {
        await assertDoorStyleCards(page)
        await next.click()
        continue
      }
      if (/Door Style|Door Line|Sidelite Slab/.test(heading)) {
        await page.waitForTimeout(200)
        const metrics = await page.locator('[data-equal-product-grid]').first().evaluate(grid => {
          const css = (el: Element) => {
            const s = getComputedStyle(el), r = el.getBoundingClientRect()
            return { height: r.height, top: r.top, bottom: r.bottom, heightRule: s.height, minHeight: s.minHeight, flex: s.flex, order: s.order, padding: s.padding, margin: s.margin, aspectRatio: s.aspectRatio }
          }
          const s = getComputedStyle(grid)
          return { grid: { ...css(grid), rows: s.gridTemplateRows, autoRows: s.gridAutoRows, alignContent: s.alignContent }, cards: [...grid.children].map(card => {
            const visual = card.querySelector('.option-visual')!, copy = card.querySelector('.option-copy')!
            const title = card.querySelector('strong')!, titleCss = getComputedStyle(title)
            return { title: title.textContent, titleLines: title.getBoundingClientRect().height / parseFloat(titleCss.lineHeight), titleSize: parseFloat(titleCss.fontSize), titleWeight: titleCss.fontWeight, card: css(card), visual: css(visual), copy: css(copy), text: [...copy.children].map(el => ({ name: el.tagName, ...css(el) })) }
          }) }
        })
        const name = `${before ? 'before' : 'after'}-${width}-${heading.replace(/[^a-z0-9]+/gi, '-')}`
        await page.screenshot({ path: `${output}/${name}.png` })
        await writeFile(`${output}/${name}.json`, JSON.stringify(metrics, null, 2))
        console.log(`${name}: ${JSON.stringify({ grid: metrics.grid, first: metrics.cards[0] })}`)
        if (!before) {
          const heights = metrics.cards.map(item => item.card.height)
          assert.ok(Math.max(...heights) - Math.min(...heights) < 1, 'Shared height comes from tallest card')
          assert.equal(metrics.grid.alignContent, 'start', 'Rows do not fill the viewport')
          for (const item of metrics.cards) assert.ok(Math.abs(item.copy.top - item.visual.bottom) < 1, 'Copy directly follows thumbnail; spacing is its padding')
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No overflow')
          await page.setViewportSize({ width, height: 1400 })
          await page.waitForTimeout(200)
          const tallerViewportHeights = await page.locator('[data-equal-product-grid]').first().evaluate(grid => [...grid.children].map(card => card.getBoundingClientRect().height))
          assert.ok(tallerViewportHeights.every((height, i) => Math.abs(height - heights[i]) < 1), 'Cards never grow to fill a taller viewport')
          await page.setViewportSize({ width, height: 1000 })
        }
      }
      if (/Sidelite Slab/.test(heading)) break
      await next.click()
    }
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
