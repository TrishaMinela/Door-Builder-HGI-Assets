import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { doorStyles, finishes, hardwareOptions } from '../src/data/options'

const output = '/private/tmp/hgi-ssl-relief'
await mkdir(output, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5221', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5221')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto('http://127.0.0.1:5221/scripts/pdfRendererHarness.html')
  await page.waitForFunction(() => 'pdfFixtures' in window)
  const names = await page.evaluate(() => (window as unknown as { pdfFixtures: string[] }).pdfFixtures)
  for (const name of names.filter(name => name.startsWith('ssl-relief-'))) {
    const index = names.indexOf(name)
    const url = await page.evaluate(i => (window as unknown as { sslReliefSurface: (i: number) => Promise<string> }).sslReliefSurface(i), index)
    const bytes = Buffer.from(url.split(',')[1], 'base64')
    await writeFile(`${output}/${name}-surface.png`, bytes)
    const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true })
    const finish = finishes.find(f => f.id === (name.endsWith('dark-stain') ? 'stain-black-cherry' : `paint-${name.split('-').pop()}`))!
    const rgb = finish.color.slice(1).match(/../g)!.map(v => parseInt(v, 16))
    let unchanged = 0, low = 255, high = 0
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const p = (y * info.width + x) * info.channels
      if (rgb.every((v, c) => data[p + c] === v)) unchanged++
      if (x > info.width * .1 && x < info.width * .9 && y > info.height * .65 && y < info.height * .95) { low = Math.min(low, data[p]); high = Math.max(high, data[p]) }
      // Channel proportions retain hue; rounding is the only allowed error.
      for (let c = 1; c < 3; c++) assert.ok(Math.abs(data[p] * rgb[c] - data[p + c] * rgb[0]) <= rgb[0] + rgb[c], `${name}: hue preserved`)
    }
    assert.ok(unchanged > info.width * info.height * .1, `${name}: flat faces retain exact selected RGB`)
    assert.ok(high - low >= 5, `${name}: authored lower-panel relief is visible (${low}–${high})`)
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.evaluate(i => (window as unknown as { mountLiveFixture: (i: number) => Promise<unknown> }).mountLiveFixture(i), index)
      await page.locator('#live-preview').evaluate((el, size) => { el.style.width = `${size}px` }, Math.min(450, width - 32))
      await page.waitForTimeout(150)
      await page.locator('#live-preview .door-frame').screenshot({ path: `${output}/${name}-${width}-after.png` })
      const reference = await page.evaluate(() => (window as unknown as { captureSslReference: () => Promise<string> }).captureSslReference())
      await writeFile(`${output}/${name}-${width}-ai.png`, Buffer.from(reference.split(',')[1], 'base64'))
      // Reproduce the previous paint stack for a direct before/after review.
      if (finish.finishType === 'paint') {
        await page.locator('#live-preview .door-frame-sidelite-slot:has(.door-frame-sidelite-finish)').evaluateAll(slots => slots.forEach(slot => {
          const fill = slot.querySelector<HTMLElement>('.door-frame-sidelite-finish')!
          fill.style.backgroundImage = 'none'
          const detail = slot.querySelector<HTMLImageElement>('.door-frame-sidelite')!.cloneNode(true) as HTMLImageElement
          detail.className = 'door-frame-sidelite-detail'
          Object.assign(detail.style, { maskImage: fill.style.maskImage, webkitMaskImage: fill.style.webkitMaskImage, mixBlendMode: 'multiply', opacity: '.25', filter: 'grayscale(1) contrast(1.12)' })
          slot.append(detail)
          const frame = slot.querySelector<HTMLElement>('.door-frame-sidelite-glass-frame-tint')
          if (frame) frame.style.backgroundImage = 'none'
        }))
        await page.locator('#live-preview .door-frame').screenshot({ path: `${output}/${name}-${width}-before.png` })
      }
    }
    const pdf = await page.evaluate(i => (window as unknown as { renderFixture: (i: number) => Promise<{ dataUrl: string }> }).renderFixture(i), index)
    await writeFile(`${output}/${name}-pdf.png`, Buffer.from(pdf.dataUrl.split(',')[1], 'base64'))
    console.log(`${name}: selected hue/flat RGB preserved; panel range ${low}–${high}; desktop/mobile preview, exterior PDF render and AI captures saved`)
  }
  // Also inspect the actual responsive builder shell, not only the renderer harness.
  for (const width of [390, 1280]) for (const color of ['musket', 'wineberry', 'terratone', 'black', 'white']) {
    const ui = await browser.newPage({ viewport: { width, height: 900 } })
    await ui.addInitScript(configuration => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration })), {
      selectedDoorConfigurationType: 'single', styleId: doorStyles.find(s => s.code === 'N1')!.id,
      doorLineId: '20-gauge-smooth-steel', sidelites: 'right', sideliteStyleId: 'ssl', doorSwingId: 'LHI',
      selectedFinishType: 'paint', selectedPaint: `paint-${color}`, hardwareId: hardwareOptions[0].id,
      sideliteGlassCategory: 'clear', sideliteGlassId: 'clear-no-grids',
    })
    await ui.goto('http://127.0.0.1:5221/')
    await ui.getByRole('button', { name: 'Start Building', exact: true }).click()
    await ui.waitForFunction(() => [...document.querySelectorAll<HTMLElement>('.preview-scene')].some(el => el.getBoundingClientRect().width > 0 && el.dataset.renderSemanticallyReady === 'true'))
    await ui.screenshot({ path: `${output}/builder-${color}-${width}.png` })
    await ui.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
