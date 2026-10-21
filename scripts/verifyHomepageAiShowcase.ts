import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { HOMEPAGE_AI_DOORS, HOMEPAGE_DOOR_INTERVAL_MS, HOMEPAGE_DOOR_FADE_MS } from '../src/features/hero/homepageAiDoors'

const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
assert.equal(HOMEPAGE_AI_DOORS.length, 22)
assert.equal(HOMEPAGE_DOOR_INTERVAL_MS, 5000)
assert.equal(HOMEPAGE_DOOR_FADE_MS, 700)
assert.equal(new Set(HOMEPAGE_AI_DOORS.map(i => i.src)).size, 22)
assert.equal(hash(await readFile('public/assets/hero/hero-entryway.webp')), '14ad782598be1ae0970ec23bc41538b5f01f7cc9ffd80b70e250dec216cea403')
let totalBytes = 0
for (const [index, asset] of HOMEPAGE_AI_DOORS.entries()) {
  assert.equal(asset.id, index + 1)
  const bytes = await readFile(`public${asset.src}`)
  assert.equal(hash(bytes), asset.sha256)
  const metadata = await sharp(bytes).metadata()
  assert.equal(metadata.width, 224); assert.equal(metadata.height, 508)
  totalBytes += bytes.length
}
assert.equal(totalBytes, 182730)
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5196', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const active = '.hero-ai-layer.active'
const output = '/tmp/hgi-home-ai-22'
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5196')) resolve() })
    server.once('error', reject); server.once('exit', code => reject(new Error(`Vite exited ${code}`)))
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  await mkdir(output, { recursive: true })
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  // Observe the committed fade atomically rather than racing its 700ms lifetime
  // with several remote browser assertions on a busy development machine.
  const requested = new Set<string>(), errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('request', r => { if (r.url().includes('/assets/hero/ai-doors/')) requested.add(r.url()) })
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  await page.goto('http://127.0.0.1:5196/')
  await page.locator(`${active}[data-homepage-door="1"]`).waitFor()
  await page.evaluate(`window.__heroTransitions=[];new MutationObserver(()=>{const current=document.querySelector('.hero-ai-layer.active');if(!current)return;const id=Number(current.dataset.homepageDoor);if(window.__heroTransitions.at(-1)?.id===id)return;const previous=document.querySelector('.hero-ai-layer.previous');window.__heroTransitions.push({id,previous:previous?Number(previous.dataset.homepageDoor):null,previousOpacity:previous?getComputedStyle(previous).opacity:null});}).observe(document.querySelector('.hero-door-overlay'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});`)
  assert.ok(requested.size <= 2, `Fetched ${requested.size} doors at startup`)
  assert.equal(await page.locator('link[rel="preload"][as="image"]').getAttribute('href'), HOMEPAGE_AI_DOORS[0].src)
  assert.equal(await page.locator('img[src*="/generated/hero-doors/"]').count(), 0)
  const seen: number[] = [1]
  for (let id = 2; id <= 22; id++) {
    await page.locator(`${active}[data-homepage-door="${id}"]`).waitFor({ timeout: HOMEPAGE_DOOR_INTERVAL_MS + 3000 })
    assert.equal(await page.locator(`${active} img`).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), true)
    const opacity = await page.locator(`${active}`).evaluate(el => getComputedStyle(el).animationDuration)
    assert.equal(opacity, '0.7s')
    seen.push(id)
  }
  await page.locator(`${active}[data-homepage-door="1"]`).waitFor({ timeout: HOMEPAGE_DOOR_INTERVAL_MS + 3000 })
  assert.deepEqual(seen, HOMEPAGE_AI_DOORS.map(i => i.id))
  const transitions = await page.evaluate(() => (window as unknown as { __heroTransitions: { id: number; previous: number; previousOpacity: string }[] }).__heroTransitions)
  for (let id = 2; id <= 22; id++) assert.ok(transitions.some(t => t.id === id && t.previous === id - 1 && t.previousOpacity === '1'), `Missing opaque prior layer for door ${id}: ${JSON.stringify(transitions)}`)
  assert.equal(requested.size, 22); assert.deepEqual(errors, [])
  console.log('PASS: all 22 in manifest order and wraparound; decoded incoming image, 700ms fade, opaque previous layer, lazy upcoming fetch, unchanged background hash')
  await page.close()

  // Broken second image and delayed fourth image: retain the last good doorway.
  const failures = await browser.newPage()
  let releaseSlow: (() => void) | undefined
  const delay = new Promise<void>(resolve => { releaseSlow = resolve })
  await failures.route(`**${HOMEPAGE_AI_DOORS[1].src}`, r => r.abort())
  await failures.route(`**${HOMEPAGE_AI_DOORS[3].src}`, async r => { await delay; await r.continue().catch(() => {}) })
  await failures.goto('http://127.0.0.1:5196/')
  await failures.locator(`${active}[data-homepage-door="1"]`).waitFor()
  await failures.waitForTimeout(HOMEPAGE_DOOR_INTERVAL_MS + 300)
  assert.equal(await failures.locator(active).getAttribute('data-homepage-door'), '1')
  await failures.locator(`${active}[data-homepage-door="3"]`).waitFor()
  await failures.waitForTimeout(HOMEPAGE_DOOR_INTERVAL_MS + 300)
  assert.equal(await failures.locator(active).getAttribute('data-homepage-door'), '3')
  releaseSlow!()
  await failures.locator(`${active}[data-homepage-door="4"]`).waitFor({ timeout: HOMEPAGE_DOOR_INTERVAL_MS + 3000 })
  await failures.locator('.start-building').click()
  await failures.locator('.hero-ai-layer').waitFor({ state: 'detached' })
  assert.equal(await failures.locator('link[rel="preload"][as="image"]').count(), 0)
  console.log('PASS: failed image skipped, slow image retains previous door, recovery, homepage unmount cleans preload')
  await failures.close()

  for (const [width, height] of [[1440, 1000], [820, 1180], [1180, 820], [390, 844], [320, 740]]) {
    const p = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
    const requests = new Set<string>()
    p.on('request', r => { if (r.url().includes('/assets/hero/ai-doors/')) requests.add(r.url()) })
    await p.goto('http://127.0.0.1:5196/')
    await p.locator(`${active} img`).evaluate(async (img: HTMLImageElement) => img.decode())
    const geometry = await p.evaluate(() => {
      const slot = document.querySelector('.hero-door-overlay')!.getBoundingClientRect(), stage = document.querySelector('.hero-composite-stage')!.getBoundingClientRect(), frame = document.querySelector('.hero-composite')!.getBoundingClientRect()
      return { left: (slot.left - stage.left) / stage.width * 100, top: (slot.top - stage.top) / stage.height * 100, width: slot.width / stage.width * 100, height: slot.height / stage.height * 100, centered: Math.abs(slot.top + slot.height / 2 - frame.top - frame.height / 2) < 1, overflow: document.documentElement.scrollWidth > innerWidth }
    })
    assert.ok(Math.abs(geometry.left - 45.3) < .02 && Math.abs(geometry.top - 25.12) < .02 && Math.abs(geometry.width - 17.86) < .02 && Math.abs(geometry.height - 40.51) < .02)
    assert.equal(geometry.centered, true); assert.equal(geometry.overflow, false)
    await p.screenshot({ path: `${output}/home-${width}.png`, fullPage: true })
    if (width === 390) {
      await p.waitForTimeout(HOMEPAGE_DOOR_INTERVAL_MS + 300)
      assert.equal(await p.locator(active).getAttribute('data-homepage-door'), '1')
      assert.equal(requests.size, 1)
      await p.emulateMedia({ reducedMotion: 'no-preference' })
      await p.locator(`${active}[data-homepage-door="2"]`).waitFor({ timeout: HOMEPAGE_DOOR_INTERVAL_MS + 3000 })
      await p.emulateMedia({ reducedMotion: 'reduce' })
      const stopped = await p.locator(active).getAttribute('data-homepage-door')
      await p.waitForTimeout(HOMEPAGE_DOOR_INTERVAL_MS + 300)
      assert.equal(await p.locator(active).getAttribute('data-homepage-door'), stopped)
    }
    console.log(`PASS ${width}x${height}: original anchor, alignment, no overflow, responsive screenshot`)
    await p.close()
  }
  console.log(`PASS: reduced motion fetches first only, pauses and resumes. Assets ${totalBytes} bytes. Screenshots ${output}`)
} finally { await browser?.close(); server.kill() }
