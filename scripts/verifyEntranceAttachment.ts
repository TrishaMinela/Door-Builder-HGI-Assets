import assert from 'node:assert/strict'
import { readFile, existsSync } from 'node:fs'
import { promisify } from 'node:util'
import sharp from 'sharp'
import handler from '../api/detect-entrance-structure'
import type { EntranceDetection } from '../src/features/home-visualizer/entranceFitStrategy'

const read = promisify(readFile)
const live = process.argv.includes('--live')
if (live && existsSync('.env.local')) process.loadEnvFile('.env.local')
if (live && !process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for live detection tests.')
const originalFetch = globalThis.fetch
const originalKey = process.env.OPENAI_API_KEY
let expected: EntranceDetection['sidelites'] = 'none'
let calls = 0
if (!live) {
  process.env.OPENAI_API_KEY = 'mock-detection-key'
  globalThis.fetch = (async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses')
    const request = JSON.parse(String(init?.body))
    assert.equal(request.model, process.env.OPENAI_ENTRANCE_DETECTION_MODEL || 'gpt-5.4-mini')
    const content = request.input[0].content
    const prompt = content.find((part: { type: string }) => part.type === 'input_text').text
    for (const phrase of ['SAME PHYSICAL ENTRANCE ASSEMBLY', 'shares the entrance frame/head jamb', 'own window frames', 'structural gap', 'Shared decorative exterior trim alone', 'Do not use a rigid pixel-distance rule']) assert.ok(prompt.includes(phrase), phrase)
    const image = content.find((part: { type: string }) => part.type === 'input_image')
    const metadata = await sharp(Buffer.from(image.image_url.split(',')[1], 'base64')).metadata()
    assert.equal(metadata.width, 676)
    assert.equal(metadata.height, 453)
    calls++
    const detection: EntranceDetection = { doorStructure: 'single', sidelites: expected, transom: false, widthClass: expected === 'none' ? 'standard' : 'wide', approximateWidthRatio: .4, structurallyWide: expected !== 'none', confidence: .95, summary: 'Mocked entrance classification.' }
    return Response.json({ output: [{ content: [{ text: JSON.stringify(detection) }] }] })
  }) as typeof fetch
}

async function detect(name: string, bytes: Buffer, sidelites: EntranceDetection['sidelites'], expectedTransom?: boolean) {
  expected = sidelites
  let status = 0
  let result: { detection?: EntranceDetection; error_code?: string; request_id?: string } = {}
  await handler({ method: 'POST', body: { photo: `data:image/jpeg;base64,${bytes.toString('base64')}` } }, {
    status(code) { status = code; return this },
    json(body) { result = body as typeof result },
    setHeader() {},
  })
  assert.equal(status, 200, `${name}: ${result.error_code ?? 'request failed'}`)
  assert.equal(result.detection?.doorStructure, 'single', name)
  assert.equal(result.detection?.sidelites, sidelites, name)
  if (expectedTransom !== undefined) assert.equal(result.detection?.transom, expectedTransom, name)
  assert.ok(result.detection!.confidence >= .65, name)
  console.log(JSON.stringify({ fixture: name, live, door_count: 1, left_sidelite: sidelites === 'left' || sidelites === 'both', right_sidelite: sidelites === 'right' || sidelites === 'both', transom: result.detection!.transom, confidence: result.detection!.confidence, request_id: result.request_id }))
}

try {
  if (live) {
    await detect('supplied independent windows', await read('/Users/trishaminela/Downloads/images (2).jpeg'), 'none', false)
    await detect('real single door with both sidelites and separate windows', await read('/Users/trishaminela/Downloads/images (1).jpeg'), 'both')
    await detect('single door with independent house windows', await read('public/assets/hero/hero-entryway.webp'), 'none')
  } else {
    const photo = await sharp({ create: { width: 676, height: 453, channels: 3, background: '#ccc' } }).jpeg().toBuffer()
    for (const sides of ['none', 'left', 'right', 'both', 'none'] as const) await detect(`response contract: ${sides}`, photo, sides)
    assert.equal(calls, 5)
    console.log('Five mocked detection contract/prompt/full-photo checks passed; not a vision-accuracy test.')
  }
} finally {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalKey
}
