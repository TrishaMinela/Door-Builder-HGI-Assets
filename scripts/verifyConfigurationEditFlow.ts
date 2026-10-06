import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { doorStyles, hardwareOptions } from '../src/data/options'
import type { DoorConfiguration } from '../src/types'

const draft = { version: 1, configuration: { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'F')!.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'none', selectedFinishType: 'paint', selectedPaint: 'paint-black', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-black', hardwareId: hardwareOptions[0].id, doorSwingId: 'LHI' } }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5194', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5194')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const photo = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#999999' } }).jpeg().toBuffer()
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(value => {
      if (window === window.top && !localStorage.getItem('hgi-door-builder-draft')) localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value))
      ;(window as unknown as { __name: (fn: unknown) => unknown }).__name = fn => fn
    }, draft)
    let detections = 0, generations = 0
    const payloads: { configuration: DoorConfiguration }[] = []
    await page.route('**/api/detect-entrance-structure', route => { detections++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ detection: { doorStructure: 'single', sidelites: 'none', transom: false, widthClass: 'standard', approximateWidthRatio: .35, structurallyWide: false, confidence: .96, summary: 'Single door.' }, request_id: 'test-analysis' }) }) })
    await page.route('**/api/generate-door-visualization', route => { generations++; payloads.push(route.request().postDataJSON()); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ image: `data:image/jpeg;base64,${photo.toString('base64')}` }) }) })
    const next = () => page.getByRole('button', { name: 'Next configuration step' }).click()
    const summary = () => page.getByRole('heading', { name: 'Configuration Summary' }).waitFor()
    const normalLayouts = new Map<string, unknown>()
    const stepLayout = () => page.evaluate(() => {
      const panel = document.querySelector('.builder-panel')!.getBoundingClientRect()
      return ['.step-label-row', '.step-heading h1', '.step-heading-copy > p', '.options-grid'].map(selector => {
        const rect = document.querySelector(selector)?.getBoundingClientRect()
        // Card/image height may settle by a pixel as assets load; compare the
        // heading geometry and the grid's origin, not asynchronous image height.
        return rect ? { top: Math.round(rect.top - panel.top), height: selector === '.options-grid' ? undefined : Math.round(rect.height), width: Math.round(rect.width) } : null
      })
    })
    const assertFloatingControl = async () => {
      const button = page.getByRole('button', { name: 'Done Editing', exact: true })
      assert.equal(await button.count(), 1, 'Only the responsive preview control is accessible')
      assert.deepEqual(await button.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color })), { background: 'rgb(17, 17, 17)', color: 'rgb(255, 255, 255)' }, 'Done Editing uses matching black/white styling')
      assert.ok(await button.evaluate(element => {
        const overlay = element.closest('.configuration-edit-return')!
        const preview = overlay.parentElement!
        const bounds = preview.getBoundingClientRect(), rect = overlay.getBoundingClientRect()
        return getComputedStyle(overlay).position === 'absolute'
          && preview.matches('.mobile-live-preview, .aside-preview-area')
          && rect.left >= bounds.left && rect.right <= bounds.right && rect.top >= bounds.top
      }), 'Control floats inside preview bounds')
      const rect = await button.boundingBox()
      for (const utility of await page.locator('.preview-view-toggle:visible, .preview-reset-design:visible').all()) {
        const other = await utility.boundingBox()
        if (rect && other) assert.ok(rect.x + rect.width <= other.x || other.x + other.width <= rect.x || rect.y + rect.height <= other.y || other.y + other.height <= rect.y, 'Done Editing does not cover preview utilities')
      }
    }
    const walkToSummary = async () => {
      for (let i = 0; i < 30 && await page.getByRole('button', { name: 'Next configuration step' }).count(); i++) {
        if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
        await page.waitForTimeout(100)
        if (!await page.getByRole('button', { name: 'Done Editing', exact: true }).count()) normalLayouts.set(await page.locator('.step-heading h1').innerText(), await stepLayout())
        await next(); await page.waitForTimeout(120)
      }
      await summary()
    }
    const card = (label: RegExp) => page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: label }) })
    await page.goto('http://127.0.0.1:5194/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    await page.getByRole('button', { name: 'Next configuration step' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Done Editing', exact: true }).count(), 0, 'Normal builder has no edit-only action')
    await walkToSummary()
    for (const [area, heading] of [['Color', 'Choose Your Door Finish'], ['Hardware', 'Choose Your Hardware'], ['Glass', 'Choose Main Door Glass Type'], ['Sidelites', 'Choose Your Sidelites'], ['Door', 'Choose a Door Style']]) {
      await page.getByRole('button', { name: `Edit ${area}`, exact: true }).click()
      await page.getByRole('heading', { name: heading, exact: true }).waitFor()
      await page.waitForTimeout(150)
      await assertFloatingControl()
      assert.deepEqual(await stepLayout(), normalLayouts.get(heading), `${width}px ${area}: edit mode leaves normal headings/grid geometry unchanged`)
      if (area === 'Door' || area === 'Sidelites') await page.screenshot({ path: `/tmp/floating-edit-${area.toLowerCase()}-${width}.png` })
      if (area === 'Color') await card(/^White$/).click()
      if (area === 'Hardware') await page.locator('.hardware-card-main').last().click()
      if (area === 'Glass') {
        await next()
        await card(/Clear Glass with No Grids/).first().click()
      }
      await page.getByRole('button', { name: 'Done Editing', exact: true }).click()
      await summary()
      assert.equal(await page.getByRole('button', { name: 'Done Editing', exact: true }).count(), 0)
    }
    assert.match(await page.locator('.summary-card').innerText(), /White/)
    await page.locator('.visualizer-promo-card:visible').getByRole('button', { name: 'Launch Visualizer' }).click()
    await page.locator('input[type=file]').setInputFiles({ name: 'same-house.jpg', mimeType: 'image/jpeg', buffer: photo })
    await page.getByText('AI Result', { exact: true }).waitFor({ timeout: 30000 })
    const originalUrl = await page.locator('.cleanup-comparison-original').getAttribute('src')
    const editToolbar = page.locator('.configuration-edit-actions-visualizer')
    assert.ok(await page.getByRole('heading', { name: 'Your new entrance', exact: true }).isVisible(), 'Result heading stays visible above the pills on desktop and mobile')
    assert.equal(await editToolbar.locator('h3').count(), 0, 'No Edit label above the pills')
    assert.deepEqual(await editToolbar.getByRole('button').allTextContents(), ['Door', 'Sidelites', 'Color', 'Glass', 'Hardware'])
    assert.ok(await editToolbar.evaluate(element => {
      const section = element.closest('.visualizer-final-result')!
      const heading = section.querySelector('.visualizer-final-heading')!.getBoundingClientRect()
      const image = section.querySelector('.ai-photo-result-area')!.getBoundingClientRect()
      const toolbar = element.getBoundingClientRect()
      return toolbar.top >= heading.bottom && toolbar.bottom <= image.top && toolbar.left >= image.left && toolbar.right <= image.right
    }), 'Pills are inside the final result container below the heading and above the comparison, without covering image controls')
    for (const pill of await editToolbar.getByRole('button').all()) {
      assert.deepEqual(await pill.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color })), { background: 'rgb(17, 17, 17)', color: 'rgb(255, 255, 255)' })
    }
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `/tmp/refined-visualizer-edit-${width}.png` })
    for (const [area, heading] of [['Color', 'Choose Your Door Finish'], ['Hardware', 'Choose Your Hardware'], ['Glass', 'Choose Main Door Glass Type'], ['Door', 'Choose a Door Style']]) {
      const previousGenerations = generations
      await page.getByRole('button', { name: `Edit ${area}`, exact: true }).click()
      await page.getByRole('heading', { name: heading, exact: true }).waitFor()
      if (area === 'Color') await card(/^Black$/).click()
      if (area === 'Hardware') await page.locator('.hardware-card-main').first().click()
      if (area === 'Glass') { await next(); await card(/Clear Glass with No Grids/).first().click() }
      if (area === 'Door') await card(/^F1 /).click()
      await page.waitForTimeout(150)
      assert.equal(generations, previousGenerations, 'No paid generation while editing')
      await page.getByRole('button', { name: 'Done Editing', exact: true }).click()
      await page.getByText('AI Result', { exact: true }).waitFor({ timeout: 30000 })
      assert.equal(await page.locator('.cleanup-comparison-original').getAttribute('src'), originalUrl, 'Original photo survives every edit')
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
      assert.equal(payloads.at(-1).configuration.finish.id, saved.selectedPaint)
      assert.equal(payloads.at(-1).configuration.hardware.id, saved.hardwareId)
      assert.equal(payloads.at(-1).configuration.style.id, saved.styleId)
      if (area === 'Door') assert.equal(saved.glassId, '', 'Changing to a solid style clears incompatible glass')
    }
    assert.equal(detections, 1, 'Same photo analysis is retained; compatibility uses new configuration')
    await page.getByRole('button', { name: 'Edit Sidelites', exact: true }).click()
    await card(/^Both Sidelites$/).click()
    await page.getByRole('button', { name: 'Done Editing', exact: true }).click()
    // New sidelites require their own product choices, not a broken final render.
    await page.getByRole('heading', { name: 'Choose Your Sidelite Slab' }).waitFor()
    await walkToSummary()
    await page.getByRole('button', { name: 'Done Editing', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    assert.equal(detections, 1)
    assert.equal(await page.getByRole('dialog').getByRole('button').count(), 2)
    await page.getByRole('dialog').getByRole('button', { name: 'Review Configuration' }).click()
    await summary()
    // Dependency reconciliation preserves compatible material/finish/hardware.
    await page.getByRole('button', { name: 'Edit Door', exact: true }).click()
    await card(/^F Full /).click()
    await page.getByRole('button', { name: 'Done Editing', exact: true }).click()
    await page.getByRole('heading', { name: 'Choose Main Door Glass Type' }).waitFor()
    await walkToSummary()
    await page.getByRole('button', { name: 'Done Editing', exact: true }).click()
    await summary()
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.equal(saved.doorLineId, '20-gauge-smooth-steel')
    assert.equal(saved.selectedPaint, 'paint-black')
    assert.ok(saved.glassId, 'Newly required glass is completed through normal controls')
    const chips = page.locator('.configuration-edit-actions button')
    await chips.first().focus()
    assert.ok(await chips.first().evaluate(button => button === document.activeElement))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    await page.screenshot({ path: `/tmp/configuration-edit-summary-${width}.png` })
    await page.reload()
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    assert.equal(await page.getByRole('button', { name: 'Done Editing', exact: true }).count(), 0, 'Refresh restores draft without a stale navigation mode')
    console.log(`${width}px: all edit areas, direct returns, photo preservation, current AI payload, dependency routing, incompatibility, normal flow, focus, wrapping and reload passed.`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
