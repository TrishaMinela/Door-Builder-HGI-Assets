import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { chromium, type Page } from 'playwright-core'
import sharp from 'sharp'
import { boundedStage } from '../src/features/home-visualizer/visualizationLifecycle'
import { CUSTOMER_AI_MESSAGES } from '../src/features/home-visualizer/publicAiErrors'

// Observe already-canceled operations and late failures without unhandled
// rejections. No browser globals are needed beyond the stage's timer API.
const originalWindow = Reflect.get(globalThis, 'window')
Reflect.set(globalThis, 'window', { setTimeout, clearTimeout })
try {
  const aborted = new AbortController(); aborted.abort()
  await assert.rejects(boundedStage(Promise.reject(new Error('obsolete')), aborted.signal, 100, new Error('timeout')), { name: 'AbortError' })
  const pending = new AbortController()
  const canceled = boundedStage(new Promise((_, reject) => setTimeout(() => reject(new Error('late obsolete failure')), 20)), pending.signal, 100, new Error('timeout'))
  pending.abort()
  await assert.rejects(canceled, { name: 'AbortError' })
  await assert.rejects(boundedStage(new Promise((_, reject) => setTimeout(() => reject(new Error('late timeout failure')), 20)), undefined, 5, new Error('bounded timeout')), /bounded timeout/)
  assert.equal(await boundedStage(Promise.resolve('current'), undefined, 100, new Error('timeout')), 'current')
  await new Promise(resolve => setTimeout(resolve, 30))
  console.log('Stage cancellation, timeout and late-rejection safeguards passed.')
} finally {
  if (originalWindow === undefined) Reflect.deleteProperty(globalThis, 'window')
  else Reflect.set(globalThis, 'window', originalWindow)
}

// Isolated Vite fixture: no real API middleware, credentials, uploads or AI calls.
const cacheDir = await mkdtemp(join(tmpdir(), 'hgi-visualizer-lifecycle-'))
const server = await createServer({ configFile: false, cacheDir, server: { host: '127.0.0.1', port: 5214, strictPort: true }, optimizeDeps: { entries: ['scripts/aiVisualizerHarness.html'], include: ['react/jsx-dev-runtime'] } })
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const photo = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#cccccc' } }).jpeg().toBuffer()
const output = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#703030' } }).jpeg().toBuffer()
const generated = `data:image/jpeg;base64,${output.toString('base64')}`
let checks = 0
type TestWindow = Window & { __name: (fn: unknown) => unknown; captureMode: string; decodeMode: string; releaseCapture?: () => void; releaseDecode?: () => void; shortTimers: boolean; readyAnnouncements: number }
const wait = async (condition: () => boolean) => {
  const deadline = Date.now() + 15_000
  while (!condition()) { assert.ok(Date.now() < deadline, 'Mock request did not start'); await new Promise(resolve => setTimeout(resolve, 20)) }
}
const upload = (page: Page) => page.locator('input[type=file]').setInputFiles({ name: 'synthetic-home.jpg', mimeType: 'image/jpeg', buffer: photo })
async function successful(page: Page) {
  const slider = page.getByRole('slider')
  await slider.waitFor({ state: 'visible' })
  assert.equal(await page.locator('.cleanup-comparison-proposed').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0), true)
  await slider.focus(); await slider.press('ArrowRight')
  assert.equal(await slider.getAttribute('aria-valuenow'), '52')
  assert.equal(await page.getByRole('button', { name: 'Save completed home visualization image' }).isEnabled(), true)
}
async function failed(page: Page, message: string | RegExp) {
  await page.getByRole('alert').filter({ hasText: message }).waitFor()
  assert.equal(await page.getByRole('slider').isVisible().catch(() => false), false)
  assert.equal(await page.locator('.ai-automatic-photo img').isVisible(), true)
  assert.equal(await page.evaluate(() => (window as TestWindow).readyAnnouncements), 0, 'Never announce success on failure')
}

