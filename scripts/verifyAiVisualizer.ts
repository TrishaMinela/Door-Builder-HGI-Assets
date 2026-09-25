import assert from 'node:assert/strict'
import sharp from 'sharp'
import handler from '../api/generate-door-visualization.ts'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { doorStyles, glassOptions } from '../src/data/options'
import { aiPixelCorners, aiWorkingSize } from '../src/features/home-visualizer/aiImagePreparation'
import { AI_SINGLE_DOOR_WIDTH_BIAS, AiInputError, aiDoNotInventInstructionBlock, aiDoorGeometryInstructionBlock, aiProductFidelityInstructionBlock, aiPrompt, aiStructuralInstructionBlock, loadAiReference, prepareConfiguredProductReferences, prepareHouseAndMask, resolveAiProduct } from '../server/aiDoorVisualization'

const originalFetch = globalThis.fetch
const originalKey = process.env.OPENAI_API_KEY
process.env.OPENAI_API_KEY = 'mock-only-key'
const corners = { topLeft: { x: .2, y: .1 }, topRight: { x: .8, y: .1 }, bottomRight: { x: .8, y: .9 }, bottomLeft: { x: .2, y: .9 } }
const bytes = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#888888' } }).jpeg().toBuffer()
const productReferenceBytes = await sharp({ create: { width: 600, height: 1200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: Buffer.from('<svg width="600" height="1200"><rect x="90" y="40" width="420" height="1120" rx="4" fill="#242424"/><rect x="250" y="210" width="100" height="360" fill="#b9d5df"/></svg>') }])
  .png().toBuffer()
const productReference = `data:image/png;base64,${productReferenceBytes.toString('base64')}`
const source = { photo: `data:image/jpeg;base64,${bytes.toString('base64')}`, productReference, corners, configuration: aiTestConfiguration }
let forwardedForm: FormData | null = null
let calls = 0
let openAiFailure: 'none' | 'rate' | 'rejected' | 'empty' = 'none'
let gate: Promise<void> | null = null
globalThis.fetch = (async (url, init) => {
  calls += 1
  assert.equal(url, 'https://api.openai.com/v1/images/edits', 'Never fetch a browser-supplied URL')
  assert.equal(init?.method, 'POST')
  assert.ok(init?.body instanceof FormData)
  forwardedForm = init.body
  if (gate) await gate
  if (openAiFailure === 'rate') return new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded', message: 'SECRET INTERNAL ERROR' } }), { status: 429, headers: { 'x-request-id': 'openai-rate-test' } })
  if (openAiFailure === 'rejected') return new Response(JSON.stringify({ error: { code: 'invalid_image', type: 'image_generation_user_error', message: 'SECRET INTERNAL ERROR' } }), { status: 400, headers: { 'x-request-id': 'openai-rejected-test' } })
  if (openAiFailure === 'empty') return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'x-request-id': 'openai-empty-test' } })
  return new Response(JSON.stringify({ data: [{ b64_json: 'YWktcmVzdWx0' }] }), { status: 200, headers: { 'x-request-id': 'openai-success-test' } })
}) as typeof fetch

let checks = 0
async function request(body: unknown, expected: number, method = 'POST', headers?: Record<string, string>) {
  let status = 0, result: unknown
  const response = { status(code: number) { status = code; return this }, json(body: unknown) { result = body }, setHeader() {} }
  await handler({ method, body, headers }, response)
  assert.equal(status, expected)
  checks += 1
  return result as { image?: string; error_code?: string; user_message?: string; request_id?: string }
}

