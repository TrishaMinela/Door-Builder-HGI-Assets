import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { glassOptions, doorStyles, finishes, hardwareOptions } from '../src/data/options'
import { clicAvailable, clicOrderingCodes, clicSideliteOption, isClicGlass } from '../src/data/clicGlass'
import { fslGlassOptions } from '../src/data/fslGlass'
import { f48slGlassOptions } from '../src/data/f48slGlass'
import { sslGlassOptions } from '../src/data/sslGlass'
import { s2slGlassOptions } from '../src/data/s2slGlass'
import { cr14slGlassOptions } from '../src/data/cr14slGlass'
import { resolveDoorProduct } from '../src/data/productCatalog'
import { sideliteSlabAsset, sideliteGlassMask } from '../src/data/sideliteAssets'
import { sanitizeDoorBuilderDraft } from '../src/utils/doorBuilderDraft'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import type { DoorConfiguration } from '../src/types'

const paths = { F: ['nogrid', 'ext-8l', 'ext-10l', 'ext-15l'], F48: ['nogrid', 'ext-12l'], S: ['nogrid', 'ext-4l', 'ext-9l'] }
const finish = finishes.find(item => item.id === 'paint-clay')!
const contact = { fullName: 'CLiC fixture', email: 'fixture@example.invalid', phone: '', zip: '', notes: '' }
for (const [opening, suffixes] of Object.entries(paths)) for (const suffix of suffixes) {
  const id = `${opening.toLowerCase()}-clic-${suffix}`
  const option = glassOptions.find(item => item.id === id)!
  assert.ok(option)
  assert.deepEqual(option.orderingCodes, clicOrderingCodes(id))
  assert.ok(option.name.includes('CLiC'))
  assert.ok(existsSync(`public${option.overlaysByDoorStyle[opening]}`), `${id}: exact opening artwork exists`)
  if (opening === 'F48') assert.equal(option.overlaysByDoorStyle.F482, option.overlaysByDoorStyle.F48)
}
for (const catalog of [fslGlassOptions, f48slGlassOptions, sslGlassOptions]) {
  assert.deepEqual(catalog.filter(isClicGlass), [clicSideliteOption])
  assert.ok(!catalog.some(item => ['entl', 'entr'].includes(item.id)))
  assert.ok(catalog.some(item => item.id === 'clear-grids'), 'Ordinary clear grids unchanged')
}
assert.ok(![...s2slGlassOptions, ...cr14slGlassOptions].some(isClicGlass))
for (const file of ['FSLENTL', 'FSLENTR']) assert.ok(existsSync(`public/assets/hgi-assets/Sidelites/FSL/Glass/${file}.webp`))
const single = { configurationType: 'single' as const, lineId: 'signature-series', grain: 'Fir', openingCodes: ['F'] }
assert.equal(clicAvailable(single, 'fsl'), true)
assert.equal(clicAvailable(single, 'cr14sl'), false)
assert.equal(clicAvailable({ ...single, openingCodes: ['CR14'] }), false)
assert.equal(clicAvailable({ ...single, configurationType: 'french' }), false, 'Unfinished Fir French coverage not inferred')
assert.equal(clicAvailable({ ...single, configurationType: 'savannah' }), false)
assert.equal(clicAvailable({ ...single, lineId: '22-gauge-steel', configurationType: 'savannah' }), true)
assert.equal(clicAvailable({ ...single, lineId: '22-gauge-steel', configurationType: 'savannah' }, 'fsl'), false)
for (const lineId of ['20-gauge-smooth-steel', '22-gauge-steel', 'brushed-smooth-fiberglass', 'textured-fiberglass']) {
  assert.equal(clicAvailable({ ...single, lineId }, 'fsl'), true)
}
for (const [grain, openings] of Object.entries({ Cherry: ['F', 'F482', 'S'], Fir: ['F'], Mahogany: ['F', 'F48', 'S'], Oak: ['F', 'S'] })) {
  for (const opening of ['F', 'F48', 'F482', 'S']) assert.equal(clicAvailable({ ...single, grain, openingCodes: [opening] }), openings.includes(opening))
}
assert.equal(clicOrderingCodes('f-clic-ext-12l'), undefined)
assert.equal(clicOrderingCodes('s-clic-ext-15l'), undefined)
assert.equal(clicAvailable({ ...single, configurationType: 'french', lineId: 'signature-series', grain: 'Cherry' }, 'ssl'), true)
assert.equal(clicAvailable({ ...single, configurationType: 'french', lineId: '20-gauge-smooth-steel' }, 'fsl'), false)
for (const id of ['entl', 'entr']) {
  const draft = sanitizeDoorBuilderDraft({ version: 1, configuration: { sideliteGlassId: id, sideliteGlassCategory: 'clic' } })!
  assert.equal(draft.sideliteGlassId, '')
}

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5229', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5229')) resolve() })
    server.once('error', reject)
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 768, 390]) for (const side of ['fsl', 'f48sl', 'ssl'] as const) {
    console.log(`CLiC UI: ${width}px / ${side}`)
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    page.setDefaultTimeout(8000)
    await page.route('**/api/**', route => route.abort())
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(configuration => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration })), {
      selectedDoorConfigurationType: 'single', styleId: 'f-full-lite', doorLineId: '20-gauge-smooth-steel',
      sidelites: 'right', sideliteStyleId: side, sideliteGlassId: 'clic-nogrid', sideliteGlassCategory: 'clic',
      sideliteGlassVariantConfirmed: true, selectedFinishType: 'paint', selectedPaint: 'paint-clay',
      jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-clay',
      glassId: 'f-clic-ext-8l', selectedGlassCategory: 'clic', glassVariantConfirmed: true,
      hardwareId: hardwareOptions[0].id, doorSwingId: 'LHI',
    })
    await page.goto('http://127.0.0.1:5229/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    const headings: string[] = []
    for (let i = 0; i < 25; i++) {
      const intro = page.getByRole('button', { name: 'Start Configuring', exact: true })
      if (await intro.isVisible()) await intro.click()
      await page.waitForTimeout(150)
      if (await page.locator('.summary-card').count()) break
      const title = await page.locator('.step-heading h1').innerText().catch(async () => {
        if (await page.locator('.summary-card').count()) return 'summary'
        throw new Error(`Unexpected ${width}/${side} screen: ${(await page.locator('main').innerText()).slice(0, 1500)}; errors=${errors.join(';')}`)
      })
      if (title === 'summary') break
      headings.push(title)
      const next = page.getByRole('button', { name: 'Next configuration step' })
      assert.equal(await next.isEnabled(), true, headings.at(-1))
      await next.click()
    }
    assert.ok(!headings.some(title => /CLiC Finish/.test(title)))
    const summary = await page.locator('.summary-card').innerText()
    assert.ok(summary.includes('CLiC – No grids'))
    assert.ok(summary.includes('CLiC – External grids (8 lite)'))
    assert.ok(!await page.locator('img[src*="FSLENT"]').count())
    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.equal(draft.sideliteGlassId, 'clic-nogrid')
    assert.equal(draft.sidelites, 'right')
    assert.deepEqual(errors, [])
    await page.close()
  }
  // Exercise every ordinary main artwork and all three masked sidelite openings
  // through the same canvas renderer used by the PDF, with no real API calls.
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:5229/')
  for (const glass of glassOptions.filter(isClicGlass)) for (const opening of Object.keys(glass.overlaysByDoorStyle)) {
    const style = doorStyles.find(item => item.code === opening)!
    const configuration: DoorConfiguration = {
      doorConfigurationType: 'single', style, grain: null, finish,
      product: resolveDoorProduct(style, finish, undefined, '20-gauge-smooth-steel'), glass, mainDoorGlass: glass,
      grid: null, hardware: hardwareOptions[0], doorSwing: { id: 'LHI', name: 'Left Hand Inswing', image: '' },
      sidelites: 'right', sideliteStyle: 'FSL', sideliteSlab: 'fsl',
      sideliteGlass: { glass: clicSideliteOption.name, glassCategory: 'CLiC Glass', orderingCodes: clicSideliteOption.orderingCodes },
    }
    const payload = buildDoorBuilderSubmissionPayload({ configuration, contact })
    assert.ok(payload.main_door_glass.includes(glass.orderingCodes!.join(' / ')))
    assert.ok(payload.sidelite_glass.includes('CLICS / NOGRID / NONSTOCKSLGL'))
    for (const side of ['fsl', 'f48sl', 'ssl'] as const) {
      const assets = { glass, sideliteAssetSrc: sideliteSlabAsset('smooth-steel', side), sideliteMaskSrc: sideliteGlassMask('smooth-steel', side), sideliteClearGlassBase: true }
      const result = await page.evaluate(async ({ configuration, assets }) => {
        const modulePath = '/src/utils/pdfProductRenderer.ts'
        return (await import(modulePath)).renderPdfProduct(configuration, assets)
      }, { configuration: { ...configuration, sideliteSlab: side }, assets })
      assert.ok(result.dataUrl.startsWith('data:image/png;base64,'))
      assert.ok(result.assets.includes(glass.overlaysByDoorStyle[opening]))
      if (glass.orderingCodes?.includes('EXTG')) {
        const clearId = opening === 'S' ? 's-clear-no-grids' : opening === 'F' ? 'f-clear-no-grids' : 'f48-clear-no-grids'
        assert.ok(result.assets.includes(glassOptions.find(option => option.id === clearId)!.overlaysByDoorStyle[opening]), 'Transparent grids keep the opening-matched clear base')
      }
      assert.ok(!result.assets.some((path: string) => path.includes('FSLENT')))
    }
    assert.throws(() => buildDoorBuilderSubmissionPayload({ configuration: { ...configuration, sideliteGlass: { glass: 'CLiC – Left', glassCategory: 'CLiC Glass' } }, contact }))
  }
  await page.close()
  console.log('CLiC verified: ordinary paths/assets/codes; 9 responsive UI flows; 33 PDF renders; legacy rejection; coverage guards. No AI requests.')
} finally { await browser?.close(); server.kill() }
