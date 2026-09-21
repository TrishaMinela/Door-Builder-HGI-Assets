import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import sharp from 'sharp'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5191', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5191')) resolve() })
    server.stderr.on('data', chunk => process.stderr.write(chunk))
    server.once('error', reject)
    server.once('exit', code => reject(new Error(`Vite exited with ${code}`)))
    setTimeout(() => reject(new Error('Vite test server did not start')), 10_000).unref()
  })
  browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const failedRequests: string[] = []
  page.on('requestfailed', request => failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`))
  await page.goto('http://127.0.0.1:5191/scripts/configurationRenderHarness.html')
  await page.waitForFunction(() => 'integrityFixtureCount' in window)
  const count = await page.evaluate(() => (window as unknown as { integrityFixtureCount: number }).integrityFixtureCount)
  const coverage = await page.evaluate(() => (window as unknown as { integrityCoverage: string[] }).integrityCoverage)
  for (let index = 0; index < count; index += 1) {
    const name = await page.evaluate(i => (window as unknown as { integrityFixtureName: (i: number) => string }).integrityFixtureName(i), index)
    const result = await page.evaluate(i => (window as unknown as { renderIntegrityFixture: (i: number) => Promise<{ dataUrl: string; width: number; height: number }> }).renderIntegrityFixture(i), index)
    assert.equal(result.width, 1200, `${name}: width`)
    assert.equal(result.height, 1600, `${name}: height`)
    const bytes = Buffer.from(result.dataUrl.split(',')[1], 'base64')
    const metadata = await sharp(bytes).metadata()
    assert.equal(metadata.width, 1200, `${name}: encoded width`)
    assert.equal(metadata.height, 1600, `${name}: encoded height`)
    assert.equal(metadata.hasAlpha, true, `${name}: alpha channel`)
    const stats = await sharp(bytes).stats()
    assert.ok(stats.channels[3].max === 255 && stats.channels[3].min === 0, `${name}: product output is blank or fully opaque`)
  }
  assert.deepEqual(failedRequests, [])
  console.log(JSON.stringify({ renderedConfigurations: count, coverageDimensions: coverage.length, failedImageLoads: 0, blankOutputs: 0, runtimeExceptions: 0 }, null, 2))
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
