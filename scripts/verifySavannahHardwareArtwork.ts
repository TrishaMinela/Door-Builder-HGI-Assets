import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium, type Page } from 'playwright-core'
import { hardwareOptions, hardwarePreviewAssetUrl } from '../src/data/hardware'

for (const hardware of hardwareOptions) for (const view of ['Exterior', 'Interior'] as const) {
  const asset = hardwarePreviewAssetUrl(hardware, view)
  assert.ok(asset && existsSync(`public${decodeURI(asset)}`), `Missing ${view}: ${hardware.manufacturer}/${hardware.style}/${hardware.finish}: ${asset}`)
  assert.notEqual(hardwarePreviewAssetUrl(hardware, 'Exterior'), hardwarePreviewAssetUrl(hardware, 'Interior'))
}
console.log(`${hardwareOptions.length} hardware style/finish combinations: matching exterior/interior assets present; no gaps.`)

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5216', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const ready = (page: Page) => page.waitForFunction(() => Array.from(document.querySelectorAll('#hardware-live .preview-scene')).every(scene => scene.getAttribute('data-render-semantically-ready') === 'true' && Array.from(scene.querySelectorAll('img')).every(image => image.complete && image.naturalWidth > 0)))
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5216')) resolve() }); server.once('error', reject); server.once('exit', code => reject(new Error(`Vite exited ${code}`))); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  let verifiedViews = 0
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript('window.__name = (fn) => fn')
    await page.route('**/api/**', route => route.abort())
    await page.goto('http://127.0.0.1:5216/scripts/doubleHardwareHarness.html')
    await page.getByRole('button', { name: 'DDLLAC', exact: true }).click()
    for (let index = 0; index < hardwareOptions.length; index++) {
      const hardware = hardwareOptions[index]
      await page.evaluate(index => (window as unknown as { selectHardwareIndex: (index: number) => void }).selectHardwareIndex(index), index)
      for (const type of ['Savannah', 'Single', 'French']) {
        await page.getByRole('button', { name: type, exact: true }).click()
        for (const [label, side] of [['Left Active', 'right'], ['Right Active', 'left']]) {
          await page.getByRole('button', { name: label, exact: true }).click()
          for (const mode of type === 'Savannah' ? ['Exterior', 'Interior', 'Both'] : ['Both']) {
            await page.getByRole('button', { name: mode, exact: true }).click()
            await ready(page)
            for (const view of mode === 'Both' ? ['Exterior', 'Interior'] as const : [mode as 'Exterior' | 'Interior']) {
              const scene = page.locator(`#hardware-live [data-viewpoint="${view}"]`)
              assert.equal(await scene.locator('.hardware img').getAttribute('src'), hardwarePreviewAssetUrl(hardware, view), `${type}/${hardware.id}/${label}/${view}: exact selected style/finish/view artwork`)
              assert.equal(await scene.locator('.hardware').count(), 1)
              if (type === 'Savannah') {
                assert.equal(await scene.locator(`.door-leaf-${side} .hardware[data-hardware-side="${side}"]`).count(), 1, 'Canonical active leaf and anchor are unchanged')
                assert.equal(await scene.locator('.door-frame').evaluate(element => getComputedStyle(element).scale), view === 'Interior' ? '-1 1' : 'none')
                const placement = await scene.locator('.hardware img').getAttribute('class')
                assert.equal(placement?.includes('hardware-image-mirrored'), (view === 'Exterior' ? 'right' : 'left') !== side, 'Artwork alignment accounts for its authored side before the whole-unit flip')
              }
              verifiedViews++
            }
          }
        }
      }
    }
    // Exercise the real configured-reference capture component, not a mock,
    // and deterministic Exterior PDF while the live screen is Interior/Both.
    await page.getByRole('button', { name: 'Savannah', exact: true }).click()
    for (const style of ['Santa Cruz', 'Longview', 'Camelot Trim with Georgian Knob']) {
      const index = hardwareOptions.findIndex(hardware => hardware.style === style)
      assert.ok(index >= 0)
      await page.evaluate(index => (window as unknown as { selectHardwareIndex: (index: number) => void }).selectHardwareIndex(index), index)
      for (const label of ['Left Active', 'Right Active']) {
        await page.getByRole('button', { name: label, exact: true }).click()
        await page.getByRole('button', { name: 'Exterior', exact: true }).click(); await ready(page)
        const exteriorPdf = await page.evaluate(() => (window as unknown as { renderHardwarePdf: () => Promise<{ dataUrl: string; assets: string[] }> }).renderHardwarePdf())
        assert.ok(exteriorPdf.assets.includes(hardwarePreviewAssetUrl(hardwareOptions[index], 'Exterior')))
        for (const view of ['Interior', 'Both']) {
          await page.getByRole('button', { name: view, exact: true }).click(); await ready(page)
          const pdf = await page.evaluate(() => (window as unknown as { renderHardwarePdf: () => Promise<{ dataUrl: string }> }).renderHardwarePdf())
          assert.equal(pdf.dataUrl, exteriorPdf.dataUrl, 'PDF remains Exterior, independent of the on-screen view')
          await page.evaluate(() => (window as unknown as { enableAiSource: () => void }).enableAiSource())
          await page.locator('output[data-ai-ready="true"]').waitFor({ state: 'attached' })
          assert.equal(await page.locator('.configured-door-capture-host .hardware img').getAttribute('src'), hardwarePreviewAssetUrl(hardwareOptions[index], 'Exterior'), 'Actual AI reference component uses selected exterior hardware')
          const source = await page.locator('output').getAttribute('data-ai-url')
          assert.ok(source?.startsWith('blob:'))
          assert.equal(await page.evaluate(async url => { const blob = await (await fetch(url!)).blob(); const image = await createImageBitmap(blob); const valid = image.width > 0 && image.height > 0; image.close(); return valid }, source), true)
        }
        if (style === 'Santa Cruz') {
          await page.locator('#hardware-live').screenshot({ path: `/tmp/savannah-matching-artwork-${width}-${label.replaceAll(' ', '-')}.png` })
          await writeFile(`/tmp/savannah-matching-artwork-${width}-${label.replaceAll(' ', '-')}-pdf.png`, Buffer.from(exteriorPdf.dataUrl.split(',')[1], 'base64'))
        }
      }
    }
    assert.deepEqual(errors, [])
    console.log(`${width}px: all 34 products, LHI/RHI, Savannah Exterior/Interior/Both, Single/French Both, PDF and AI reference captures passed.`)
    await page.close()
  }
  console.log(`${verifiedViews} hardware/view assertions passed; no real AI requests.`)
} finally { await browser?.close(); server.kill('SIGTERM') }
