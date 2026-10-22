import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import ts from 'typescript'
import sharp from 'sharp'
import handler from '../api/detect-entrance-structure'
import * as preprocessing from '../server/aiImagePreprocessing'
import * as generation from '../server/aiDoorVisualization'
import generate from '../api/generate-door-visualization'
import { aiTestConfiguration } from './aiVisualizerFixture'

// Inspect emitted runtime imports, not type-only imports. This guard runs with
// normal project dependencies; Vercel's platform tracer is checked separately.
const visited = new Set<string>()
const packages = new Set<string>()
function inspect(file: string) {
  const name = relative(process.cwd(), file)
  if (visited.has(name)) return
  visited.add(name)
  assert.ok(!name.startsWith('src/data/') && !name.startsWith('public/') && !name.includes('aiDoorVisualization'), `Detection must not load ${name}`)
  const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const ast = ts.createSourceFile(file, js, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS)
  function walk(node: ts.Node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text
      if (specifier.startsWith('.')) {
        const base = resolve(dirname(file), specifier)
        const target = [base.replace(/\.js$/, '.ts'), `${base}.ts`, base].find(existsSync)
        assert.ok(target, `Unresolved runtime dependency ${specifier}`)
        inspect(target)
      } else packages.add(specifier)
    }
    assert.ok(!(ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require')), 'Review any new dynamic runtime import explicitly')
    ts.forEachChild(node, walk)
  }
  walk(ast)
}
inspect(resolve('api/detect-entrance-structure.ts'))
assert.deepEqual([...packages].sort(), ['node:crypto', 'sharp'])
assert.equal(visited.size, 6, 'Only endpoint, preprocessing, telemetry, public error mapping/messages and shared image constants are needed')
const config = JSON.parse(readFileSync('vercel.json', 'utf8'))
assert.equal(config.functions['api/detect-entrance-structure.ts'].includeFiles, undefined)
assert.equal(config.functions['api/detect-entrance-structure.ts'].maxDuration, 60)
assert.equal(config.functions['api/generate-door-visualization.ts'].includeFiles, undefined, 'Generation assets are traced from exact literal manifest reads, not a broad inclusion')
for (const key of ['AiInputError', 'prepareHouseAndMask', 'objectValue', 'optionalCorners', 'validateCorners'] as const) assert.equal(generation[key], preprocessing[key], `Shared ${key} identity is preserved`)

const originalFetch = globalThis.fetch
const originalKey = process.env.OPENAI_API_KEY
process.env.OPENAI_API_KEY = 'mock-detection-key'
let mode: 'ok' | 'rate' | 'reject' | 'timeout' | 'malformed' = 'ok'
let calls = 0
const detection = { doorStructure: 'single', sidelites: 'right', transom: false, widthClass: 'standard', approximateWidthRatio: .4, structurallyWide: false, confidence: .95, summary: 'Door with right sidelite.' }
const photo = await sharp({ create: { width: 2000, height: 1200, channels: 4, background: '#88888880' } }).png().toBuffer()
const input = { photo: `data:image/png;base64,${photo.toString('base64')}` }
globalThis.fetch = (async (url, init) => {
  calls++
  assert.equal(url, 'https://api.openai.com/v1/responses')
  const body = JSON.parse(String(init?.body))
  assert.equal(body.store, false)
  assert.equal(body.text.format.name, 'entrance_structure')
  assert.equal(body.text.format.strict, true)
  const content = body.input[0].content
  assert.ok(content[0].text.includes('left/right from exterior view'))
  const image = await sharp(Buffer.from(content[1].image_url.split(',')[1], 'base64')).metadata()
  assert.equal(image.format, 'webp'); assert.equal(image.width, 1536); assert.equal(image.height, 922)
  if (mode === 'timeout') throw Object.assign(new Error('mock timeout'), { name: 'TimeoutError' })
  if (mode === 'rate') return Response.json({ error: { code: 'rate_limit_exceeded' } }, { status: 429 })
  if (mode === 'reject') return Response.json({ error: { code: 'invalid_image' } }, { status: 400 })
  return Response.json({ output: [{ content: [{ text: mode === 'malformed' ? 'not-json' : JSON.stringify(detection) }] }] })
}) as typeof fetch
async function request(body: unknown, status: number, code?: string, method = 'POST') {
  let actualStatus = 0
  let result: Record<string, unknown> = {}
  const headers: Record<string, string> = {}
  await handler({ method, body }, { status(value) { actualStatus = value; return this }, json(value) { result = value as typeof result }, setHeader(key, value) { headers[key] = value } })
  assert.equal(actualStatus, status)
  assert.equal(headers['Cache-Control'], 'no-store')
  assert.equal(result.request_id, headers['X-Request-Id'])
  if (code) assert.equal(result.error_code, code)
  else assert.deepEqual(result.detection, detection)
}
try {
  await request(input, 405, 'AI_GENERATION_FAILED', 'GET')
  await request({}, 400, 'ENTRANCE_PHOTO_UNSUITABLE')
  await request({ photo: 'data:image/jpeg;base64,aW52YWxpZA==' }, 400, 'ENTRANCE_PHOTO_UNSUITABLE')
  await request(null, 400, 'AI_GENERATION_FAILED')
  await request('not-json', 500, 'AI_GENERATION_FAILED')
  await request('x'.repeat(preprocessing.AI_MAX_REQUEST_BYTES + 1), 413, 'ENTRANCE_PHOTO_UNSUITABLE')
  delete process.env.OPENAI_API_KEY
  await request(input, 503, 'AI_TEMPORARILY_UNAVAILABLE')
  assert.equal(calls, 0, 'Invalid requests never call upstream')
  process.env.OPENAI_API_KEY = 'mock-detection-key'
  await request(input, 200)
  mode = 'rate'; await request(input, 429, 'AI_BUSY')
  mode = 'reject'; await request(input, 502, 'ENTRANCE_PHOTO_UNSUITABLE')
  mode = 'timeout'; await request(input, 504, 'AI_TIMEOUT')
  mode = 'malformed'; await request(input, 502, 'AI_GENERATION_FAILED')
  assert.equal(calls, 5)
  // Exercise the generation endpoint through both reference paths after the
  // extraction. No network requests or paid model calls are made.
  let generationCalls = 0
  let rejectGeneration = false
  globalThis.fetch = (async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/images/edits')
    assert.ok(init?.body instanceof FormData)
    const images = init.body.getAll('image[]') as Blob[]
    assert.ok(images.length >= 3, 'House plus configured/catalog references')
    for (const image of images) assert.ok((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).width)
    assert.ok(String(init.body.get('prompt')).includes('AUTHORITATIVE TARGET ENTRANCE STRUCTURE'))
    generationCalls++
    return rejectGeneration ? Response.json({ error: { code: 'rate_limit_exceeded' } }, { status: 429 }) : Response.json({ data: [{ b64_json: 'bW9jay1pbWFnZQ==' }] })
  }) as typeof fetch
  const product = await sharp({ create: { width: 200, height: 400, channels: 4, background: '#888888' } }).png().toBuffer()
  async function generateRequest(configured: boolean, expectedStatus: number) {
    let status = 0
    let result: Record<string, unknown> = {}
    await generate({ method: 'POST', body: { ...input, configuration: aiTestConfiguration, ...(configured ? { productReference: `data:image/png;base64,${product.toString('base64')}` } : {}) } }, { status(value) { status = value; return this }, json(value) { result = value as typeof result }, setHeader() {} })
    assert.equal(status, expectedStatus)
    assert.ok(result.request_id)
    if (expectedStatus === 200) assert.equal(result.image, 'data:image/jpeg;base64,bW9jay1pbWFnZQ==')
    else assert.equal(result.error_code, 'AI_BUSY')
  }
  await generateRequest(true, 200)
  await generateRequest(false, 200)
  rejectGeneration = true
  await generateRequest(true, 429)
  assert.equal(generationCalls, 3)
  await assert.rejects(() => generation.prepareConfiguredProductReferences('bad-reference'), (error: unknown) => error instanceof preprocessing.AiInputError && error.code === 'REFERENCE_IMAGE_FAILED')
  console.log('PASS: detection dependency isolation, shared error identity, normalization, response/headers and 12 success/error contracts; no external requests.')
  console.log('PASS: generation configured-capture and catalog-file fallback requests, image decodes, prompt and rate-limit handling.')
} finally {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey
}
