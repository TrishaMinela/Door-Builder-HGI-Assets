import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import sharp from 'sharp'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5189', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5189')) resolve() })
    server.once('error', reject); server.once('exit', code => reject(new Error(`Vite exited ${code}`)))
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const photo = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#cccccc' } }).jpeg().toBuffer()
  const generated = `data:image/jpeg;base64,${photo.toString('base64')}`
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.addInitScript('window.__name = (fn) => fn')
    let compatible = true, fail = false, requests = 0, detections = 0
    let releaseDetection: (() => void) | undefined, releaseGeneration: (() => void) | undefined
    let payload: Record<string, unknown> | undefined
    await page.route('**/api/detect-entrance-structure', async route => {
      detections++
      await new Promise<void>(resolve => { releaseDetection = resolve })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ detection: { doorStructure: compatible ? 'single' : 'double', sidelites: 'none', transom: false, widthClass: compatible ? 'standard' : 'wide', approximateWidthRatio: .35, structurallyWide: !compatible, confidence: .96, summary: compatible ? 'Single door.' : 'Double doors.' }, request_id: 'detection-test' }) })
    })
    await page.route('**/api/generate-door-visualization', async route => {
      requests++; payload = route.request().postDataJSON()
      await new Promise<void>(resolve => { releaseGeneration = resolve })
      await route.fulfill({ status: fail ? 422 : 200, contentType: 'application/json', body: JSON.stringify(fail ? { error_code: 'OPENAI_REQUEST_REJECTED', user_message: 'Please try another photo.', request_id: 'safe-test-request' } : { image: generated }) })
    })
    const waitFor = async (condition: () => boolean) => {
      const deadline = Date.now() + 30000
      while (!condition()) { assert.ok(Date.now() < deadline, 'Mocked request did not start'); await page.waitForTimeout(50) }
    }
    const upload = () => page.locator('input[type=file]').setInputFiles({ name: 'test-home.jpg', mimeType: 'image/jpeg', buffer: photo })
    const replace = async () => {
      const picker = page.waitForEvent('filechooser')
      await page.getByRole('button', { name: 'Replace uploaded house photo' }).click()
      await (await picker).setFiles({ name: 'replacement-home.jpg', mimeType: 'image/jpeg', buffer: photo })
    }
    // A fresh customer session must reach the real app without any access flag.
    await page.goto('http://127.0.0.1:5189/')
    await page.locator('.home-app').waitFor()
    assert.equal(await page.locator('input[type=password]').count(), 0)
    assert.equal(await page.evaluate(() => sessionStorage.getItem('hgi-door-builder-beta-access')), null)
    await page.reload()
    await page.locator('.home-app').waitFor()
    assert.equal(await page.locator('input[type=password]').count(), 0, 'Refresh does not restore a password gate')
    await page.goto('http://127.0.0.1:5189/scripts/aiVisualizerHarness.html')
    assert.equal(await page.getByRole('button', { name: 'Manual', exact: true }).count(), 0)
    assert.equal(await page.locator('.visualizer-mode-selector').count(), 0)
    await upload()
    await waitFor(() => Boolean(releaseDetection))
    await page.getByText('Analyzing your existing entrance', { exact: true }).waitFor()
    assert.equal(await page.locator('.ai-photo-loading-content svg, .ai-photo-loading-icon').count(), 0, 'Analysis loading has no decorative icon')
    assert.equal(await page.locator('.ai-fit-strategy').count(), 0, 'No redundant inline analysis message below the photo')
    assert.equal(requests, 0)
    assert.equal(await page.locator('.entrance-corner-handle').count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Help AI locate the entrance' }).count(), 0)
    releaseDetection!()
    await waitFor(() => Boolean(releaseGeneration))
    await page.getByText('Creating your AI visualization', { exact: true }).waitFor()
    assert.equal(await page.locator('.ai-photo-loading-content svg, .ai-photo-loading-icon').count(), 0, 'Generation loading has no decorative icon')
    assert.equal(requests, 1, 'Good fit generates automatically once')
    assert.equal(payload!.corners, undefined, 'Automatic AI request has no manual coordinates')
    assert.equal(payload!.fitStrategy, 'use-selected-product')
    assert.equal(await page.locator('.configured-door-capture-host .door-frame').getAttribute('data-frame'), 'visible', 'AI reference retains the full jamb/frame')
    assert.ok(typeof payload!.productReference === 'string')
    const reference = await sharp(Buffer.from((payload!.productReference as string).split(',')[1], 'base64')).metadata()
    assert.equal(reference.width, 560); assert.equal(reference.height, 1160)
    assert.equal(await page.getByRole('button', { name: 'Replace uploaded house photo' }).isVisible(), true)
    assert.equal(await page.getByRole('button', { name: 'Back', exact: true }).count(), 1)
    assert.equal(await page.getByRole('button', { name: 'Back to Door Builder', exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Remove Photo', exact: true }).count(), 0)
    assert.equal(await page.getByRole('dialog').count(), 0)
    releaseGeneration!()
    await page.getByText('AI Result', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Download completed home visualization photo' }).isEnabled(), true)
    assert.equal(await page.locator('.cleanup-comparison-original').count(), 1)
    await page.screenshot({ path: `/tmp/ai-only-result-${width}.png` })
    await page.getByRole('button', { name: 'Return to the previous visualizer step' }).click()
    assert.equal(await page.locator('.entrance-corner-handle').count(), 0)
    assert.equal(requests, 1, 'Returning to photo does not regenerate')
    compatible = false; releaseDetection = undefined
    await replace(); await waitFor(() => Boolean(releaseDetection)); releaseDetection!()
    await page.getByRole('dialog').waitFor()
    assert.equal(await page.getByRole('dialog').getByRole('button').count(), 2)
    assert.equal(await page.getByRole('button', { name: 'Continue Anyway' }).count(), 0)
    assert.equal(requests, 1, 'Incompatibility blocks generation')
    await page.getByRole('dialog').getByRole('button', { name: 'Change Photo' }).click()
    await page.getByText('Upload a photo of your entrance', { exact: true }).waitFor()
    compatible = true; fail = true; releaseDetection = undefined; releaseGeneration = undefined
    await upload(); await waitFor(() => Boolean(releaseDetection)); releaseDetection!()
    await waitFor(() => Boolean(releaseGeneration)); releaseGeneration!()
    await page.getByText('Please try another photo.', { exact: true }).waitFor()
    await page.getByText('Reference: safe-tes', { exact: true }).waitFor()
    fail = false; releaseGeneration = undefined
    await page.getByRole('button', { name: 'Try Again', exact: true }).click()
    await waitFor(() => Boolean(releaseGeneration))
    assert.equal(await page.getByRole('button', { name: 'Try Again', exact: true }).count(), 0, 'Retry action is removed while its request is pending')
    assert.equal(requests, 3, 'One retry starts one generation request')
    releaseGeneration!(); await page.getByText('AI Result', { exact: true }).waitFor()
    assert.equal(detections, 3, 'Generation retry reuses entrance analysis')
    console.log(`${width}px: AI-only upload, automatic Good-fit generation, full-frame reference, result, incompatibility modal, replacement, error diagnostics and retry passed.`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
