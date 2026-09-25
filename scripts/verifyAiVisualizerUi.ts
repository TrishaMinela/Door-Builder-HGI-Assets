import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import sharp from 'sharp'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { AI_LOADING_MESSAGES } from '../src/features/home-visualizer/AiGenerationLoading'

assert.deepEqual(AI_LOADING_MESSAGES, [
  'Analyzing your doorway',
  'Getting a feel for your entrance',
  'Preparing your selected door',
  'Lining up the proportions',
  'Matching the details',
  'Building a realistic fit',
  'Blending it into your home',
  'Checking the final look',
  'Fine-tuning the details',
  'Making it look natural',
  'Your new entrance is taking shape',
  'Almost there',
  'Adding the finishing touches',
  'Polishing your visualization',
  'Finalizing the result',
])

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
    const goodFit = width === 390
    let requests = 0, fail = true
    let detectionRouteAvailable = false
    let releaseDetection: (() => void) | undefined
    let release: (() => void) | undefined
    let captured: { corners: unknown; configuration: unknown; productReference?: string; fitStrategy?: string; entranceDetection?: unknown } | null = null
    await page.route('**/api/detect-entrance-structure', async route => {
      if (!detectionRouteAvailable) { await route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not found' }); return }
      await new Promise<void>(resolve => { releaseDetection = resolve })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ detection: { doorStructure: goodFit ? 'single' : 'double', sidelites: 'none', transom: false, widthClass: goodFit ? 'standard' : 'wide', approximateWidthRatio: .35, structurallyWide: !goodFit, confidence: .96, summary: goodFit ? 'Single door.' : 'Double doors.' }, request_id: 'detection-test' }) })
    })
    await page.route('**/api/generate-door-visualization', async route => {
      requests += 1
      captured = route.request().postDataJSON()
      if (fail) await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error_code: 'OPENAI_REQUEST_REJECTED', user_message: 'OpenAI could not process this photo. Try the doorway locator.', request_id: 'safe-test-request' }) })
      else {
        await new Promise<void>(resolve => { release = resolve })
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ image: aiResult }) })
      }
    })
    await page.goto('http://127.0.0.1:5189/scripts/aiVisualizerHarness.html')
    const manual = page.getByRole('button', { name: 'Manual', exact: true })
    const ai = page.getByRole('button', { name: 'AI Beta', exact: true })
    assert.equal(await manual.getAttribute('aria-pressed'), 'true')
    await ai.focus(); await page.keyboard.press('Enter')
    await page.locator('input[type=file]').setInputFiles({ name: 'test-home.jpg', mimeType: 'image/jpeg', buffer: photo })
    const photoBefore = await page.locator('img[alt^="Uploaded entrance photo"]').getAttribute('src')
    assert.equal(await ai.getAttribute('aria-pressed'), 'true')
    assert.equal(await page.locator('img[alt^="Uploaded entrance photo"]').getAttribute('src'), photoBefore)
    assert.equal(await page.locator('.entrance-corner-handle').count(), 0, 'AI starts with automatic entrance detection and no mandatory points')
    await page.getByText('Entrance detection API route is unavailable. Run the app with the Vercel development runtime, then retry.', { exact: true }).waitFor()
    await page.getByText('API_ROUTE_UNAVAILABLE', { exact: false }).waitFor()
    assert.equal(await page.getByText("We couldn't confidently identify the entrance structure.", { exact: false }).count(), 0, 'Transport failures are not presented as low-confidence AI analysis')
    detectionRouteAvailable = true
    await page.getByRole('button', { name: 'Retry detection', exact: true }).click()
    await page.getByText('Analyzing your existing entrance', { exact: true }).waitFor()
    await page.getByText('We’re identifying the doorway, sidelites, and other entry details.', { exact: true }).waitFor()
    await new Promise<void>(resolve => { const check = () => releaseDetection ? resolve() : setTimeout(check, 25); check() })
    const detectionProgress = page.getByRole('progressbar', { name: 'Entrance analysis in progress' })
    assert.ok(Number(await detectionProgress.getAttribute('aria-valuenow')) >= 0)
    assert.match(await page.locator('.ai-entrance-analysis-overlay .ai-photo-loading-percentage').innerText(), /^\d+%$/)
    releaseDetection!()
    if (goodFit) {
      await page.getByRole('button', { name: 'Try Again', exact: true }).waitFor()
      assert.equal(requests, 1, 'Good fits automatically continue into generation')
      assert.equal(await page.getByText('Good fit', { exact: true }).count(), 0, 'Good fits do not stop on a compatibility screen')
    } else {
      await page.getByText('We detected double doors with no sidelites.', { exact: true }).waitFor()
      await page.getByText('Caution — structural change needed', { exact: true }).waitFor()
      await page.getByText('You selected a single door with no sidelites.', { exact: true }).waitFor()
      assert.equal(requests, 0, 'Warnings wait for explicit confirmation')
      await page.getByRole('button', { name: 'Continue anyway with selected configuration', exact: true }).click()
    }
    await page.getByRole('button', { name: 'Try Again', exact: true }).waitFor()
    assert.equal(requests, 1)
    assert.deepEqual(captured!.configuration, JSON.parse(JSON.stringify(aiTestConfiguration)))
    assert.equal(captured!.fitStrategy, 'use-selected-product')
    assert.ok(captured!.entranceDetection)
    assert.match(captured!.productReference ?? '', /^data:image\/webp;base64,/, 'AI request includes the flattened configured render')
    assert.equal(captured!.corners, undefined)
    assert.match(await page.getByRole('alert').innerText(), /OpenAI could not process this photo/)
    assert.match(await page.getByRole('alert').innerText(), /Reference: safe-tes/)
    assert.match(await page.getByRole('alert').innerText(), /Error code: OPENAI_REQUEST_REJECTED/)
    assert.equal(await page.locator('img[alt^="Uploaded entrance photo"]').getAttribute('src'), photoBefore)
    await page.getByRole('button', { name: 'Help AI locate the entrance' }).click()
    const cornersBefore = await page.locator('.entrance-corner-handle').evaluateAll(elements => elements.map(element => element.getAttribute('style')))
    assert.equal(cornersBefore.length, 4)
    fail = false
    await page.getByRole('button', { name: 'Try Again', exact: true }).click()
    await page.getByText('Creating your AI visualization', { exact: true }).waitFor()
    await page.getByText('Analyzing your doorway', { exact: true }).waitFor()
    await page.getByText('This may take a minute or two.', { exact: true }).waitFor()
    assert.equal(await page.getByText('Status messages are illustrative.', { exact: false }).count(), 0)
    assert.equal(await page.getByRole('button', { name: goodFit ? 'AI visualization generation status' : 'Continue anyway with selected configuration' }).isDisabled(), true)
    await page.waitForFunction(() => document.querySelector('.ai-photo-loading-overlay') !== null)
    const overlayBounds = await page.locator('.ai-photo-loading-overlay').boundingBox()
    const photoBounds = await page.locator('.ai-photo-placement-area .visualizer-editor').boundingBox()
    assert.ok(overlayBounds && photoBounds)
    for (const key of ['x', 'y', 'width', 'height'] as const) assert.ok(Math.abs(overlayBounds[key] - photoBounds[key]) < 2, `Loading overlay is photo-only: ${JSON.stringify({ overlayBounds, photoBounds })}`)
    assert.ok(Number(await page.getByRole('progressbar').getAttribute('aria-valuenow')) >= 0, 'Illustrative progress exposes its displayed percentage accessibly')
    await page.waitForTimeout(5500)
    await page.getByText('Getting a feel for your entrance', { exact: true }).waitFor()
    const progress = await page.locator('.ai-photo-loading-track > span').evaluate(element => parseFloat((element as HTMLElement).style.width))
    assert.ok(progress > 0 && progress <= 94)
    assert.match(await page.locator('.ai-photo-loading-percentage').innerText(), /^\d+%$/)
    // Wait for the mocked request to start without ever allowing a paid fetch.
    await new Promise<void>(resolve => { const check = () => release ? resolve() : setTimeout(check, 25); check() })
    assert.deepEqual(captured!.corners, { topLeft: { x: .35, y: .35 }, topRight: { x: .65, y: .35 }, bottomRight: { x: .65, y: .65 }, bottomLeft: { x: .35, y: .65 } })
    await manual.click()
    assert.deepEqual(await page.locator('.entrance-corner-handle').evaluateAll(elements => elements.map(element => element.getAttribute('style'))), cornersBefore)
    release!()
    await page.getByRole('button', { name: 'Continue', exact: true }).waitFor()
    await ai.click()
    await page.getByText('AI Result', { exact: true }).waitFor()
    await page.locator('.ai-photo-loading-overlay').waitFor({ state: 'hidden' })
    assert.equal(requests, 2, 'Mode toggles never generate')
    assert.equal(await page.getByText('Want to try another valid fit for this opening?', { exact: true }).count(), 0)
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
