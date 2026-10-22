import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { CUSTOMER_AI_MESSAGES } from '../src/features/home-visualizer/publicAiErrors'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5196', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', data => { if (String(data).includes('127.0.0.1:5196')) resolve() })
    server.once('error', reject)
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const photo = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#ccc' } }).jpeg().toBuffer()
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.addInitScript('window.__name = fn => fn')
    for (const stage of ['detection', 'generation', 'low-confidence'] as const) {
      const codes = stage === 'low-confidence' ? ['ENTRANCE_PHOTO_UNSUITABLE'] as const : Object.keys(CUSTOMER_AI_MESSAGES) as Array<keyof typeof CUSTOMER_AI_MESSAGES>
      for (const code of codes) {
        let requests = 0, detections = 0
        await page.unrouteAll({ behavior: 'wait' })
        await page.route('**/api/**', async route => {
          const detection = route.request().url().includes('detect-entrance-structure')
          if (!detection && !route.request().url().includes('generate-door-visualization')) return route.fulfill({ json: { ok: true } })
          if (detection) detections++; else requests++
          if (detection && stage !== 'detection') return route.fulfill({ json: { detection: { doorStructure: 'single', sidelites: 'none', transom: false, widthClass: 'standard', approximateWidthRatio: .35, structurallyWide: false, confidence: stage === 'low-confidence' ? .2 : .98, summary: 'Single door.' }, request_id: 'mock-analysis' } })
          return route.fulfill({ status: 503, json: { error_code: code, user_message: 'SECRET OpenAI billing token_invalidated Supabase sk-secret', request_id: 'mock-request' } })
        })
        await page.goto('http://127.0.0.1:5196/scripts/aiVisualizerHarness.html')
        await page.locator('input[type=file]').setInputFiles({ name: 'test.jpg', mimeType: 'image/jpeg', buffer: photo })
        await page.getByText(CUSTOMER_AI_MESSAGES[code], { exact: true }).waitFor()
        assert.doesNotMatch(await page.locator('body').innerText(), /SECRET|OpenAI|token_invalidated|Supabase|sk-secret|billing/)
        assert.equal(await page.locator('.cleanup-comparison-original').count(), 0)
        if (stage === 'detection' || code === 'ENTRANCE_PHOTO_UNSUITABLE') {
          await page.getByRole('button', { name: 'Change Photo', exact: true }).click()
          await page.getByText('Upload a photo of your entrance', { exact: true }).waitFor()
        } else {
          const before = requests
          await page.getByRole('button', { name: 'Try Again', exact: true }).click()
          await page.waitForFunction(() => Boolean(document.querySelector('.ai-visualizer-error')))
          assert.equal(requests, before + 1)
          assert.equal(detections, 1, 'Retry preserves successful analysis')
        }
        assert.ok(await page.getByRole('button', { name: 'Change test configuration', exact: true }).isVisible(), 'The current builder context remains mounted')
        console.log(`${width}px ${stage} ${code}: safe fixed copy, no leaked response text, recovery passed`)
      }
    }
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
