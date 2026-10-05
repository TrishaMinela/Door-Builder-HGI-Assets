import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { doorHardwarePlacements } from '../src/data/doorConfigurationRules'

const modes = ['DDLLBO', 'DDLLAC', 'DDLLKP'] as const
for (const side of ['left', 'right'] as const) {
  for (const mode of modes) {
    const placements = doorHardwarePlacements('french', side, side, mode)
    assert.equal(placements.filter(item => item.mode === 'full').length, mode === 'DDLLBO' ? 2 : 1)
    assert.equal(placements.filter(item => item.mode === 'knob-only').length, mode === 'DDLLKP' ? 1 : 0)
    if (mode !== 'DDLLBO') assert.equal(placements.find(item => item.mode === 'full')!.leafIndex, side === 'right' ? 0 : 1)
    assert.deepEqual(doorHardwarePlacements('single', side, side, mode), [{ leafIndex: 0, side, mode: 'full' }])
  }
}
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5192', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5192')) resolve() })
    server.once('error', reject)
    server.once('exit', code => reject(new Error(`Vite exited ${code}`)))
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.addInitScript('window.__name = (fn) => fn')
    await page.goto('http://127.0.0.1:5192/scripts/doubleHardwareHarness.html')
    const captures: string[] = [], pdfs: string[] = []
    for (const mode of modes) {
      await page.getByRole('button', { name: mode }).click()
      await page.waitForFunction(key => document.querySelector('.preview-scene')?.getAttribute('data-render-configuration-key') === key && document.querySelector('.preview-scene')?.getAttribute('data-render-semantically-ready') === 'true', mode)
      const layers = await page.locator('.hardware').evaluateAll(elements => elements.map(element => ({ mode: element.getAttribute('data-hardware-mode'), side: element.getAttribute('data-hardware-side'), clip: (element.querySelector('img') as HTMLImageElement).style.clipPath })))
      assert.equal(layers.filter(item => item.mode === 'full').length, mode === 'DDLLBO' ? 2 : 1)
      assert.equal(layers.filter(item => item.mode === 'knob-only').length, mode === 'DDLLKP' ? 1 : 0)
      if (mode !== 'DDLLBO') assert.equal(layers.find(item => item.mode === 'full')!.side, 'right')
      if (mode === 'DDLLKP') assert.ok(layers.find(item => item.mode === 'knob-only')!.clip.startsWith('inset('))
      const images = await page.evaluate(async () => {
        const api = window as unknown as { captureHardware: () => Promise<{ dataUrl: string }>; renderHardwarePdf: () => Promise<{ dataUrl: string }> }
        return { capture: (await api.captureHardware()).dataUrl, pdf: (await api.renderHardwarePdf()).dataUrl }
      })
      captures.push(images.capture); pdfs.push(images.pdf)
      await page.locator('.preview-scene').screenshot({ path: `/tmp/double-hardware-${width}-${mode}.png` })
    }
    assert.equal(new Set(captures).size, 3, 'Each selected mode changes the configured entrance capture')
    assert.equal(new Set(pdfs).size, 3, 'Each selected mode changes the deterministic PDF image')
    console.log(`${width}px: live mode switching, leaf counts, knob-only clipping, capture and PDF mode differences passed.`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
