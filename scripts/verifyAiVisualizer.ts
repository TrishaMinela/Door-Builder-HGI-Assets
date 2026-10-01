import assert from 'node:assert/strict'
import sharp from 'sharp'
import handler from '../api/generate-door-visualization.ts'
import completeHandler from '../api/complete-ai-visualization.ts'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { doorStyles, glassOptions } from '../src/data/options'
import { aiPixelCorners, aiWorkingSize } from '../src/features/home-visualizer/aiImagePreparation'
import { AI_SINGLE_DOOR_WIDTH_BIAS, AiInputError, aiDoNotInventInstructionBlock, aiDoorGeometryInstructionBlock, aiEntranceFitInstructionBlock, aiFixedOuterEntranceInstructionBlock, aiGlassGeometryInstructionBlock, aiHousePreservationInstructionBlock, aiProductFidelityInstructionBlock, aiPrompt, aiSideliteProductFidelityInstructionBlock, aiStructuralInstructionBlock, automaticEntranceMaskCorners, constrainGeneratedImageToMask, detectedOuterEntranceCorners, entranceFitContext, loadAiReference, prepareConfiguredProductReferences, prepareHouseAndMask, resolveAiProduct } from '../server/aiDoorVisualization'
import { detectedEntranceStructure, evaluateEntranceCompatibility, getDetectedVisualizerOpeningFamily, getSelectedVisualizerOpeningFamily } from '../src/features/home-visualizer/entranceFitStrategy'
import { conservativeVerifiedSidelites, DETECTION_MODEL, entranceDetectionInstructions, normalizeEntranceDetection, validateSideliteGeometry, type ModelDetection } from '../api/detect-entrance-structure'
import { AI_IMAGE_PRICING_USD_PER_MILLION, aiUsageEnvironment, estimateImageGenerationCost, normalizeImageUsage } from '../server/aiUsage'

const originalFetch = globalThis.fetch
const originalKey = process.env.OPENAI_API_KEY
const originalSupabaseUrl = process.env.SUPABASE_URL
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
process.env.OPENAI_API_KEY = 'mock-only-key'
process.env.SUPABASE_URL = 'https://telemetry-test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'
const corners = { topLeft: { x: .2, y: .1 }, topRight: { x: .8, y: .1 }, bottomRight: { x: .8, y: .9 }, bottomLeft: { x: .2, y: .9 } }
const bytes = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#888888' } }).jpeg().toBuffer()
const productReferenceBytes = await sharp({ create: { width: 600, height: 1200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: Buffer.from('<svg width="600" height="1200"><rect x="90" y="40" width="420" height="1120" rx="4" fill="#242424"/><rect x="250" y="210" width="100" height="360" fill="#b9d5df"/></svg>') }])
  .png().toBuffer()
const productReference = `data:image/png;base64,${productReferenceBytes.toString('base64')}`
const generatedBytes = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: '#b42727' } }).jpeg({ quality: 95 }).toBuffer()
const entranceDetection = {
  doorStructure: 'single', sidelites: 'none', leftSidelitePresent: false, rightSidelitePresent: false, transom: false,
  mainDoorRegion: { x: .4, y: .18, width: .2, height: .68 }, transomRegion: null,
  leftSidelite: { present: false, confidence: .98, evidence: 'absent', region: null },
  rightSidelite: { present: false, confidence: .98, evidence: 'absent', region: null },
  widthClass: 'standard', approximateWidthRatio: .2, structurallyWide: false, confidence: .98, summary: 'Single door.',
}
const source = { photo: `data:image/jpeg;base64,${bytes.toString('base64')}`, productReference, corners, configuration: aiTestConfiguration, entranceDetection }
let forwardedForm: FormData | null = null
let calls = 0
let openAiFailure: 'none' | 'rate' | 'rejected' | 'empty' = 'none'
let telemetryFailure = false
const telemetryRows: Array<Record<string, unknown>> = []
const telemetryUpdates: Array<Record<string, unknown>> = []
const usage = {
  input_tokens: 1400,
  input_tokens_details: { text_tokens: 400, image_tokens: 1000 },
  output_tokens: 2000,
  output_tokens_details: { image_tokens: 2000, text_tokens: 0 },
  total_tokens: 3400,
}
let gate: Promise<void> | null = null
globalThis.fetch = (async (url, init) => {
  if (String(url).startsWith('https://telemetry-test.supabase.co/rest/v1/ai_generation_usage')) {
    if (init?.method === 'PATCH') {
      assert.match(String(url), /completion_token_hash=eq\./)
      telemetryUpdates.push(JSON.parse(String(init.body)) as Record<string, unknown>)
      return Response.json([{ id: 'updated' }])
    }
    assert.equal(init?.method, 'POST')
    assert.equal(new Headers(init?.headers).get('apikey'), 'mock-service-role-key')
    telemetryRows.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
    return telemetryFailure ? new Response(null, { status: 500 }) : Response.json([{ id: `generation-row-${telemetryRows.length}` }], { status: 201 })
  }
  calls += 1
  assert.equal(url, 'https://api.openai.com/v1/images/edits', 'Never fetch a browser-supplied URL')
  assert.equal(init?.method, 'POST')
  assert.ok(init?.body instanceof FormData)
  forwardedForm = init.body
  if (gate) await gate
  if (openAiFailure === 'rate') return new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded', message: 'SECRET INTERNAL ERROR' } }), { status: 429, headers: { 'x-request-id': 'openai-rate-test' } })
  if (openAiFailure === 'rejected') return new Response(JSON.stringify({ error: { code: 'invalid_image', type: 'image_generation_user_error', message: 'SECRET INTERNAL ERROR' } }), { status: 400, headers: { 'x-request-id': 'openai-rejected-test' } })
  if (openAiFailure === 'empty') return new Response(JSON.stringify({ data: [], usage }), { status: 200, headers: { 'x-request-id': 'openai-empty-test' } })
  return new Response(JSON.stringify({ data: [{ b64_json: generatedBytes.toString('base64') }], usage }), { status: 200, headers: { 'x-request-id': 'openai-success-test' } })
}) as typeof fetch

