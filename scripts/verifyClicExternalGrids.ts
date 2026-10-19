import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { externalGridArtwork } from '../src/data/externalGridArtwork'
import { glassOptions } from '../src/data/glassOptions'
import { clicOrderingCodes } from '../src/data/clicGlass'
import type { GridPattern } from '../src/types'

const cases: [string, number][] = [['F', 8], ['F', 10], ['F', 15], ['F48', 12], ['F482', 12], ['S', 4], ['S', 9]]
const renderCases = process.argv.includes('--three-quarter-only') ? cases.filter(([code]) => code.startsWith('F48')) : cases
sharp.cache(false)
for (const [code, lites] of cases) {
  const path = code.startsWith('F48') ? '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F1248WH.webp' : externalGridArtwork(code, `${lites} Lite` as GridPattern)!
  assert.ok(existsSync(`public${path}`), `Missing ${code}/${lites}: ${path}`)
  const prefix = code.startsWith('F48') ? 'f48' : code.toLowerCase()
  const option = glassOptions.find(item => item.id === `${prefix}-clic-ext-${lites}l`)!
  assert.equal(option.overlaysByDoorStyle[code], path)
  assert.deepEqual(option.orderingCodes, clicOrderingCodes(option.id))
}
assert.equal(externalGridArtwork('S', '15 Lite'), undefined)
assert.equal(externalGridArtwork('F48', '8 Lite'), undefined)
assert.equal(externalGridArtwork('F48', '12 Lite'), '/assets/hgi-assets/Glass/F48/INTERNAL GRIDS/F48INT12LWH.webp', 'Ordinary clear resolver unchanged')
assert.equal(glassOptions.find(item => item.id === 'f48-clear-grids')!.overlaysByDoorStyle.F48, externalGridArtwork('F48', '12 Lite'))
assert.equal(glassOptions.find(item => item.id === 'f48-clear-grids')!.overlaysByDoorStyle.F482, externalGridArtwork('F482', '12 Lite'))
const output = '/private/tmp/hgi-clic-external-grids'
await mkdir(output, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5231', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const pixels = async (data: string | Buffer) => sharp(typeof data === 'string' ? Buffer.from(data.split(',')[1], 'base64') : data).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5231')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' })
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') console.log(message.text()) })
  await page.route('**/api/**', route => route.abort())
  const render = async (code: string, lites: number, kind: 'clear' | 'clic' | 'approved-contoured', finish: string) => {
    await page.goto('http://127.0.0.1:5231/scripts/clicExternalGridHarness.html')
    await page.waitForFunction(() => 'renderExternalGridCase' in window)
    const result = await page.evaluate(async args => (window as any).renderExternalGridCase(...args), [code, lites, kind, finish])
    assert.ok(result.assets.includes(result.expectedOverlay))
    return { ...result, preview: await page.locator('.pair-preview').screenshot({ animations: 'disabled' }) }
  }
  for (const finish of ['paint-clay', 'stain-nutmeg']) for (const [code, lites] of renderCases) {
    const clear = await render(code, lites, 'clear', finish)
    const clic = await render(code, lites, 'clic', finish)
    const reference = code.startsWith('F48') ? await render(code, lites, 'approved-contoured', finish) : clear
    for (const channel of ['preview', 'pdf', 'ai'] as const) {
      const a = await pixels(reference[channel]), b = await pixels(clic[channel])
      assert.deepEqual(b.info, a.info, `${code}/${lites}/${finish}/${channel} dimensions`)
      assert.ok(b.data.equals(a.data), `${code}/${lites}/${finish}/${channel} must match its approved artwork reference`)
      if (code.startsWith('F48')) assert.ok(!b.data.equals((await pixels(clear[channel])).data), 'Contoured CLiC must visibly differ from unchanged ordinary clear')
      const data = channel === 'preview' ? clic[channel] : Buffer.from(clic[channel].split(',')[1], 'base64')
      await writeFile(`${output}/${code}-${lites}-${finish}-${channel}.png`, data)
    }
    await sharp({ create: { width: 640, height: 650, channels: 4, background: '#fff' } }).composite([{ input: clear.preview, left: 0, top: 0 }, { input: clic.preview, left: 320, top: 0 }]).png().toFile(`${output}/${code}-${lites}-${finish}-comparison.png`)
    console.log(`Approved artwork verified in preview/PDF/AI reference: ${code} ${lites}-lite ${finish}`)
  }
  console.log(`PASS: ${renderCases.length * 2} comparisons / ${renderCases.length * 6} pixel-equality checks; screenshots in ${output}. No AI calls.`)
} finally { await browser?.close(); server.kill() }
