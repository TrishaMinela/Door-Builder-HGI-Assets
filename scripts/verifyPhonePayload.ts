import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn, execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { AI_MAX_REQUEST_BYTES } from '../src/features/home-visualizer/aiImagePreparation'
import handler from '../api/generate-door-visualization'

function noise(width: number, height: number) {
  const buffer = Buffer.alloc(width * height * 3)
  let seed = 78231
  for (let i = 0; i < buffer.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; buffer[i] = seed >>> 24 }
  return sharp(buffer, { raw: { width, height, channels: 3 } })
}
const phone = await noise(1536, 1024).resize(6000, 4000, { kernel: 'nearest' }).jpeg({ quality: 98 }).toBuffer()
const portrait = await sharp(phone).withMetadata({ orientation: 6 }).jpeg({ quality: 98 }).toBuffer()
const reference = await noise(800, 1500).png().toBuffer()
await writeFile('/tmp/ai-phone-fixture.jpg', phone)
let heic: Buffer | undefined
try { execFileSync('/usr/bin/sips', ['-s', 'format', 'heic', '/tmp/ai-phone-fixture.jpg', '--out', '/tmp/ai-phone-fixture.heic'], { stdio: 'pipe' }); heic = await readFile('/tmp/ai-phone-fixture.heic') } catch { console.log('HEIC fixture encoder unavailable; HEIC test explicitly skipped.') }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5194', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const originalFetch = globalThis.fetch
const originalApiKey = process.env.OPENAI_API_KEY
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5194')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.addInitScript('window.__name = (fn) => fn')
    await page.goto('http://127.0.0.1:5194/scripts/aiVisualizerHarness.html')
    let captured = ''
    await page.route('**/api/generate-door-visualization', async route => { captured = route.request().postData()!; assert.ok(Buffer.byteLength(captured) <= AI_MAX_REQUEST_BYTES); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ image: 'data:image/jpeg;base64,YWk=' }) }) })
    for (const [name, bytes, type] of [['Android landscape', phone, 'image/jpeg'], ['iPhone EXIF portrait', portrait, 'image/jpeg'], ...(heic ? [['iPhone HEIC', heic, 'image/heic']] : [])] as [string, Buffer, string][]) {
      const result = await page.evaluate(async ({ data, reference, type, configuration }) => {
        const { prepareAiHousePhoto, prepareAiConfiguredProductReference, generateAiVisualization } = await import('/src/features/home-visualizer/aiVisualization.ts')
        const { normalizePhoto } = await import('/src/features/home-visualizer/HomeVisualizer.tsx')
        const sourceBlob = await (await fetch(data)).blob()
        const file = await normalizePhoto(new File([sourceBlob], type === 'image/heic' ? 'phone.heic' : 'phone.jpg', { type }), type === 'image/heic' ? 'heif' : 'jpeg')
        const url = URL.createObjectURL(file)
        try {
          const prepared = await prepareAiHousePhoto(url)
          const again = await prepareAiHousePhoto(url)
          const product = await prepareAiConfiguredProductReference(reference)
          const before = new TextEncoder().encode(JSON.stringify({ photo: prepared.photo, productReference: product, configuration, fitStrategy: 'use-selected-product' })).length
          await generateAiVisualization({ photoUrl: url, productReferenceUrl: reference, configuration, fitStrategy: 'use-selected-product', uploadMetadata: { mimeType: type, format: type === 'image/heic' ? 'heif' : 'jpeg', byteSize: sourceBlob.size } })
          return { before, cacheReused: prepared === again, source: [prepared.naturalWidth, prepared.naturalHeight], firstNormalized: [prepared.width, prepared.height], firstNormalizedBytes: Math.floor((prepared.photo.length - prepared.photo.indexOf(',') - 1) * .75) }
        } finally { URL.revokeObjectURL(url) }
      }, { data: `data:${type};base64,${bytes.toString('base64')}`, reference: `data:image/png;base64,${reference.toString('base64')}`, type, configuration: aiTestConfiguration })
      const body = JSON.parse(captured)
      const decoded = Buffer.from(body.photo.split(',')[1], 'base64')
      const metadata = await sharp(decoded).metadata()
      assert.equal(metadata.format, 'webp'); assert.ok(Math.max(metadata.width!, metadata.height!) <= 1536)
      assert.ok(result.cacheReused)
      assert.ok(decoded.length < bytes.length)
      if (name.includes('portrait')) assert.ok(metadata.height! > metadata.width!, 'EXIF orientation is respected')
      if (result.before > AI_MAX_REQUEST_BYTES) assert.ok(Math.max(metadata.width!, metadata.height!) <= 1280, 'Oversized combined request automatically steps down')
      console.log({ viewport: width, fixture: name, originalBytes: bytes.length, source: result.source, firstNormalized: result.firstNormalized, firstNormalizedBytes: result.firstNormalizedBytes, normalized: [metadata.width, metadata.height], normalizedBytes: decoded.length, referenceBytes: Buffer.from(body.productReference.split(',')[1], 'base64').length, initialJsonBytes: result.before, finalJsonBytes: Buffer.byteLength(captured), maskBytes: 0 })
      if (width === 1280 && name === 'Android landscape') {
        // Verify the real handler and its final multipart request, without a
        // paid OpenAI call. No customer data or authorization is printed.
        process.env.OPENAI_API_KEY = 'test-only-not-a-real-key'
        let openAiCalls = 0, multipartBytes = 0
        globalThis.fetch = (async (_url, init) => {
          openAiCalls++
          const form = init!.body as FormData
          assert.equal(form.getAll('image[]').length, 3, 'One house plus the two existing product references; no duplicate house')
          assert.equal(form.get('mask'), null, 'Automatic path adds no manual mask')
          multipartBytes = (await new Response(form).blob()).size
          return new Response(JSON.stringify({ data: [{ b64_json: 'YWk=' }] }), { status: 200 })
        }) as typeof fetch
        let status = 0
        const response = { status(value: number) { status = value; return this }, json() {}, setHeader() {} }
        await handler({ method: 'POST', body: captured }, response)
        assert.equal(status, 200); assert.equal(openAiCalls, 1)
        console.log({ verification: 'real API handler with mocked OpenAI', finalJsonBytes: Buffer.byteLength(captured), finalMultipartBytes: multipartBytes, customerImages: 1, productReferences: 2 })
        await handler({ method: 'POST', body: captured, headers: { 'content-length': String(result.before) } }, response)
        assert.equal(status, 413); assert.equal(openAiCalls, 1, 'Original budget failure occurs before OpenAI')
        globalThis.fetch = originalFetch
      }
    }
    // Exercise Safari's silent PNG fallback without changing reference pixels.
    const fallback = await page.evaluate(async () => {
      const original = HTMLCanvasElement.prototype.toDataURL
      HTMLCanvasElement.prototype.toDataURL = function(type, quality) { return original.call(this, type === 'image/webp' ? 'image/png' : type, quality) }
      try {
        const source = document.createElement('canvas'); source.width = 320; source.height = 240
        const { prepareAiHousePhoto } = await import('/src/features/home-visualizer/aiVisualization.ts')
        const prepared = await prepareAiHousePhoto(source.toDataURL())
        return { mime: prepared.photo.slice(0, 23), width: prepared.width, height: prepared.height }
      } finally { HTMLCanvasElement.prototype.toDataURL = original }
    })
    assert.match(fallback.mime, /image\/jpeg/); assert.equal(fallback.width, 320); assert.equal(fallback.height, 240)
    await page.close()
  }
} finally { globalThis.fetch = originalFetch; if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalApiKey; await browser?.close(); server.kill('SIGTERM') }