let checks = 0
async function request(body: unknown, expected: number, method = 'POST', headers?: Record<string, string>) {
  let status = 0, result: unknown
  const response = { status(code: number) { status = code; return this }, json(body: unknown) { result = body }, setHeader() {} }
  await handler({ method, body, headers }, response)
  assert.equal(status, expected)
  checks += 1
  return result as { image?: string; error_code?: string; user_message?: string; request_id?: string; completion_token?: string }
}

async function complete(body: unknown, expected: number) {
  let status = 0, result: unknown
  const response = { status(code: number) { status = code; return this }, json(body: unknown) { result = body }, setHeader() {} }
  await completeHandler({ method: 'POST', body }, response)
  assert.equal(status, expected)
  checks += 1
  return result as { ok?: boolean }
}

try {
  assert.equal(DETECTION_MODEL, 'gpt-5.4-mini')
  const leftOnlyDetection = normalizeEntranceDetection({
    doorStructure: 'single', hasLeftSidelite: true, hasRightSidelite: false,
    leftSidelite: { present: true, confidence: .97, evidence: 'A separately framed narrow vertical glazed panel is visible outside the left slab edge.', box: { xMin: .18, yMin: .2, xMax: .29, yMax: .85, confidence: .97 } },
    rightSidelite: { present: false, confidence: .96, evidence: 'Only jamb and trim are visible outside the right slab edge.', box: null },
    hasTransom: false, mainDoor: { xMin: .31, yMin: .17, xMax: .66, yMax: .89, confidence: .98 }, transom: null,
    widthClass: 'wide', approximateWidthRatio: .49, structurallyWide: true, confidence: .95, summary: 'Single door with one left sidelite.',
  } satisfies ModelDetection)
  assert.deepEqual({ doorStructure: leftOnlyDetection.doorStructure, leftSidelitePresent: leftOnlyDetection.leftSidelitePresent, rightSidelitePresent: leftOnlyDetection.rightSidelitePresent, sidelites: leftOnlyDetection.sidelites, transom: leftOnlyDetection.transom }, { doorStructure: 'single', leftSidelitePresent: true, rightSidelitePresent: false, sidelites: 'left', transom: false })
  assert.match(entranceDetectionInstructions, /separate vertical glazed or solid panel beside and OUTSIDE the main door slab/)
  assert.match(entranceDetectionInstructions, /Do NOT count glass inside a door slab/)
  assert.match(entranceDetectionInstructions, /Do not infer symmetry/)
  const modelExample = (left: boolean, right: boolean, doorStructure: 'single' | 'double' = 'single'): ModelDetection => ({
    doorStructure, hasLeftSidelite: left, hasRightSidelite: right, hasTransom: false,
    leftSidelite: { present: left, confidence: .96, evidence: left ? 'Separate framed panel outside left slab edge.' : 'No separate left panel.', box: left ? { xMin: .1, yMin: .2, xMax: .22, yMax: .85, confidence: .96 } : null },
    rightSidelite: { present: right, confidence: .96, evidence: right ? 'Separate framed panel outside right slab edge.' : 'No separate right panel.', box: right ? { xMin: .72, yMin: .2, xMax: .84, yMax: .85, confidence: .96 } : null },
    mainDoor: { xMin: .25, yMin: .15, xMax: .7, yMax: .9, confidence: .97 }, transom: null, widthClass: left || right || doorStructure === 'double' ? 'wide' : 'standard', approximateWidthRatio: .45, structurallyWide: left || right || doorStructure === 'double', confidence: .94, summary: 'Entrance fixture.',
  })
  const detectionFixtures = [
    { name: 'single only', model: modelExample(false, false), expected: 'none' },
    { name: 'single plus left', model: modelExample(true, false), expected: 'left' },
    { name: 'single plus right', model: modelExample(false, true), expected: 'right' },
    { name: 'single plus both', model: modelExample(true, true), expected: 'both' },
    { name: 'double only', model: modelExample(false, false, 'double'), expected: 'none' },
    { name: 'double plus one sidelite', model: modelExample(false, true, 'double'), expected: 'right' },
    { name: 'double plus sidelites', model: modelExample(true, true, 'double'), expected: 'both' },
    { name: 'door glass is not a sidelite', model: { ...modelExample(false, false), hasLeftSidelite: true, leftSidelite: { present: true, confidence: .92, evidence: 'Mistaken slab glass.', box: { xMin: .3, yMin: .25, xMax: .42, yMax: .72, confidence: .92 } }, summary: 'Glass exists only inside the slab.' }, expected: 'none' },
    { name: 'thick jamb is not a sidelite', model: { ...modelExample(false, false), hasRightSidelite: true, rightSidelite: { present: true, confidence: .9, evidence: 'Mistaken thick trim.', box: { xMin: .705, yMin: .15, xMax: .73, yMax: .9, confidence: .9 } } }, expected: 'none' },
  ] as const
  for (const fixture of detectionFixtures) assert.equal(normalizeEntranceDetection(fixture.model).sidelites, fixture.expected, fixture.name)
  const firstBoth = modelExample(true, true)
  const confirmedRightOnly = modelExample(false, true)
  const conservativeRight = normalizeEntranceDetection(conservativeVerifiedSidelites(firstBoth, confirmedRightOnly))
  assert.deepEqual({ doorStructure: conservativeRight.doorStructure, hasLeftSidelite: conservativeRight.leftSidelitePresent, hasRightSidelite: conservativeRight.rightSidelitePresent }, { doorStructure: 'single', hasLeftSidelite: false, hasRightSidelite: true })
  const uncertainBoth = modelExample(true, true)
  uncertainBoth.leftSidelite.confidence = .7
  uncertainBoth.rightSidelite.confidence = .82
  const conservativeOneSide = normalizeEntranceDetection(conservativeVerifiedSidelites(firstBoth, uncertainBoth))
  assert.equal(conservativeOneSide.sidelites, 'right', 'Ambiguous both must conservatively prefer the stronger one-sided result')
  const suppliedRegression = modelExample(true, true)
  suppliedRegression.leftSidelite = { present: true, confidence: .93, evidence: 'Model mistook the left jamb for a sidelite.', box: { xMin: .225, yMin: .16, xMax: .245, yMax: .89, confidence: .93 } }
  assert.equal(suppliedRegression.hasLeftSidelite && suppliedRegression.hasRightSidelite ? 'both' : 'not-both', 'both', 'Raw model fixture reproduces the false both result')
  assert.equal(validateSideliteGeometry(suppliedRegression).left.reason, 'region is trim / insufficient width')
  assert.equal(normalizeEntranceDetection(suppliedRegression).sidelites, 'right', 'Spatial validation rejects left trim and retains the real right sidelite')
  checks += 16

  await request(source, 405, 'GET')
  await request({ ...source, photo: undefined }, 400)
  await request({ ...source, photo: 'data:image/gif;base64,R0lGODlh' }, 400)
  await request({ ...source, photo: 'data:image/jpeg;base64,aW52YWxpZA==' }, 400)
  await request({ ...source, corners: { ...corners, extra: { x: .5, y: .5 } } }, 400)
  await request({ ...source, corners: { ...corners, topLeft: { x: -1, y: .1 } } }, 400)
  await request({ ...source, corners: { ...corners, topLeft: { x: NaN, y: .1 } } }, 400)
  await request({ ...source, corners: { ...corners, topRight: corners.bottomLeft } }, 400)
  await request({ ...source, configuration: undefined }, 400)
  await request({ ...source, configuration: {} }, 400)
  await request({ ...source, configuration: { ...aiTestConfiguration, finish: { id: 'unknown' } } }, 400)
  await request({ ...source, productReference: 'data:image/png;base64,aW52YWxpZA==' }, 400)
  await request('not-json', 400)
  await request(source, 413, 'POST', { 'content-length': '99999999' })
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
  assert.deepEqual(prepared.original, { declaredMimeType: 'image/jpeg', format: 'jpeg', width: 2400, height: 1600, orientation: 1, byteSize: bytes.length })
  assert.deepEqual({ format: prepared.normalized.format, width: prepared.normalized.width, height: prepared.normalized.height }, { format: 'webp', width: 1536, height: 1024 })
  const automatic = await prepareHouseAndMask(source.photo, null)
  assert.equal(automatic.mask, undefined)
  const fixtureSpecs = [
    { name: 'large high-resolution JPEG', format: 'jpeg' as const, width: 6000, height: 4000 },
    { name: 'large PNG', format: 'png' as const, width: 5000, height: 4000 },
    { name: 'WebP', format: 'webp' as const, width: 2200, height: 1467 },
    { name: 'portrait phone photo', format: 'jpeg' as const, width: 3024, height: 4032 },
    { name: 'landscape phone photo', format: 'jpeg' as const, width: 4032, height: 3024 },
  ]
  const fixtureReport: Array<Record<string, unknown>> = []
  for (const fixture of fixtureSpecs) {
    const localBytes = await sharp({ create: { width: fixture.width, height: fixture.height, channels: 3, background: '#786d62' } })[fixture.format]({ quality: 96 } as never).toBuffer()
    const local = await prepareHouseAndMask(`data:image/${fixture.format};base64,${localBytes.toString('base64')}`, null)
    assert.equal(local.original.format, fixture.format)
    assert.ok(local.normalized.width <= fixture.width && local.normalized.height <= fixture.height, 'Normalization must never upscale')
    assert.ok(Math.abs(local.normalized.width / local.normalized.height - fixture.width / fixture.height) < .002, 'Aspect ratio is preserved')
    fixtureReport.push({ name: fixture.name, before: `${fixture.width}x${fixture.height} / ${localBytes.length} bytes`, after: `${local.normalized.width}x${local.normalized.height} / ${local.normalized.byteSize} bytes` })
  }
  const rotatedBytes = await sharp({ create: { width: 1600, height: 2400, channels: 3, background: '#695e54' } }).jpeg({ quality: 94 }).withMetadata({ orientation: 6 }).toBuffer()
  const rotated = await prepareHouseAndMask(`data:image/jpeg;base64,${rotatedBytes.toString('base64')}`, null)
  assert.equal(rotated.original.orientation, 6)
  assert.deepEqual({ width: rotated.normalized.width, height: rotated.normalized.height }, { width: 1536, height: 1024 })
  fixtureReport.push({ name: 'EXIF rotation 6', before: `1600x2400 / ${rotatedBytes.length} bytes`, after: `${rotated.normalized.width}x${rotated.normalized.height} / ${rotated.normalized.byteSize} bytes` })
  const mismatched = await prepareHouseAndMask(`data:image/png;base64,${bytes.toString('base64')}`, null)
  assert.equal(mismatched.original.declaredMimeType, 'image/png')
  assert.equal(mismatched.original.format, 'jpeg', 'Actual bytes, not the declared MIME, determine the format')
  fixtureReport.push({ name: 'misleading PNG MIME with JPEG data', before: `2400x1600 / ${bytes.length} bytes`, after: `${mismatched.normalized.width}x${mismatched.normalized.height} / ${mismatched.normalized.byteSize} bytes` })
  await assert.rejects(() => prepareHouseAndMask('data:image/jpeg;base64,aW52YWxpZA==', null), (error: unknown) => error instanceof AiInputError && error.code === 'IMAGE_DECODE_FAILED')
  const detectedContext = entranceFitContext({
    doorStructure: 'single', sidelites: 'both', leftSidelitePresent: true, rightSidelitePresent: true, transom: false,
    mainDoorRegion: { x: .4, y: .2, width: .2, height: .65 },
    leftSidelite: { present: true, confidence: .95, evidence: 'separate panel', region: { x: .3, y: .2, width: .08, height: .65 } },
    rightSidelite: { present: true, confidence: .95, evidence: 'separate panel', region: { x: .62, y: .2, width: .08, height: .65 } },
    widthClass: 'wide', confidence: .95,
  }, 'use-selected-product')
  const automaticMaskBounds = automaticEntranceMaskCorners(detectedContext.detection)
  const fixedOuterBounds = detectedOuterEntranceCorners(detectedContext.detection)
  assert.ok(automaticMaskBounds)
  assert.ok(fixedOuterBounds)
  assert.ok(automaticMaskBounds.topLeft.x < fixedOuterBounds.topLeft.x && automaticMaskBounds.topRight.x > fixedOuterBounds.topRight.x, 'blend mask is separate and slightly larger than fixed opening')
  assert.ok(automaticMaskBounds.topLeft.x > .25 && automaticMaskBounds.topRight.x < .75, 'automatic mask stays tight to the entrance')
  const automaticallyMasked = await prepareHouseAndMask(source.photo, null, automaticMaskBounds)
  assert.ok(automaticallyMasked.mask)
  const maskPixels = await sharp(automaticallyMasked.mask!).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const alphaAt = (x: number, y: number) => maskPixels.data[(y * maskPixels.info.width + x) * 4 + 3]
  assert.equal(alphaAt(10, 10), 255, 'unrelated facade remains protected')
  assert.equal(alphaAt(Math.round(maskPixels.info.width / 2), Math.round(maskPixels.info.height / 2)), 0, 'detected entrance remains editable')
  const constrained = await constrainGeneratedImageToMask(generatedBytes, automaticallyMasked.photo, automaticallyMasked.mask!, automaticallyMasked.width, automaticallyMasked.height)
  const constrainedSamples = await sharp(constrained).raw().toBuffer({ resolveWithObject: true })
  const pixelAt = (x: number, y: number) => Array.from(constrainedSamples.data.subarray((y * constrainedSamples.info.width + x) * 3, (y * constrainedSamples.info.width + x) * 3 + 3))
  const protectedPixel = pixelAt(10, 10), editablePixel = pixelAt(Math.round(constrainedSamples.info.width / 2), Math.round(constrainedSamples.info.height / 2))
  assert.ok(Math.abs(protectedPixel[0] - protectedPixel[1]) < 3 && Math.abs(protectedPixel[1] - protectedPixel[2]) < 3, 'outside-mask facade pixel is restored from the original house')
  assert.ok(editablePixel[0] > editablePixel[1] * 2, `inside-mask entrance pixel comes from the generated result (${editablePixel.join(',')})`)
  console.log('AI house-photo normalization fixtures:', fixtureReport)
  checks += 24

  const trusted = resolveAiProduct(aiTestConfiguration)
  const configuredReferences = await prepareConfiguredProductReferences(productReference)
  assert.equal(configuredReferences.length, 1)
  assert.equal(configuredReferences[0].label, 'authoritative flattened configured entrance')
  assert.deepEqual({ width: configuredReferences[0].width, height: configuredReferences[0].height }, { width: 600, height: 1200 })
  assert.equal((await sharp(configuredReferences[0].bytes).metadata()).format, 'png')
  const hostile = resolveAiProduct({ ...aiTestConfiguration, style: { ...aiTestConfiguration.style, image: 'https://evil.example/image.png' }, hardware: { ...aiTestConfiguration.hardware, asset: '../../secrets' } })
  assert.deepEqual(hostile.references, trusted.references)
  for (const reference of trusted.references) assert.ok((await loadAiReference(reference.paths)).length > 0)
  const sidelite = resolveAiProduct({ ...aiTestConfiguration, sidelites: 'both-sides', sideliteSlab: 'fsl', sideliteGlass: { glass: 'Clear Glass with No Grids' } })
  assert.equal(sidelite.snapshot.sidelites.count, 2)
  assert.ok(sidelite.references.some(item => item.label === 'original sidelite slab'))
  for (const reference of sidelite.references) assert.ok((await loadAiReference(reference.paths)).length > 0)
  const squareLiteSidelites = resolveAiProduct({ ...aiTestConfiguration, sidelites: 'both-sides', sideliteSlab: 's2sl', sideliteGlass: { glass: 'Clear Glass with No Grids' } })
  const sideliteFidelityBlock = aiSideliteProductFidelityInstructionBlock(squareLiteSidelites.snapshot)
  assert.match(sideliteFidelityBlock, /authoritative product specification for the ENTIRE replacement entrance assembly/)
  assert.match(sideliteFidelityBlock, /house photo is authoritative only for installation context/)
  assert.match(sideliteFidelityBlock, /Image 2 ALWAYS wins/)
  assert.match(sideliteFidelityBlock, /full-height glass sidelites/)
  assert.match(sideliteFidelityBlock, /small square glass lites from Image 2/)
  assert.match(sideliteFidelityBlock, /Do not retain, blend with, or recreate the full-height sidelite glass/)
  assert.match(sideliteFidelityBlock, /Selected sidelite specification: 2 sidelites in the configured both arrangement/)
  assert.match(sideliteFidelityBlock, /Never solve fit by stretching sidelite glass/)
  const sideliteConflictPrompt = aiPrompt(squareLiteSidelites.snapshot, null, ['authoritative flattened configured entrance'])
  assert.match(sideliteConflictPrompt, /existing photographed door or sidelites/)
  assert.match(sideliteConflictPrompt, /If Image 1 and Image 2 conflict about any product detail, Image 2 ALWAYS wins/)
  const houseRules = aiHousePreservationInstructionBlock(null, true)
  assert.match(houseRules, /immutable environment reference/)
  assert.match(houseRules, /Do not modify pixels outside it/)
  assert.match(houseRules, /Major pixels outside the entrance must remain aligned for the before\/after slider/)
  const glassRules = aiGlassGeometryInstructionBlock()
  assert.match(glassRules, /width-to-height aspect ratio exactly/)
  assert.match(glassRules, /Square or near-square glass must remain square or near-square/)
  assert.match(glassRules, /Never distort or redesign the configured product/)
  const boundaryRules = aiFixedOuterEntranceInstructionBlock(fixedOuterBounds, { width: 1536, height: 1024 })
  assert.match(boundaryRules, /complete configured entrance must occupy essentially this same outer boundary/)
  assert.match(boundaryRules, /Scale and perspective-place the COMPLETE configured entrance assembly as one unit/)
  assert.match(boundaryRules, /Never resize individual product pieces independently/)
  assert.match(boundaryRules, /outer width-to-height ratio/)
  const squareGlassPrompt = aiPrompt(squareLiteSidelites.snapshot, null, ['authoritative flattened configured entrance'], detectedContext, true, fixedOuterBounds, { width: 1536, height: 1024 })
  assert.match(squareGlassPrompt, /automatically detected edit mask tightly encloses the entrance assembly/)
  assert.match(squareGlassPrompt, /Do not stretch square glass vertically or horizontally/)
  assert.match(squareGlassPrompt, /FIXED OUTER ENTRANCE BOUNDARY — AUTHORITATIVE PLACEMENT TARGET/)
  const hrt = doorStyles.find(item => item.code === 'HRT')!
  const hrtVariant = hrt.variants.find(item => item.lineId === '22-gauge-steel')!
  const glassProduct = resolveAiProduct({ ...aiTestConfiguration, style: hrt,
    product: { ...aiTestConfiguration.product, matchingVariants: [hrtVariant] },
    glass: glassOptions.find(item => item.id === 'hrt-clear-s11rt')!,
  })
  assert.ok(glassProduct.references.some(item => item.label === 'selected glass design'))
  for (const reference of glassProduct.references) assert.ok((await loadAiReference(reference.paths)).length > 0)
  const structuralScenarios = [
    { type: 'single', sidelites: 'none', expectedDoor: 'single', expectedSidelites: 'none' },
    { type: 'single', sidelites: 'hinge-side', expectedDoor: 'single', expectedSidelites: 'left' },
    { type: 'single', sidelites: 'lock-side', expectedDoor: 'single', expectedSidelites: 'right' },
    { type: 'single', sidelites: 'both-sides', expectedDoor: 'single', expectedSidelites: 'both' },
    { type: 'french', sidelites: 'none', expectedDoor: 'double', expectedSidelites: 'none' },
    { type: 'french', sidelites: 'hinge-side', expectedDoor: 'double', expectedSidelites: 'left' },
    { type: 'french', sidelites: 'lock-side', expectedDoor: 'double', expectedSidelites: 'right' },
    { type: 'french', sidelites: 'both-sides', expectedDoor: 'double', expectedSidelites: 'both' },
  ] as const
  for (const scenario of structuralScenarios) {
    const resolved = resolveAiProduct({
      ...aiTestConfiguration,
      doorConfigurationType: scenario.type,
      sidelites: scenario.sidelites,
      ...(scenario.sidelites === 'none' ? {} : { sideliteSlab: 'fsl', sideliteGlass: { glass: 'Clear Glass with No Grids' } }),
    })
    const block = aiStructuralInstructionBlock(resolved.snapshot)
    assert.match(block, new RegExp(`door_structure: ${scenario.expectedDoor}`))
    assert.match(block, new RegExp(`sidelite_structure: ${scenario.expectedSidelites}`))
    assert.match(block, /selected_door_style:/)
    assert.match(block, /selected_material:/)
    assert.match(block, /selected_finish:/)
    assert.match(block, /selected_glass:/)
    assert.match(block, /selected_grids:/)
    assert.match(block, /selected_sidelite_product_glass_grids:/)
    assert.match(block, /selected_hardware:/)
    assert.match(block, /selected_hardware_handing_active_leaf:/)
    assert.match(block, /selected_jamb_frame:/)
  }
  const authoritativeLabels = configuredReferences.map(item => item.label)
  const mismatchPrompt = aiPrompt(trusted.snapshot, null, authoritativeLabels)
  const fidelityBlock = aiProductFidelityInstructionBlock(trusted.snapshot)
  assert.match(fidelityBlock, /AUTHORITATIVE PRODUCT FIDELITY RULES/)
  assert.match(fidelityBlock, /Do not redesign the door\./)
  assert.match(fidelityBlock, /Do not change the panel layout\./)
  assert.match(fidelityBlock, /Do not change the glass layout\./)
  assert.match(fidelityBlock, /Do not change hardware count\./)
  assert.match(fidelityBlock, /Do not simplify the configured product into a generic door\./)
  assert.match(fidelityBlock, /Do not redesign, embellish, or simplify the selected product\./)
  assert.match(fidelityBlock, /Do not add optional features that were not selected\./)
  assert.match(fidelityBlock, /tiny jamb\/casing transition directly touching the configured frame/)
  assert.match(fidelityBlock, /Do not change brick, stone, siding, opening height, porch, steps, flooring, columns, landscaping/)
  assert.match(fidelityBlock, /flattened configured\/rendered entrance in Image 2 is the authoritative reference/)
  assert.match(fidelityBlock, /Do not reinterpret the style\./)
  assert.match(fidelityBlock, /Do not simplify the design\./)
  assert.match(fidelityBlock, /Do not embellish the design\./)
  assert.match(fidelityBlock, /Do not create a similar door\./)
  const geometryBlock = aiDoorGeometryInstructionBlock(trusted.snapshot)
  assert.match(geometryBlock, /AUTHORITATIVE DOOR GEOMETRY RULES/)
  assert.match(geometryBlock, /Preserve the exact number of glass lites/)
  assert.match(geometryBlock, /every lite’s aspect ratio/)
  assert.match(geometryBlock, /spacing from every other lite/)
  assert.match(geometryBlock, /panel count, panel layout, panel shapes/)
  assert.match(geometryBlock, /exact hardware type, exact count \(1\)/)
  assert.match(geometryBlock, /Do not elongate, widen, narrow, shrink, crop, merge, divide, rotate, or reposition glass lites arbitrarily/)
  assert.match(geometryBlock, /Make the result photorealistic, but keep the same geometry and proportions from the configured render/)
  assert.match(geometryBlock, /Preserve architecture outside the masked entrance/)
  assert.match(geometryBlock, /only a tiny jamb\/frame transition directly adjacent/)
  assert.match(mismatchPrompt, /AUTHORITATIVE PRODUCT FIDELITY RULES/)
  const detectedWideEntrance = { doorStructure: 'single', sidelites: 'both', transom: true, widthClass: 'wide', approximateWidthRatio: .42, structurallyWide: true, confidence: .94, summary: 'Single door with two sidelites and a transom.' } as const
  const fitBlock = aiEntranceFitInstructionBlock(entranceFitContext(detectedWideEntrance, 'use-selected-product'))
  assert.match(fitBlock, /ENTRANCE FIT STRATEGY — AUTHORITATIVE FOR ARCHITECTURAL FIT/)
  assert.match(fitBlock, /selected Door Builder configuration as authoritative/)
  assert.match(fitBlock, /Do not silently choose a different fit strategy/)
  assert.equal(detectedEntranceStructure({ ...detectedWideEntrance, confidence: .4 }), 'unknown')
  const singleNone = { ...detectedWideEntrance, sidelites: 'none', transom: false, structurallyWide: false } as const
  assert.equal(evaluateEntranceCompatibility(singleNone, aiTestConfiguration)?.status, 'good-fit')
  assert.equal(evaluateEntranceCompatibility({ ...singleNone, sidelites: 'both' }, aiTestConfiguration)?.status, 'incompatible')
  assert.equal(evaluateEntranceCompatibility({ ...singleNone, doorStructure: 'double' }, aiTestConfiguration)?.status, 'incompatible')
  assert.equal(evaluateEntranceCompatibility({ ...singleNone, doorStructure: 'double', sidelites: 'both' }, aiTestConfiguration)?.status, 'incompatible')
  assert.equal(evaluateEntranceCompatibility({ ...singleNone, transom: true }, aiTestConfiguration)?.status, 'good-fit')
  assert.equal(evaluateEntranceCompatibility({ ...singleNone, confidence: .4 }, aiTestConfiguration), null)
  const compatibilityCodes = ['S0', 'SL', 'SR', 'SB', 'D0', 'DL', 'DR', 'DB'] as const
  const sideBySuffix = { '0': 'none', L: 'left', R: 'right', B: 'both' } as const
  const selectedSideBySuffix = { '0': 'none', L: 'hinge-side', R: 'lock-side', B: 'both-sides' } as const
  const compatibilityCounts = { 'good-fit': 0, incompatible: 0 }
  for (const existing of compatibilityCodes) for (const selected of compatibilityCodes) {
    const detectedDoor = existing[0] === 'D' ? 'double' : 'single'
    const selectedDoor = selected[0] === 'D' ? 'french' : 'single'
    const detectedSide = sideBySuffix[existing[1] as keyof typeof sideBySuffix]
    const selectedSide = selectedSideBySuffix[selected[1] as keyof typeof selectedSideBySuffix]
    const result = evaluateEntranceCompatibility({ ...singleNone, doorStructure: detectedDoor, sidelites: detectedSide }, { ...aiTestConfiguration, doorConfigurationType: selectedDoor, sidelites: selectedSide })
    assert.ok(result)
    compatibilityCounts[result!.status] += 1
  }
  assert.deepEqual(compatibilityCounts, { 'good-fit': 14, incompatible: 50 })
  assert.equal(getDetectedVisualizerOpeningFamily({ ...singleNone, sidelites: 'left' }), 'B')
  assert.equal(getDetectedVisualizerOpeningFamily({ ...singleNone, doorStructure: 'double', sidelites: 'none' }), 'C')
  assert.equal(getSelectedVisualizerOpeningFamily({ ...aiTestConfiguration, doorConfigurationType: 'french' }), 'C')
  assert.equal(getSelectedVisualizerOpeningFamily({ ...aiTestConfiguration, doorConfigurationType: 'savannah' }), 'C')
  const doNotInventBlock = aiDoNotInventInstructionBlock(trusted.snapshot)
  assert.match(doNotInventBlock, /DO NOT ADD OR INVENT DETAILS/)
  assert.match(doNotInventBlock, /UNSELECTED FEATURES MUST NOT APPEAR/)
  assert.match(doNotInventBlock, /No door grids are selected\. Do not show grids, muntins, grille bars/)
  assert.match(doNotInventBlock, /No sidelites are selected\. Do not add, retain, imply, or fabricate sidelites/)
  assert.match(doNotInventBlock, /No door glass is selected\. Do not create glass panes, lites/)
  assert.match(doNotInventBlock, /Show exactly 1 configured visible hardware placement—no more and no fewer/)
  assert.match(doNotInventBlock, /exact selected panel count, panel layout and panel shapes/)
  assert.match(doNotInventBlock, /exact selected glass-lite count and layout/)
  assert.match(doNotInventBlock, /Do not add knockers, kickplates, mail slots, peepholes, clavos, straps/)
  assert.match(doNotInventBlock, /never invent a transom where none exists/)
  assert.match(mismatchPrompt, /DO NOT ADD OR INVENT DETAILS/)
  const twoHardware = resolveAiProduct({ ...aiTestConfiguration, doorConfigurationType: 'french', doubleDoorLockPrep: 'DDLLBO' })
  assert.equal(twoHardware.snapshot.hardware.count, 2)
  assert.match(aiProductFidelityInstructionBlock(twoHardware.snapshot), /exactly 2 configured visible hardware placements/)
  assert.match(aiProductFidelityInstructionBlock(twoHardware.snapshot), /remove one handle when two are configured/)
  assert.match(aiDoNotInventInstructionBlock(twoHardware.snapshot), /Show exactly 2 configured visible hardware placements—no more and no fewer/)
  const structuralConversions = [
    ['single to double', /Original single -> target double:/],
    ['double to single', /Original double -> target single:/],
    ['single both sidelites to single none', /Existing single with both sidelites -> target single with none:/],
    ['single both sidelites to double none', /Existing single with both sidelites -> target double with none:/],
    ['double none to single none', /Original double -> target single: this mismatch must be handled by compatibility rules before generation/],
    ['double none to single both', /Existing double with none -> target single with both:/],
    ['double both sidelites to single left', /Existing double with both sidelites -> target single with left only:/],
    ['both sidelites to left only', /Existing both sidelites -> target left only:/],
    ['left only to right only', /Existing left only -> target right only:/],
    ['preserve architecture for width mismatch', /Preserve the existing architecture outside the entrance opening/],
    ['existing transom', /Preserve an existing transom by default/],
    ['storm or screen door', /A storm or screen door is not the configured primary entry door/],
    ['nearby windows are not sidelites', /Do not mistake an adjacent house window for a sidelite/],
    ['arched and constrained entrances', /Preserve arches, recessed construction, close columns/],
  ] as const
  for (const [, pattern] of structuralConversions) assert.match(mismatchPrompt, pattern)
  assert.match(mismatchPrompt, /Do not preserve an original door leaf or sidelite merely because it exists in the photo/)
  assert.match(mismatchPrompt, /target sidelite_structure is the sole authority/)
  assert.match(mismatchPrompt, /DOOR SLABS, SIDELITES, AND SURROUNDING ARCHITECTURE ARE THREE SEPARATE WIDTH REGIONS/)
  assert.match(mismatchPrompt, /Do not interpret the entire original framed opening as flexible product width/)
  assert.equal(AI_SINGLE_DOOR_WIDTH_BIAS, .94)
  assert.match(mismatchPrompt, /apply a subtle width bias of 0\.94 \(about 6% narrower\)/)
  assert.match(mismatchPrompt, /keeping its height unchanged/)
  assert.match(mismatchPrompt, /approximately 0\.35 of the adjusted single slab/)
  assert.match(mismatchPrompt, /never change porch, steps, columns, wall, masonry, siding/)
  assert.match(mismatchPrompt, /DOUBLE-DOOR RULE: a target double entrance must remain exactly two normally proportioned residential door slabs/)
  assert.match(mismatchPrompt, /minimum jamb\/frame\/opening boundary inside the mask/)
  assert.match(mismatchPrompt, /The slab must not become oversized because the old composition was wide/)
  assert.match(mismatchPrompt, /BAD RESULTS TO AVOID: one giant single slab/)
  assert.match(mismatchPrompt, /ghost seams left by removed sidelites/)
  assert.doesNotMatch(mismatchPrompt, /always preserve (?:all )?existing sidelites/i)
  assert.doesNotMatch(mismatchPrompt, /always remove (?:all )?existing sidelites/i)
  const savannah = resolveAiProduct({ ...aiTestConfiguration, doorConfigurationType: 'savannah' })
  assert.match(aiStructuralInstructionBlock(savannah.snapshot), /door_structure: double/)
  console.log(`AI structural prompt matrix: ${structuralScenarios.length} target configurations; ${structuralConversions.length} source/conversion and architectural cases; 2 non-contradiction guards.`)
  checks += 11

  const result = await request(JSON.stringify(source), 200)
  assert.ok(result.image?.startsWith('data:image/jpeg;base64,'))
  assert.ok(result.request_id)
  assert.ok(result.completion_token)
  const completion = await complete({ request_id: result.request_id, completion_token: result.completion_token, total_visualization_duration_ms: 63_800, entrance_stage_duration_ms: 8_450 }, 200)
  assert.equal(completion.ok, true)
  assert.deepEqual(telemetryUpdates.at(-1), { total_visualization_duration_ms: 63_800, entrance_stage_duration_ms: 8_450, completion_token_hash: null })
  await complete({ request_id: result.request_id, completion_token: result.completion_token, total_visualization_duration_ms: -1 }, 400)
  assert.ok(forwardedForm)
  const form = forwardedForm as FormData
  assert.equal(form.get('model'), 'gpt-image-2.5-sunburst')
  assert.equal(form.get('n'), '1')
  assert.equal(form.get('quality'), 'xhigh')
  assert.equal(form.get('size'), '1536x1024')
  assert.equal(form.get('output_format'), 'jpeg')
  assert.equal(form.get('output_compression'), '100')
  assert.equal((form.getAll('image[]')[0] as File).name, 'house.webp')
  assert.equal(form.getAll('image[]').length, 2, 'House plus one authoritative completed configured entrance')
  assert.equal((form.getAll('image[]')[1] as File).name, 'reference-1.png')
  assert.ok(form.get('mask') instanceof Blob)
  const prompt = String(form.get('prompt'))
  assert.match(prompt, /Black/); assert.match(prompt, /#242424/)
  assert.match(prompt, /AUTHORITATIVE TARGET ENTRANCE STRUCTURE/)
  assert.match(prompt, /AUTHORITATIVE DOOR GEOMETRY RULES/)
  assert.match(prompt, /Image 2 is the single primary authoritative configured-product target/)
  assert.match(prompt, /AUTHORITATIVE COMPLETE ENTRANCE AND SIDELITE RULES/)
  assert.match(prompt, /single primary authoritative configured-product target/)
  assert.match(prompt, /door_structure: single/)
  assert.match(prompt, /sidelite_structure: none/)
  assert.match(prompt, /Ignore original reference door\/sidelite colors/)
  assert.match(prompt, /NOT an inspiration image/)
  assert.match(prompt, /Image 2 — authoritative flattened configured entrance: the PRIMARY AND AUTHORITATIVE product reference/)
  assert.doesNotMatch(prompt, /Image 3/)
  assert.match(prompt, /Do not substitute a different or generic knob/)
  assert.match(prompt, /grid count implied by the selected layout\/reference/)
  assert.match(prompt, /Smooth steel must remain smooth steel/)
  assert.match(prompt, /Do not oversoften, blur away/)
  assert.doesNotMatch(prompt, /finalEntranceImage|html2canvas|\/assets\//)
  assert.equal(telemetryRows.length, 1)
  assert.deepEqual({
    status: telemetryRows[0].status,
    model: telemetryRows[0].model,
    quality: telemetryRows[0].quality,
    output_size: telemetryRows[0].output_size,
    output_format: telemetryRows[0].output_format,
    input_tokens: telemetryRows[0].input_tokens,
    text_input_tokens: telemetryRows[0].text_input_tokens,
    image_input_tokens: telemetryRows[0].image_input_tokens,
    output_tokens: telemetryRows[0].output_tokens,
    image_output_tokens: telemetryRows[0].image_output_tokens,
    total_tokens: telemetryRows[0].total_tokens,
  }, {
    status: 'succeeded', model: 'gpt-image-2.5-sunburst', quality: 'xhigh', output_size: '1536x1024', output_format: 'jpeg',
    input_tokens: 1400, text_input_tokens: 400, image_input_tokens: 1000, output_tokens: 2000, image_output_tokens: 2000, total_tokens: 3400,
  })
  assert.equal(telemetryRows[0].estimated_cost_usd, .07)
  assert.equal(telemetryRows[0].environment, 'development')
  assert.equal(typeof telemetryRows[0].completion_token_hash, 'string')
  assert.equal(aiUsageEnvironment('production'), 'production')
  assert.equal(aiUsageEnvironment('preview'), 'preview')
  assert.equal(aiUsageEnvironment(undefined), 'development')
  assert.equal(AI_IMAGE_PRICING_USD_PER_MILLION['gpt-image-2.5-sunburst'].imageOutput, 30)
  assert.equal(estimateImageGenerationCost('gpt-image-2.5-sunburst', normalizeImageUsage(usage)), .07)

  const automaticResult = await request({ ...source, corners: undefined }, 200)
  assert.ok(automaticResult.image)
  assert.ok((forwardedForm as FormData).get('mask') instanceof Blob)
  assert.match(String((forwardedForm as FormData).get('prompt')), /Locate the existing main exterior entrance/)
  const unmasked = await request({ ...source, corners: undefined, entranceDetection: undefined }, 422)
  assert.equal(unmasked.error_code, 'INVALID_REQUEST')
  assert.match(unmasked.user_message!, /Help AI locate the entrance/)

  openAiFailure = 'rate'
  const failed = await request(source, 429)
  assert.equal(failed.error_code, 'OPENAI_RATE_LIMITED')
  assert.match(failed.user_message!, /try again/)
  assert.ok(failed.request_id)
  assert.doesNotMatch(JSON.stringify(failed), /SECRET|billing-test|mock-only-key/)
  openAiFailure = 'rejected'
  const rejected = await request(source, 422)
  assert.equal(rejected.error_code, 'OPENAI_REQUEST_REJECTED')
  openAiFailure = 'empty'
  const empty = await request(source, 502)
  assert.equal(empty.error_code, 'NO_GENERATED_IMAGE')
  assert.equal(telemetryRows.at(-1)?.status, 'failed')
  assert.equal(telemetryRows.at(-1)?.error_code, 'NO_GENERATED_IMAGE')
  assert.equal(telemetryRows.at(-1)?.image_output_tokens, 2000)
  openAiFailure = 'none'
  const before = calls
  const telemetryBefore = telemetryRows.length
  let release!: () => void
  gate = new Promise<void>(resolve => { release = resolve })
  const first = request(source, 200), second = request(source, 200)
  // Allow local image preparation to finish; release is non-paid and all fetches are mocked.
  release()
  await Promise.all([first, second])
  assert.equal(calls - before, 1, 'Identical simultaneous requests share one OpenAI operation in a warm instance')
  assert.equal(telemetryRows.length - telemetryBefore, 1, 'One OpenAI operation creates one telemetry record')
  const sequentialCallsBefore = calls
  const sequentialRowsBefore = telemetryRows.length
  const sequentialResults = [
    await request(source, 200),
    await request(source, 200),
    await request(source, 200),
  ]
  assert.equal(calls - sequentialCallsBefore, 3, 'Three consecutive requests create three OpenAI operations')
  assert.equal(telemetryRows.length - sequentialRowsBefore, 3, 'Three consecutive OpenAI operations create three telemetry records')
  assert.equal(new Set(sequentialResults.map((result) => result.request_id)).size, 3, 'Consecutive generations receive unique request IDs')
  telemetryFailure = true
  const succeedsDespiteTelemetryFailure = await request({ ...source, corners: undefined }, 200)
  assert.ok(succeedsDespiteTelemetryFailure.image, 'Telemetry failure must not fail successful image generation')
  telemetryFailure = false
  checks += 2
  console.log(`AI Visualizer: ${checks} API/image-preparation/security checks passed (OpenAI fully mocked).`)
} finally {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalKey
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL
  else process.env.SUPABASE_URL = originalSupabaseUrl
  if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
}
