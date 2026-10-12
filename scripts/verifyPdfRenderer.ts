import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { configurationPdfDownloadName } from '../src/utils/pdfConfig'
import { doorStyles, finishes } from '../src/data/options'

const output = '/private/tmp/hgi-pdf-renderer-verification'
await mkdir(output, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5190', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
type RenderResult = { dataUrl: string; width: number; height: number; assets: string[]; geometry: { totalWidth: number; totalHeight: number; doorLeft: number; contentLeft: number; contentTop: number; leftSideliteWidth: number; centerMeetingStileWidth: number; hasLeft: boolean; hasRight: boolean } }
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5190')) resolve() })
    server.once('error', reject)
    server.once('exit', code => reject(new Error(`Vite exited with ${code}`)))
    setTimeout(() => reject(new Error('Vite test server did not start')), 10_000).unref()
  })
  browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Manila' })
  await page.goto('http://127.0.0.1:5190/scripts/pdfRendererHarness.html')
  await page.waitForFunction(() => 'pdfFixtures' in window)
  const names = await page.evaluate(() => (window as unknown as { pdfFixtures: string[] }).pdfFixtures)
  const results: RenderResult[] = []
  for (let i = 0; i < names.length; i++) {
    const result = await page.evaluate(index => (window as unknown as { renderFixture: (i: number) => Promise<RenderResult> }).renderFixture(index), i)
    assert.equal(result.width, 1200); assert.equal(result.height, 1600)
    const bytes = Buffer.from(result.dataUrl.split(',')[1], 'base64')
    const metadata = await sharp(bytes).metadata()
    assert.equal(metadata.format, 'png'); assert.equal(metadata.hasAlpha, true)
    await writeFile(`${output}/${names[i]}.png`, bytes)
    const again = await page.evaluate(index => (window as unknown as { renderFixture: (i: number) => Promise<RenderResult> }).renderFixture(index), i)
    assert.equal(again.dataUrl, result.dataUrl, `${names[i]} is deterministic`)
    results.push(result)
    console.log(`PDF renderer: ${names[i]} passed (${result.assets.length} resolved source assets).`)
  }
  for (const [name, finishId] of [['N1-white', 'paint-white'], ['N1-clay', 'paint-clay'], ['N1-black', 'paint-black'], ['N1-stain', 'stain-nutmeg']]) {
    const result = results[names.indexOf(name)]
    const g = result.geometry
    const scale = Math.min((result.width - 32) / g.totalWidth, (result.height - 32) / g.totalHeight)
    const x = Math.round((result.width - g.totalWidth * scale) / 2 + (g.doorLeft + 121) * scale)
    const y = Math.round((result.height - g.totalHeight * scale) / 2 + (g.contentTop + 400) * scale)
    const pixels = await sharp(Buffer.from(result.dataUrl.split(',')[1], 'base64')).ensureAlpha().raw().toBuffer()
    const rgba = Array.from(pixels.subarray((y * result.width + x) * 4, (y * result.width + x) * 4 + 4))
    const finish = finishes.find(item => item.id === finishId)!
    const rgb = [1, 3, 5].map(offset => parseInt(finish.color.slice(offset, offset + 2), 16))
    assert.equal(rgba[3], 255, `${name}: solid slab paint must be opaque, not masked by artwork alpha (${rgba})`)
    rgb.forEach((channel, i) => assert.ok(rgba[i] >= channel * .7 - 3 && rgba[i] <= channel + 3, `${name}: selected finish hex is retained with relief shading (${rgba}, ${finish.color})`))
    const live = await page.evaluate(index => (window as unknown as { mountLiveFixture: (i: number) => Promise<{ finishId: string; finishHex: string }> }).mountLiveFixture(index), names.indexOf(name))
    assert.equal(live.finishId, finishId); assert.equal(live.finishHex, finish.color)
    const bounds = await page.locator('#live-preview .door-leaf').first().boundingBox()
    assert.ok(bounds)
    const sample = await page.screenshot({ clip: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height * 400 / 549, width: 1, height: 1 } })
    const livePixel = await sharp(sample).ensureAlpha().raw().toBuffer()
    rgba.slice(0, 3).forEach((channel, i) => assert.ok(Math.abs(channel - livePixel[i]) <= 12, `${name}: PDF and live finish match (${rgba} vs ${[...livePixel]})`))
    await page.locator('#live-preview').screenshot({ path: `${output}/${name}-live.png` })
    console.log(`${name}: selected ${finish.color}; PDF slab RGBA ${rgba}`)
  }
  const clayPdf = await page.evaluate(index => (window as unknown as { createFinishPdf: (i: number) => Promise<string> }).createFinishPdf(index), names.indexOf('N1-clay'))
  await writeFile(`${output}/N1-clay.pdf`, Buffer.from(clayPdf.split(',')[1], 'base64'))
  for (const name of ['smooth-steel-ssl', 'textured-fiberglass-ssl']) {
    const index = names.indexOf(name)
    const result = results[index]
    const expectedSlab = name === 'smooth-steel-ssl' ? '/assets/hgi-assets/Sidelites/20 Gauge/SSL.webp' : '/assets/hgi-assets/Sidelites/Signature/Oak/SSL.webp'
    assert.ok(result.assets.some(asset => decodeURI(asset).endsWith(expectedSlab)), `${name}: PDF uses correct material slab`)
    await page.evaluate(index => (window as unknown as { mountLiveFixture: (i: number) => Promise<unknown> }).mountLiveFixture(index), index)
    assert.ok(await page.locator('#live-preview img').evaluateAll((images, path) => images.some(image => decodeURI((image as HTMLImageElement).src).endsWith(path)), expectedSlab), `${name}: live preview uses identical material slab`)
    await page.locator('#live-preview').screenshot({ path: `${output}/${name}-live.png` })
  }
  assert.notEqual(results[names.indexOf('smooth-steel-ssl')].dataUrl, results[names.indexOf('textured-fiberglass-ssl')].dataUrl, 'Smooth/textured material results remain distinct')
  await page.setViewportSize({ width: 390, height: 844 })
  for (const i of [1, 4, 11]) {
    const mobile = await page.evaluate(index => (window as unknown as { renderFixture: (i: number) => Promise<RenderResult> }).renderFixture(index), i)
    assert.equal(mobile.dataUrl, results[i].dataUrl, `${names[i]} identical at mobile size`)
  }
  const retinaContext = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2 })
  const retina = await retinaContext.newPage()
  await retina.goto('http://127.0.0.1:5190/scripts/pdfRendererHarness.html')
  await retina.waitForFunction(() => 'pdfFixtures' in window)
  const retinaOutput = await retina.evaluate(() => (window as unknown as { renderFixture: (i: number) => Promise<RenderResult> }).renderFixture(1))
  assert.equal(retinaOutput.dataUrl, results[1].dataUrl, 'Output is identical at tablet size and DPR 2')
  await retinaContext.close()
  const black = results[6], g = black.geometry
  const scale = Math.min((black.width - 32) / g.totalWidth, (black.height - 32) / g.totalHeight)
  const left = (black.width - g.totalWidth * scale) / 2, top = (black.height - g.totalHeight * scale) / 2
  const raw = await sharp(Buffer.from(black.dataUrl.split(',')[1], 'base64')).ensureAlpha().raw().toBuffer()
  function pixel(x: number, y: number) {
    const index = (Math.round(top + y * scale) * black.width + Math.round(left + x * scale)) * 4
    return Array.from(raw.subarray(index, index + 4))
  }
  const slab = pixel(g.doorLeft + 121, g.contentTop + 400)
  const side = pixel(g.contentLeft + 5, g.contentTop + 400)
  assert.equal(slab[3], 255); assert.equal(side[3], 255)
  // Allow a tiny rasterization variance around the configured #242424 while
  // still guarding against the prior washed-out gray regression.
  assert.ok(Math.max(...slab.slice(0, 3)) <= 40, `Black slab is not washed out: ${slab}`)
  assert.ok(Math.max(...side.slice(0, 3)) <= 40, `Black sidelite is not washed out: ${side}`)
  assert.equal(results[5].geometry.hasLeft, true); assert.equal(results[5].geometry.hasRight, false)
  assert.equal(results[12].geometry.hasLeft, false); assert.equal(results[12].geometry.hasRight, true)
  assert.equal(g.leftSideliteWidth, 242 * .35)
  assert.equal(results[8].geometry.centerMeetingStileWidth, 7)
  const hardwareVariant = await page.evaluate(() => (window as unknown as { renderHardwareVariant: () => Promise<RenderResult> }).renderHardwareVariant())
  assert.notEqual(hardwareVariant.dataUrl, results[10].dataUrl, 'Selected hardware changes the rendered image')
  const withoutGrid = await page.evaluate(() => (window as unknown as { renderWithoutGrid: () => Promise<RenderResult> }).renderWithoutGrid())
  assert.notEqual(withoutGrid.dataUrl, results[4].dataUrl, 'Grid artwork is present in the product output')
  await assert.rejects(page.evaluate(() => (window as unknown as { renderMissingAsset: () => Promise<unknown> }).renderMissingAsset()), /missing-pdf-glass.png/)
  let release!: () => void, arrived!: () => void
  const seen = new Promise<void>(resolve => { arrived = resolve })
  await page.route('**/*pdf-delay-test', async route => { arrived(); await new Promise<void>(resolve => { release = resolve }); await route.continue() })
  let completed = false
  const delayed = page.evaluate(() => (window as unknown as { renderDelayedAsset: () => Promise<RenderResult> }).renderDelayedAsset()).then(result => { completed = true; return result })
  await seen
  assert.equal(completed, false, 'No export while a required asset is pending')
  release()
  assert.equal((await delayed).dataUrl, results[11].dataUrl, 'One frozen snapshot is used despite a later finish mutation')
  const pdf = await page.evaluate(() => (window as unknown as { createPdf: () => Promise<string> }).createPdf())
  await writeFile(`${output}/configured-door.pdf`, Buffer.from(pdf.split(',')[1], 'base64'))
  const downloadPromise = page.waitForEvent('download')
  await page.clock.setFixedTime(new Date('2026-10-07T14:52:00Z'))
  await page.evaluate(() => (window as unknown as { downloadPdf: () => Promise<void> }).downloadPdf())
  const download = await downloadPromise
  const expectedName = (minute: number) => configurationPdfDownloadName(doorStyles.find(style => style.code === 'F'), finishes.find(finish => finish.id === 'stain-nutmeg'), new Date(2026, 9, 7, 22, minute))
  assert.equal(download.suggestedFilename(), expectedName(52))
  await download.saveAs(`${output}/download-button-configured-door.pdf`)
  await page.clock.setFixedTime(new Date('2026-10-07T14:54:00Z'))
  const secondDownloadPromise = page.waitForEvent('download')
  await page.evaluate(() => (window as unknown as { downloadPdf: () => Promise<void> }).downloadPdf())
  const secondDownload = await secondDownloadPromise
  assert.equal(secondDownload.suggestedFilename(), expectedName(54))
  assert.notEqual(secondDownload.suggestedFilename(), download.suggestedFilename(), 'Timestamp comes from download time, not builder entry time')
  console.log(`PDF tests passed: ${names.length} configurations, repeat determinism, mobile independence, opaque dark surfaces, placement, missing/pending assets. Black slab RGBA ${slab}; sidelite ${side}. PDF: ${output}/configured-door.pdf`)
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
