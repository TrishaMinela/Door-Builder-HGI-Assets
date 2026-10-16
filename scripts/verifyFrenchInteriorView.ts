import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { chromium, type Page } from 'playwright-core'
import sharp from 'sharp'
import { hardwareOptions, hardwarePreviewAssetUrl } from '../src/data/hardware'
import { doorHandingSides } from '../src/data/doorHanding'

type Fixture = { selectHanding: (id: string) => void; selectHardwareIndex: (index: number) => void; selectGlazedFixture: () => void; hardwareConfiguration: () => string; hardwareSubmission: () => unknown; captureHardware: () => Promise<{ dataUrl: string }>; renderHardwarePdf: () => Promise<{ dataUrl: string; view: string }>; enableAiSource: () => void }
const ready = (page: Page) => page.waitForFunction(() => Array.from(document.querySelectorAll('#hardware-live .preview-scene')).every(scene => scene.getAttribute('data-render-semantically-ready') === 'true' && Array.from(scene.querySelectorAll('img')).every(image => image.complete && image.naturalWidth > 0)))
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5218', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5218')) resolve() }); server.once('error', reject); server.once('exit', code => reject(new Error(`Vite exited ${code}`))); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  let checked = 0
  for (const width of [1280, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript('window.__name = (fn) => fn')
    await page.route('**/api/**', route => route.abort())
    await page.goto('http://127.0.0.1:5218/scripts/doubleHardwareHarness.html')
    const hardwareIndex = hardwareOptions.findIndex(hardware => hardware.style === 'Century Trim with Latitude Lever' && hardware.finish === 'Matte Black')
    assert.ok(hardwareIndex >= 0)
    await page.evaluate(index => { const fixture = window as unknown as Fixture; fixture.selectHardwareIndex(index); fixture.selectGlazedFixture() }, hardwareIndex)
    await page.getByRole('button', { name: 'Add Sidelite', exact: true }).click()
    for (const handing of ['LHI', 'RHI', 'LHO', 'RHO'] as const) for (const mode of ['DDLLAC', 'DDLLKP', 'DDLLBO']) {
      await page.evaluate(id => (window as unknown as Fixture).selectHanding(id), handing)
      await page.getByRole('button', { name: mode, exact: true }).click()
      await page.getByRole('button', { name: 'Exterior', exact: true }).click(); await ready(page)
      const before = await page.evaluate(() => { const f = window as unknown as Fixture; return { config: f.hardwareConfiguration(), payload: f.hardwareSubmission() } })
      const exteriorOwnership = await page.locator('#hardware-live .door-leaf').evaluateAll(leaves => leaves.map(leaf => ({ physical: leaf.getAttribute('data-physical-leaf'), mode: leaf.querySelector('.hardware')?.getAttribute('data-hardware-mode') ?? null, side: leaf.querySelector('.hardware')?.getAttribute('data-hardware-side') ?? null, slab: leaf.querySelector('.door-style-image')?.getAttribute('src'), color: (leaf as HTMLElement).style.getPropertyValue('--door') })))
      const activePhysicalSide = doorHandingSides(handing).lockSide === 'right' ? 'left' : 'right'
      assert.equal(exteriorOwnership.filter(leaf => leaf.mode === 'full').length, mode === 'DDLLBO' ? 2 : 1)
      if (mode !== 'DDLLBO') assert.equal(exteriorOwnership.find(leaf => leaf.mode === 'full')!.physical, activePhysicalSide)
      for (const view of ['Interior', 'Both', 'Exterior']) {
        await page.getByRole('button', { name: view, exact: true }).click(); await ready(page)
        for (const viewpoint of view === 'Both' ? ['Exterior', 'Interior'] : [view]) {
          const panel = page.locator(`#hardware-live [data-viewpoint="${viewpoint}"]`)
          const interior = viewpoint === 'Interior'
          assert.equal(await panel.locator('.door-frame').getAttribute('data-sidelites'), interior ? 'left' : 'right', 'One-sided sidelite changes screen side exactly once')
          assert.equal(await panel.locator('.door-frame-sidelite').evaluate(element => getComputedStyle(element).transform), interior ? 'matrix(-1, 0, 0, 1, 0, 0)' : 'none', 'Sidelite surface also reverses within its already-mapped screen slot')
          assert.equal(await panel.locator('.door-frame').evaluate(element => getComputedStyle(element).scale), 'none', 'French does not blanket-flip the frame/hardware/text')
          for (const leaf of exteriorOwnership) {
            const node = panel.locator(`[data-physical-leaf="${leaf.physical}"]`)
            const screenSide = await node.evaluate(element => { const box = element.getBoundingClientRect(), frame = element.closest('.door-frame-door-slot')!.getBoundingClientRect(); return box.x + box.width / 2 < frame.x + frame.width / 2 ? 'left' : 'right' })
            assert.equal(screenSide, interior ? leaf.physical === 'left' ? 'right' : 'left' : leaf.physical)
            assert.equal(await node.locator('.door-style-image').getAttribute('src'), leaf.slab)
            assert.equal(await node.evaluate(element => (element as HTMLElement).style.getPropertyValue('--door')), leaf.color)
            assert.equal(await node.locator('.door-glass-overlay').count(), 1, 'Glass stays attached to this physical leaf')
            assert.equal(await node.locator('.door-glass-assembly').evaluate(element => getComputedStyle(element).transform), interior ? 'matrix(-1, 0, 0, 1, 0, 0)' : 'none')
            assert.equal(await node.locator('.hardware').count(), leaf.mode ? 1 : 0)
            if (leaf.mode) {
              assert.equal(await node.locator('.hardware').getAttribute('data-hardware-mode'), leaf.mode, 'Full/prep assignment belongs to the same physical slab')
              assert.equal(await node.locator('.hardware').getAttribute('data-hardware-side'), interior ? leaf.side === 'left' ? 'right' : 'left' : leaf.side)
              assert.equal(await node.locator('.hardware img').getAttribute('src'), hardwarePreviewAssetUrl(hardwareOptions[hardwareIndex], viewpoint as 'Exterior' | 'Interior'))
              assert.equal(await node.locator('.hardware').evaluate(element => getComputedStyle(element).transform), 'none', 'Hardware is excluded from the surface mirror')
            }
          }
          checked++
        }
        assert.deepEqual(await page.evaluate(() => { const f = window as unknown as Fixture; return { config: f.hardwareConfiguration(), payload: f.hardwareSubmission() } }), before, 'View switching never changes configuration or exported codes')
      }
    }
    // Strong visual fixture: one-sided sidelite, decorative glass, Clay and
    // different full/prep hardware on the two physical leaves.
    await page.evaluate(() => (window as unknown as Fixture).selectHanding('LHI'))
    await page.getByRole('button', { name: 'DDLLKP', exact: true }).click()
    await page.getByRole('button', { name: 'Exterior', exact: true }).click(); await ready(page)
    const pdfExterior = await page.evaluate(() => (window as unknown as Fixture).renderHardwarePdf())
    await page.locator('#hardware-live .door-leaf-left .hardware').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden' })
    const beforeCapture = await page.locator('#hardware-live .door-leaf-left').screenshot()
    await page.locator('#hardware-live .door-leaf-left .hardware').evaluate(element => { (element as HTMLElement).style.visibility = '' })
    await page.getByRole('button', { name: 'Interior', exact: true }).click(); await ready(page)
    await page.locator('#hardware-live .door-leaf-left .hardware').evaluate(element => { (element as HTMLElement).style.visibility = 'hidden' })
    const insideSurface = await page.locator('#hardware-live .door-leaf-left').screenshot()
    await page.locator('#hardware-live .door-leaf-left .hardware').evaluate(element => { (element as HTMLElement).style.visibility = '' })
    const expectedPixels = await sharp(beforeCapture).flop().resize(100, 250).ensureAlpha().raw().toBuffer()
    const actualPixels = await sharp(insideSurface).resize(100, 250).ensureAlpha().raw().toBuffer()
    const difference = actualPixels.reduce((sum, value, index) => sum + Math.abs(value - expectedPixels[index]), 0) / actualPixels.length
    assert.ok(difference < 8, `Same physical slab's glass/finish surface mirrors once (${difference})`)
    const captured = await page.evaluate(() => (window as unknown as Fixture).captureHardware())
    assert.ok(captured.dataUrl.startsWith('data:image/png;base64,'))
    await writeFile(`/tmp/french-interior-capture-${width}.png`, Buffer.from(captured.dataUrl.split(',')[1], 'base64'))
    const pdfInteriorScreen = await page.evaluate(() => (window as unknown as Fixture).renderHardwarePdf())
    assert.equal(pdfInteriorScreen.view, 'Exterior', 'There is no interior PDF mode; PDF stays explicitly Exterior')
    assert.equal(pdfInteriorScreen.dataUrl, pdfExterior.dataUrl)
    await page.evaluate(() => (window as unknown as Fixture).enableAiSource())
    await page.locator('output[data-ai-ready="true"]').waitFor({ state: 'attached' })
    assert.equal(await page.locator('.configured-door-capture-host .door-frame').getAttribute('data-view'), 'Exterior')
    assert.equal(await page.locator('.configured-door-capture-host .hardware img').first().getAttribute('src'), hardwarePreviewAssetUrl(hardwareOptions[hardwareIndex], 'Exterior'))
    await page.getByRole('button', { name: 'Both', exact: true }).click(); await ready(page)
    await page.locator('#hardware-live').screenshot({ path: `/tmp/french-interior-both-${width}.png` })
    assert.deepEqual(errors, [])
    console.log(`${width}px: all 4 handing IDs, 3 lock modes, physical leaf identity, glass/finish, one-sided sidelite, immutable configuration/submission, interior capture and exterior PDF/AI reference passed.`)
    await page.close()
  }
  console.log(`${checked} asymmetric French view checks passed; no real AI requests.`)
} finally { await browser?.close(); server.kill('SIGTERM') }
