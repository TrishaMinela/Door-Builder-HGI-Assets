import assert from 'node:assert/strict'
import sharp from 'sharp'
import handler from '../api/generate-door-visualization.ts'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { doorStyles, glassOptions } from '../src/data/options'
import { AI_MAX_PHOTO_BYTES, aiPixelCorners, aiWorkingSize } from '../src/features/home-visualizer/aiImagePreparation'
import { loadAiReference, prepareHouseAndMask, resolveAiProduct } from '../server/aiDoorVisualization'

const originalFetch = globalThis.fetch
const originalKey = process.env.OPENAI_API_KEY
process.env.OPENAI_API_KEY = 'mock-only-key'
const corners = { topLeft: { x: .2, y: .1 }, topRight: { x: .8, y: .1 }, bottomRight: { x: .8, y: .9 }, bottomLeft: { x: .2, y: .9 } }
const bytes = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#888888' } }).jpeg().toBuffer()
const source = { photo: `data:image/jpeg;base64,${bytes.toString('base64')}`, corners, configuration: aiTestConfiguration }
let forwardedForm: FormData | null = null
let calls = 0
let failOpenAi = false
let gate: Promise<void> | null = null
globalThis.fetch = (async (url, init) => {
  calls += 1
  assert.equal(url, 'https://api.openai.com/v1/images/edits', 'Never fetch a browser-supplied URL')
  assert.equal(init?.method, 'POST')
  assert.ok(init?.body instanceof FormData)
  forwardedForm = init.body
  if (gate) await gate
  return new Response(JSON.stringify(failOpenAi ? { error: { code: 'billing-test', message: 'SECRET INTERNAL ERROR' } } : { data: [{ b64_json: 'YWktcmVzdWx0' }] }), { status: failOpenAi ? 429 : 200 })
}) as typeof fetch

let checks = 0
async function request(body: unknown, expected: number, method = 'POST', headers?: Record<string, string>) {
  let status = 0, result: unknown
  const response = { status(code: number) { status = code; return this }, json(body: unknown) { result = body }, setHeader() {} }
  await handler({ method, body, headers }, response)
  assert.equal(status, expected)
  checks += 1
  return result as { image?: string; error?: string }
}

