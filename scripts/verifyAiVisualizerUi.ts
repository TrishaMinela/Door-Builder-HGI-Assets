import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import sharp from 'sharp'
import { aiTestConfiguration } from './aiVisualizerFixture'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5189', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5189')) resolve() })
    server.once('error', reject)
    server.once('exit', code => reject(new Error(`Vite exited with ${code}`)))
    setTimeout(() => reject(new Error('Test Vite server did not start')), 10_000).unref()
  })
  browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const photo = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#cccccc' } }).jpeg().toBuffer()
  const aiResult = `data:image/jpeg;base64,${photo.toString('base64')}`
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    let requests = 0, fail = true
    let release!: () => void
    let captured: { corners: unknown; configuration: unknown } | null = null
    await page.route('**/api/generate-door-visualization', async route => {
      requests += 1
      captured = route.request().postDataJSON()
      if (fail) await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'Please try again, or use Manual mode.' }) })
      else {
        await new Promise<void>(resolve => { release = resolve })
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ image: aiResult }) })
      }
    })
    await page.goto('http://127.0.0.1:5189/scripts/aiVisualizerHarness.html')
    const manual = page.getByRole('button', { name: 'Manual', exact: true })
    const ai = page.getByRole('button', { name: 'AI Beta', exact: true })
    assert.equal(await manual.getAttribute('aria-pressed'), 'true')
    await page.locator('input[type=file]').setInputFiles({ name: 'test-home.jpg', mimeType: 'image/jpeg', buffer: photo })
    await page.getByRole('button', { name: 'Start Placing Points' }).click()
    const cornersBefore = await page.locator('.entrance-corner-handle').evaluateAll(elements => elements.map(element => element.getAttribute('style')))
    const photoBefore = await page.locator('img[alt^="Uploaded entrance photo"]').getAttribute('src')
    await ai.focus(); await page.keyboard.press('Enter')
    assert.equal(await ai.getAttribute('aria-pressed'), 'true')
    assert.equal(requests, 0)
    assert.equal(await page.locator('img[alt^="Uploaded entrance photo"]').getAttribute('src'), photoBefore)
    assert.deepEqual(await page.locator('.entrance-corner-handle').evaluateAll(elements => elements.map(element => element.getAttribute('style'))), cornersBefore)
    const generate = page.getByRole('button', { name: 'Generate AI Visualization', exact: true })
    assert.equal(await generate.isVisible(), true)
    assert.notEqual(await generate.locator('.wizard-nav-label').evaluate(element => getComputedStyle(element).display), 'none')
    await generate.click()
    await page.getByRole('button', { name: 'Try Again', exact: true }).waitFor()
    assert.equal(requests, 1)
    assert.deepEqual(captured!.configuration, JSON.parse(JSON.stringify(aiTestConfiguration)))
    assert.deepEqual(captured!.corners, { topLeft: { x: .35, y: .35 }, topRight: { x: .65, y: .35 }, bottomRight: { x: .65, y: .65 }, bottomLeft: { x: .35, y: .65 } })
    assert.equal(await page.locator('img[alt^="Uploaded entrance photo"]').getAttribute('src'), photoBefore)
    fail = false
    await page.getByRole('button', { name: 'Try Again', exact: true }).click()
    await page.getByText('Creating your AI visualization', { exact: true }).waitFor()
    assert.equal(await generate.isDisabled(), true)
    await page.waitForFunction(() => document.querySelector('.ai-photo-loading-overlay') !== null)
    const overlayBounds = await page.locator('.ai-photo-loading-overlay').boundingBox()
    const photoBounds = await page.locator('.ai-photo-placement-area .visualizer-editor').boundingBox()
    assert.ok(overlayBounds && photoBounds)
    for (const key of ['x', 'y', 'width', 'height'] as const) assert.ok(Math.abs(overlayBounds[key] - photoBounds[key]) < 2, `Loading overlay is photo-only: ${JSON.stringify({ overlayBounds, photoBounds })}`)
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), null, 'Simulated loading is not announced as true measured progress')
    await page.waitForTimeout(8500)
    await page.getByText('Analyzing your doorway', { exact: true }).waitFor()
    const progress = await page.locator('.ai-photo-loading-track > span').evaluate(element => parseFloat((element as HTMLElement).style.width))
    assert.ok(progress > 8 && progress <= 88)
    // Wait for the mocked request to start without ever allowing a paid fetch.
    await new Promise<void>(resolve => { const check = () => release ? resolve() : setTimeout(check, 25); check() })
    await manual.click()
    release()
    await page.getByRole('button', { name: 'Continue', exact: true }).waitFor()
    await ai.click()
    await page.getByText('AI Result', { exact: true }).waitFor()
    await page.locator('.ai-photo-loading-overlay').waitFor({ state: 'hidden' })
    assert.equal(requests, 2, 'Mode toggles never generate')
    assert.equal(await page.getByRole('button', { name: 'Download completed home visualization photo' }).isDisabled(), false)
    await manual.click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    if (width > 767) await page.getByRole('button', { name: 'Finish visualization', exact: true }).click()
    await page.locator('.composed-photo-editor').waitFor({ timeout: 60_000 })
    await ai.click()
    await page.getByText('AI Result', { exact: true }).waitFor()
    await manual.click()
    await page.locator('.composed-photo-editor').waitFor()
    assert.equal(requests, 2)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.close()
    console.log(`AI Visualizer UI state, retry, loading, keyboard, retained results and Manual final render passed at ${width}px.`)
  }
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