try {
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
  console.log('AI house-photo normalization fixtures:', fixtureReport)
  checks += 10

  const trusted = resolveAiProduct(aiTestConfiguration)
  const configuredReferences = await prepareConfiguredProductReferences(productReference)
  assert.equal(configuredReferences.length, 2)
  assert.equal(configuredReferences[0].label, 'authoritative flattened configured entrance')
  assert.equal(configuredReferences[1].label, 'authoritative tight configured-entrance geometry crop')
  assert.ok(configuredReferences[1].width < configuredReferences[0].width, 'The emphasis reference removes transparent side padding')
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
  assert.match(fidelityBlock, /adjust architecture around the configured door rather than redesigning the door itself/)
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
  assert.match(geometryBlock, /Adjust the surrounding architecture to fit the configured door, not the configured door to fit the surrounding architecture/)
  assert.match(mismatchPrompt, /AUTHORITATIVE PRODUCT FIDELITY RULES/)
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
    ['double none to single none', /Original double -> target single: install one normally proportioned slab/],
    ['double none to single both', /Existing double with none -> target single with both:/],
    ['double both sidelites to single left', /Existing double with both sidelites -> target single with left only:/],
    ['both sidelites to left only', /Existing both sidelites -> target left only:/],
    ['left only to right only', /Existing left only -> target right only:/],
    ['target wider than source', /If the target is wider than the existing entrance/],
    ['target narrower than source', /If the target is narrower/],
    ['existing transom', /Preserve an existing transom by default/],
    ['storm or screen door', /A storm or screen door is not the configured primary entry door/],
    ['nearby windows are not sidelites', /Do not mistake an adjacent house window for a sidelite/],
    ['arched and constrained entrances', /Preserve arches, recessed construction, close columns/],
  ] as const
  for (const [, pattern] of structuralConversions) assert.match(mismatchPrompt, pattern)
  assert.match(mismatchPrompt, /Do not preserve an original door leaf or sidelite merely because it exists in the photo/)
  assert.match(mismatchPrompt, /target sidelite_structure is the sole authority/)
  assert.match(mismatchPrompt, /DOOR SLABS, SIDELITES, AND SURROUNDING ARCHITECTURE ARE THREE SEPARATE WIDTH REGIONS/)
  assert.match(mismatchPrompt, /Do not interpret the entire original framed opening or entrance composition as the width of the new target slab or slab pair/)
  assert.equal(AI_SINGLE_DOOR_WIDTH_BIAS, .94)
  assert.match(mismatchPrompt, /apply a subtle width bias of 0\.94 \(about 6% narrower\)/)
  assert.match(mismatchPrompt, /keeping its height unchanged/)
  assert.match(mismatchPrompt, /approximately 0\.35 of the adjusted single slab/)
  assert.match(mismatchPrompt, /Do not shrink the whole entrance, jamb, or surrounding architecture with the slab/)
  assert.match(mismatchPrompt, /DOUBLE-DOOR RULE: a target double entrance must remain exactly two normally proportioned residential door slabs/)
  assert.match(mismatchPrompt, /reconstruct every unused side region/)
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
  assert.ok(forwardedForm)
  const form = forwardedForm as FormData
  assert.equal(form.get('model'), 'gpt-image-2.5-sunburst')
  assert.equal(form.get('n'), '1')
  assert.equal(form.get('quality'), 'xhigh')
  assert.equal(form.get('output_format'), 'jpeg')
  assert.equal(form.get('output_compression'), '100')
  assert.equal((form.getAll('image[]')[0] as File).name, 'house.webp')
  assert.equal(form.getAll('image[]').length, 3, 'House plus authoritative full configured render and tight geometry crop')
  assert.equal((form.getAll('image[]')[1] as File).name, 'reference-1.png')
  assert.equal((form.getAll('image[]')[2] as File).name, 'reference-2.png')
  assert.ok(form.get('mask') instanceof Blob)
  const prompt = String(form.get('prompt'))
  assert.match(prompt, /Black/); assert.match(prompt, /#242424/)
  assert.match(prompt, /AUTHORITATIVE TARGET ENTRANCE STRUCTURE/)
  assert.match(prompt, /AUTHORITATIVE DOOR GEOMETRY RULES/)
  assert.match(prompt, /Image 2 is the primary authoritative configured-product target/)
  assert.match(prompt, /Image 3 is a tight emphasis view of the same target/)
  assert.match(prompt, /door_structure: single/)
  assert.match(prompt, /sidelite_structure: none/)
  assert.match(prompt, /Ignore original reference door\/sidelite colors/)
  assert.match(prompt, /NOT inspiration images/)
  assert.match(prompt, /Image 2 — authoritative flattened configured entrance: the PRIMARY AND AUTHORITATIVE product reference/)
  assert.match(prompt, /Image 3 — authoritative tight configured-entrance geometry crop: a SECOND AUTHORITATIVE VIEW/)
  assert.match(prompt, /Do not substitute a different or generic knob/)
  assert.match(prompt, /grid count implied by the selected layout\/reference/)
  assert.match(prompt, /Smooth steel must remain smooth steel/)
  assert.match(prompt, /Do not oversoften, blur away/)
  assert.doesNotMatch(prompt, /finalEntranceImage|html2canvas|\/assets\//)

  const automaticResult = await request({ ...source, corners: undefined }, 200)
  assert.ok(automaticResult.image)
  assert.equal((forwardedForm as FormData).get('mask'), null)
  assert.match(String((forwardedForm as FormData).get('prompt')), /Locate the existing main exterior entrance/)

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
  openAiFailure = 'none'
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