try {
  await request(source, 405, 'GET')
  await request({ ...source, photo: undefined }, 400)
  await request({ ...source, photo: 'data:image/gif;base64,R0lGODlh' }, 400)
  await request({ ...source, photo: `data:image/jpeg;base64,${'A'.repeat(Math.ceil((AI_MAX_PHOTO_BYTES + 10) * 4 / 3))}` }, 400)
  await request({ ...source, photo: 'data:image/jpeg;base64,aW52YWxpZA==' }, 400)
  await request({ ...source, corners: undefined }, 400)
  await request({ ...source, corners: { ...corners, extra: { x: .5, y: .5 } } }, 400)
  await request({ ...source, corners: { ...corners, topLeft: { x: -1, y: .1 } } }, 400)
  await request({ ...source, corners: { ...corners, topLeft: { x: NaN, y: .1 } } }, 400)
  await request({ ...source, corners: { ...corners, topRight: corners.bottomLeft } }, 400)
  await request({ ...source, configuration: undefined }, 400)
  await request({ ...source, configuration: {} }, 400)
  await request({ ...source, configuration: { ...aiTestConfiguration, finish: { id: 'unknown' } } }, 400)
  await request('not-json', 400)
  await request(source, 400, 'POST', { 'content-length': '99999999' })
  assert.equal(calls, 0, 'Invalid requests must not consume OpenAI credits')

  const prepared = await prepareHouseAndMask(source.photo, corners)
  assert.deepEqual({ width: prepared.width, height: prepared.height }, { width: 1536, height: 1024 })
  const maskInfo = await sharp(prepared.mask).metadata(), photoInfo = await sharp(prepared.photo).metadata()
  assert.equal(maskInfo.width, photoInfo.width); assert.equal(maskInfo.height, photoInfo.height)
  assert.equal(maskInfo.format, photoInfo.format); assert.equal(maskInfo.hasAlpha, true)
  const mask = await sharp(prepared.mask).ensureAlpha().raw().toBuffer()
  const alpha = (x: number, y: number) => mask[(y * prepared.width + x) * 4 + 3]
  assert.equal(alpha(0, 0), 255)
  assert.equal(alpha(768, 512), 0)
  assert.equal(alpha(300, 512), 0, 'Small controlled padding must surround the selected polygon')
  assert.equal(alpha(200, 512), 255, 'Padding must not expose a large surrounding wall region')
  assert.deepEqual(aiWorkingSize(2400, 1600), { width: 1536, height: 1024 })
  assert.deepEqual(aiPixelCorners(corners, 1536, 1024)[0], { x: 307.20000000000005, y: 102.4 })
  checks += 3

  const trusted = resolveAiProduct(aiTestConfiguration)
  const hostile = resolveAiProduct({ ...aiTestConfiguration, style: { ...aiTestConfiguration.style, image: 'https://evil.example/image.png' }, hardware: { ...aiTestConfiguration.hardware, asset: '../../secrets' } })
  assert.deepEqual(hostile.references, trusted.references)
  for (const reference of trusted.references) assert.ok((await loadAiReference(reference.paths)).length > 0)
  const sidelite = resolveAiProduct({ ...aiTestConfiguration, sidelites: 'both-sides', sideliteSlab: 'fsl', sideliteGlass: { glass: 'Clear Glass with No Grids' } })
  assert.equal(sidelite.snapshot.sidelites.count, 2)
  assert.ok(sidelite.references.some(item => item.label === 'original sidelite slab'))
  for (const reference of sidelite.references) assert.ok((await loadAiReference(reference.paths)).length > 0)
  const hrt = doorStyles.find(item => item.code === 'HRT')!
  const hrtVariant = hrt.variants.find(item => item.lineId === '22-gauge-steel')!
  const glassProduct = resolveAiProduct({ ...aiTestConfiguration, style: hrt,
    product: { ...aiTestConfiguration.product, matchingVariants: [hrtVariant] },
    glass: glassOptions.find(item => item.id === 'hrt-clear-s11rt')!,
  })
  assert.ok(glassProduct.references.some(item => item.label === 'selected glass design'))
  for (const reference of glassProduct.references) assert.ok((await loadAiReference(reference.paths)).length > 0)
  checks += 2

  const result = await request(JSON.stringify(source), 200)
  assert.ok(result.image?.startsWith('data:image/jpeg;base64,'))
  assert.ok(forwardedForm)
  const form = forwardedForm as FormData
  assert.equal(form.get('model'), 'gpt-image-2.5-sunburst')
  assert.equal(form.get('n'), '1')
  assert.equal(form.get('quality'), 'xhigh')
  assert.equal(form.get('output_format'), 'jpeg')
  assert.equal(form.get('output_compression'), '100')
  assert.equal((form.getAll('image[]')[0] as File).name, 'house.png')
  assert.equal(form.getAll('image[]').length, trusted.references.length + 1)
  assert.ok(form.get('mask') instanceof Blob)
  const prompt = String(form.get('prompt'))
  assert.match(prompt, /Black/); assert.match(prompt, /#242424/)
  assert.match(prompt, /Ignore original reference door\/sidelite colors/)
  assert.match(prompt, /NOT inspiration images/)
  assert.match(prompt, /Image 2 — original base door design: defines the exact slab design/)
  assert.match(prompt, /selected exterior hardware: defines the exact hardware silhouette/)
  assert.match(prompt, /Do not substitute a different or generic knob/)
  assert.match(prompt, /grid count implied by the selected layout\/reference/)
  assert.match(prompt, /Smooth steel must remain smooth steel/)
  assert.match(prompt, /Do not oversoften, blur away/)
  assert.doesNotMatch(prompt, /finalEntranceImage|html2canvas|\/assets\//)

  failOpenAi = true
  const failed = await request(source, 502)
  assert.match(failed.error!, /try again/)
  assert.doesNotMatch(failed.error!, /SECRET|billing-test|mock-only-key/)
  failOpenAi = false
  const before = calls
  let release!: () => void
  gate = new Promise<void>(resolve => { release = resolve })
  const first = request(source, 200), second = request(source, 200)
  // Allow local image preparation to finish; release is non-paid and all fetches are mocked.
  release()
  await Promise.all([first, second])
  assert.equal(calls - before, 1, 'Identical simultaneous requests share one OpenAI operation in a warm instance')
  checks += 1
  console.log(`AI Visualizer: ${checks} API/image-preparation/security checks passed (OpenAI fully mocked).`)
} finally {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalKey
}
