import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5193', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5193')) resolve() })
    server.once('error', reject); server.once('exit', code => reject(new Error(`Vite exited ${code}`)))
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const page = await browser.newPage()
  await page.addInitScript('window.__name = (fn) => fn')
  await page.goto('http://127.0.0.1:5193/scripts/jambReferenceHarness.html')
  const results = []
  let previousSource = ''
  for (const color of ['paint-white', 'paint-brown', 'paint-black', 'stain-midnight-blue']) {
    await page.getByRole('button', { name: `${color} jamb`, exact: false }).click()
    await page.locator(`img[data-reference="${color}"]`).waitFor()
    await page.waitForFunction(previous => { const image = document.querySelector<HTMLImageElement>('img[data-reference]'); return image && image.src !== previous && image.complete }, previousSource)
    previousSource = (await page.locator('img[data-reference]').getAttribute('src'))!
    const liveColor = await page.locator('.preview-scene').first().locator('.door-frame-svg-base stop').nth(1).getAttribute('stop-color')
    assert.ok(liveColor, 'Live preview has the selected frame color')
    const stops = await page.locator('.preview-scene').first().locator('.door-frame-svg-base stop').evaluateAll(elements => elements.map(element => element.getAttribute('stop-color')))
    assert.equal(stops[2], liveColor, 'Frame highlight keeps the selected finish rather than mixing white')
    const result = await page.locator(`img[data-reference="${color}"]`).evaluate(async element => {
      const image = element as HTMLImageElement; await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0)
      return { dataUrl: canvas.toDataURL(), pixel: [...ctx.getImageData(20, canvas.height / 2, 1, 1).data], width: canvas.width, height: canvas.height }
    })
    results.push(result)
    const preparedPixel = await page.evaluate(async () => {
      const image = new Image()
      image.src = await (window as unknown as { prepareJambReference: (source: string) => Promise<string> }).prepareJambReference(document.querySelector<HTMLImageElement>('img[data-reference]')!.src)
      await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0)
      return [...ctx.getImageData(20, canvas.height / 2, 1, 1).data]
    })
    result.pixel.forEach((channel, index) => assert.ok(Math.abs(channel - preparedPixel[index]) < 8, 'AI input encoding preserves the jamb color'))
    const expected = liveColor!.slice(1).match(/../g)!.map(channel => parseInt(channel, 16))
    expected.forEach((channel, index) => assert.ok(Math.abs(channel - result.pixel[index]) < 12, 'Captured jamb matches live configured jamb'))
    if (color === 'paint-black' || color === 'stain-midnight-blue') {
      assert.ok(result.pixel.slice(0, 3).every(channel => channel < 50), 'Dark jamb remains near-black in capture')
      assert.ok(preparedPixel.slice(0, 3).every(channel => channel < 50), 'Dark jamb remains near-black in AI input')
    }
    await writeFile(`/tmp/jamb-reference-${color}.png`, Buffer.from(result.dataUrl.split(',')[1], 'base64'))
  }
  console.log(results.map(({ pixel, width, height }) => ({ pixel, width, height })))
  assert.notDeepEqual(results[0].pixel, results[1].pixel, 'Configured jamb color must change the captured jamb pixels')
} finally { await browser?.close(); server.kill('SIGTERM') }