try {
  await server.listen()
  for (const width of [1280, 768, 390]) {
    for (const scenario of ['initial', 'no-resize-observer', 'mismatch-replacement', 'success-replacement', 'capture-replacement', 'generation-replacement', 'decode-replacement', 'capture-configuration', 'generation-configuration', 'decode-configuration', 'interrupted-return', 'completed-return', 'capture-retry', 'capture-timeout', 'invalid-image', 'missing-image', 'decode-timeout', 'comparison-error', 'original-error', 'comparison-timeout', 'late-image-error', 'api-error', 'repeated-attempts']) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      page.setDefaultTimeout(15_000)
      let detections = 0, generations = 0, compatible = scenario !== 'mismatch-replacement'
      let apiFailure = scenario === 'api-error', invalidImage = scenario === 'invalid-image'
      let releaseGeneration: (() => void) | undefined
      const consoleErrors: string[] = []
      page.on('pageerror', error => consoleErrors.push(error.message))
      await page.addInitScript(({ scenario, generated }) => {
        const state = window as TestWindow
        state.__name = fn => fn
        state.captureMode = scenario === 'capture-retry' ? 'fail' : ['capture-replacement', 'capture-configuration', 'capture-timeout'].includes(scenario) ? 'hold' : 'normal'
        state.decodeMode = ['decode-replacement', 'decode-configuration', 'decode-timeout', 'interrupted-return'].includes(scenario) ? 'hold' : 'normal'
        state.shortTimers = scenario.includes('timeout')
        state.readyAnnouncements = 0
        if (scenario === 'no-resize-observer') Object.defineProperty(window, 'ResizeObserver', { value: undefined })
        new MutationObserver(() => {
          if (document.body?.textContent?.includes('Your AI visualization is ready')) state.readyAnnouncements++
        }).observe(document, { subtree: true, childList: true, characterData: true })
        const toBlob = HTMLCanvasElement.prototype.toBlob
        HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
          if (state.captureMode === 'fail') { callback(null); return }
          if (state.captureMode === 'hold') { state.releaseCapture = () => toBlob.call(this, callback, ...args); return }
          toBlob.call(this, callback, ...args)
        }
        const decode = HTMLImageElement.prototype.decode
        HTMLImageElement.prototype.decode = function() {
          if (this.src === generated && state.decodeMode === 'hold') return new Promise<void>(resolve => { state.releaseDecode = () => resolve() })
          return decode.call(this)
        }
        const timeout = window.setTimeout.bind(window)
        window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => timeout(handler, state.shortTimers && (scenario === 'capture-timeout' ? delay === 30_000 : delay === 20_000) ? 700 : delay, ...args)) as typeof window.setTimeout
        // Simulate a DOM image that fails after pre-decode, or never reports load.
        if (scenario === 'comparison-error' || scenario === 'comparison-timeout' || scenario === 'original-error') {
          document.addEventListener('load', event => {
            const image = event.target
            if (!(image instanceof HTMLImageElement) || image.className !== (scenario === 'original-error' ? 'cleanup-comparison-original' : 'cleanup-comparison-proposed')) return
            event.stopImmediatePropagation()
            if (scenario !== 'comparison-timeout') image.dispatchEvent(new Event('error'))
          }, true)
        }
      }, { scenario, generated })
      await page.route('**/api/**', async route => {
        if (route.request().url().endsWith('/detect-entrance-structure')) {
          detections++
          await route.fulfill({ json: { request_id: 'mock-analysis', detection: { doorStructure: compatible ? 'single' : 'double', sidelites: 'none', transom: false, widthClass: 'standard', approximateWidthRatio: .35, structurallyWide: false, confidence: .98, summary: 'Synthetic fixture.' } } })
        } else if (route.request().url().endsWith('/generate-door-visualization')) {
          generations++
          if ((scenario === 'generation-replacement' || scenario === 'generation-configuration') && generations === 1) await new Promise<void>(resolve => { releaseGeneration = resolve })
          await route.fulfill({ status: apiFailure ? 502 : 200, json: apiFailure ? { error_code: 'OPENAI_REQUEST_REJECTED', user_message: 'Mock API failure.', request_id: 'mock-generation' } : { image: scenario === 'missing-image' ? undefined : invalidImage ? 'data:image/jpeg;base64,YmFk' : generated, request_id: 'mock-generation' } }).catch(() => {})
        } else throw new Error('Unexpected API blocked')
      })
      await page.goto('http://127.0.0.1:5214/scripts/aiVisualizerHarness.html')
      await upload(page)
      if (scenario === 'interrupted-return') {
        await page.waitForFunction(() => Boolean((window as TestWindow).releaseDecode))
        await page.getByRole('button', { name: 'Toggle test visualizer' }).click()
        await page.evaluate(() => { (window as TestWindow).decodeMode = 'normal' })
        await page.getByRole('button', { name: 'Toggle test visualizer' }).click()
        await wait(() => generations === 2)
        await page.evaluate(() => (window as TestWindow).releaseDecode?.())
        assert.equal(detections, 1)
      }
      if (scenario === 'capture-configuration') {
        await page.waitForFunction(() => Boolean((window as TestWindow).releaseCapture))
        await page.evaluate(() => { const state = window as TestWindow; state.captureMode = 'normal'; state.releaseDecode = state.releaseCapture })
        await page.getByRole('button', { name: 'Change test configuration' }).click()
        await successful(page)
        await page.evaluate(() => (window as TestWindow).releaseDecode?.())
        assert.equal(detections, 1); assert.equal(generations, 1)
      }
      if (scenario === 'generation-configuration') {
        await wait(() => Boolean(releaseGeneration))
        await page.getByRole('button', { name: 'Change test configuration' }).click()
        await wait(() => generations === 2); releaseGeneration!()
        assert.equal(detections, 1)
      }
      if (scenario === 'decode-configuration') {
        await page.waitForFunction(() => Boolean((window as TestWindow).releaseDecode))
        await page.evaluate(() => { (window as TestWindow).decodeMode = 'normal' })
        await page.getByRole('button', { name: 'Change test configuration' }).click()
        await wait(() => generations === 2)
        await page.evaluate(() => (window as TestWindow).releaseDecode?.())
        assert.equal(detections, 1)
      }
      if (scenario === 'mismatch-replacement') {
        await page.getByRole('dialog').waitFor(); assert.equal(generations, 0)
        compatible = true
        await page.getByRole('button', { name: 'Change Photo', exact: true }).click(); await upload(page)
      }
      if (scenario === 'capture-replacement') {
        await wait(() => detections === 1)
        await page.waitForFunction(() => Boolean((window as TestWindow).releaseCapture))
        await upload(page); await wait(() => detections === 2)
        await page.evaluate(() => { const state = window as TestWindow; state.captureMode = 'normal'; state.releaseCapture?.() })
      }
      if (scenario === 'generation-replacement') {
        await wait(() => Boolean(releaseGeneration)); await upload(page)
        await wait(() => generations === 2); releaseGeneration!()
      }
      if (scenario === 'decode-replacement') {
        await page.waitForFunction(() => Boolean((window as TestWindow).releaseDecode))
        await page.evaluate(() => { (window as TestWindow).decodeMode = 'normal' })
        await upload(page); await wait(() => generations === 2)
        await page.evaluate(() => (window as TestWindow).releaseDecode?.())
      }
      if (scenario === 'capture-retry' || scenario === 'capture-timeout') {
        await failed(page, /prepare your configured door/); assert.equal(generations, 0)
        await page.evaluate(() => { const state = window as TestWindow; state.captureMode = 'normal'; state.shortTimers = false })
        await page.getByRole('button', { name: 'Retry configured door' }).click()
      }
      if (scenario === 'invalid-image' || scenario === 'missing-image' || scenario === 'api-error' || scenario === 'decode-timeout' || scenario === 'original-error' || scenario.startsWith('comparison-')) {
        await failed(page, scenario === 'api-error' || scenario === 'missing-image' ? CUSTOMER_AI_MESSAGES.AI_GENERATION_FAILED : /could not be (loaded|displayed)/)
        if (scenario === 'api-error') assert.equal(await page.getByRole('alert').filter({ hasText: 'Mock API failure' }).count(), 0, 'Provider text must not reach the customer')
        assert.equal(generations, 1)
        await page.waitForTimeout(200); assert.equal(generations, 1, 'Failure must not auto-retry')
        assert.equal(detections, 1)
        if (scenario === 'invalid-image' || scenario === 'api-error' || scenario === 'decode-timeout') {
          invalidImage = false; apiFailure = false
          await page.evaluate(() => { const state = window as TestWindow; state.decodeMode = 'normal'; state.shortTimers = false })
          await page.getByRole('button', { name: 'Try Again', exact: true }).click()
          await successful(page); assert.equal(detections, 1); assert.equal(generations, 2)
        }
      } else {
        if (scenario !== 'capture-configuration') await successful(page)
        if (scenario === 'no-resize-observer') {
          await page.waitForFunction(() => document.querySelector('.cleanup-comparison-stage')!.getBoundingClientRect().height > 0)
        }
        if (scenario === 'completed-return') {
          await page.getByRole('button', { name: 'Toggle test visualizer' }).click()
          await page.getByRole('button', { name: 'Toggle test visualizer' }).click()
          await page.getByRole('slider').waitFor({ state: 'visible' })
          assert.equal(generations, 1, 'A completed result survives leaving/re-entering without another request')
          await page.locator('.cleanup-comparison-proposed').evaluate(image => image.dispatchEvent(new Event('error')))
          await page.getByRole('alert').filter({ hasText: /comparison image could not be loaded/ }).waitFor()
        }
        if (scenario === 'late-image-error') {
          await page.locator('.cleanup-comparison-proposed').evaluate(image => image.dispatchEvent(new Event('error')))
          await page.getByRole('alert').filter({ hasText: /comparison image could not be loaded/ }).waitFor()
          assert.equal(await page.getByRole('slider').count(), 0)
          assert.equal(await page.getByText('Your AI visualization is ready', { exact: true }).count(), 0)
        }
        if (scenario === 'success-replacement' || scenario === 'repeated-attempts') {
          for (let repeat = 0; repeat < (scenario === 'repeated-attempts' ? 4 : 1); repeat++) { await upload(page); await wait(() => generations === repeat + 2); await successful(page) }
        }
        if (scenario === 'capture-retry' || scenario === 'capture-timeout') { assert.equal(detections, 1); assert.equal(generations, 1) }
        if (scenario === 'capture-replacement') assert.equal(generations, 1)
      }
      assert.deepEqual(consoleErrors, [])
      console.log(`${width}px ${scenario}: passed (${detections} analysis, ${generations} generation requests; all mocked)`)
      checks++
      await page.close()
    }
  }
  console.log(`AI lifecycle: ${checks} mocked browser scenarios passed; no real AI requests.`)
} finally { await browser.close(); await server.close(); await rm(cacheDir, { recursive: true, force: true }) }
