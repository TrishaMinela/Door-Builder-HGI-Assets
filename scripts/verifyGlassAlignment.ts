import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5191', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5191')) resolve() })
    server.once('error', reject)
    server.once('exit', code => reject(new Error(`Vite exited ${code}`)))
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.addInitScript('window.__name = (fn) => fn')
    await page.goto('http://127.0.0.1:5191/scripts/glassAlignmentHarness.html')
    await page.waitForFunction(() => [...document.querySelectorAll('.preview-scene')].length === 5 && [...document.querySelectorAll('.preview-scene')].every(scene => scene.getAttribute('data-render-semantically-ready') === 'true'), { timeout: 60000 })
    const result = await page.evaluate(() => [...document.querySelectorAll('.door-glass-assembly,.door-frame-sidelite-glass-assembly')].map(wrapper => {
      const main = wrapper.classList.contains('door-glass-assembly')
      const frame = wrapper.querySelector<HTMLElement>(main ? '.door-glass-frame-material' : '.door-frame-sidelite-glass-frame-material')!
      const glass = wrapper.querySelector<HTMLElement>(main ? '.door-glass-overlay' : '.door-frame-sidelite-glass')!
      const mask = main ? glass : wrapper.querySelector<HTMLElement>('.door-frame-sidelite-glass-clip')!
      const rect = (element: Element) => { const r = element.getBoundingClientRect(); return [r.x, r.y, r.width, r.height] }
      return { code: wrapper.closest('[data-fixture]')!.getAttribute('data-fixture'), main, frame: rect(frame), glass: rect(glass), frameFit: getComputedStyle(frame).objectFit, glassFit: getComputedStyle(glass).objectFit, frameMask: getComputedStyle(frame).maskSize, glassMask: getComputedStyle(mask).maskSize, frameTransform: getComputedStyle(frame).transform, glassTransform: getComputedStyle(glass).transform }
    }))
    assert.equal(result.length, 7)
    for (const item of result) {
      assert.equal(item.frameFit, 'fill', JSON.stringify(item))
      assert.equal(item.glassFit, 'fill', JSON.stringify(item))
      assert.equal(item.frameMask, '100% 100%', JSON.stringify(item))
      if (item.code !== 'SAT') assert.equal(item.glassMask, '100% 100%', JSON.stringify(item))
      item.frame.forEach((value, index) => assert.ok(Math.abs(value - item.glass[index]) < 1, JSON.stringify(item)))
      assert.equal(item.frameTransform, item.glassTransform, JSON.stringify(item))
    }
    await page.locator('[data-fixture="F"]').screenshot({ path: `/tmp/glass-alignment-${width}.png` })
    console.log(`${width}px: five door styles and two sidelites have matching frame/glass bounds and fill scaling.`)
    await page.close()
  }
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
