import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { doorStyles, hardwareOptions } from '../src/data/options'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5225', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5225')) resolve() })
    server.once('error', reject)
    setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref()
  })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const photo = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#999999' } }).jpeg().toBuffer()
  for (const [width, height] of [[1440, 1000], [820, 1180], [1180, 820], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    page.on('pageerror', error => console.error('Browser error:', error.message))
    await page.addInitScript(configuration => {
      if (!localStorage.getItem('hgi-door-builder-draft')) localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration }))
    }, { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(x => x.code === 'F')!.id,
      doorLineId: '20-gauge-smooth-steel', sidelites: 'none', doorSwingId: 'LHI',
      selectedFinishType: 'paint', selectedPaint: 'paint-black', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-black',
      glassId: 'f-clear-no-grids', selectedGlassCategory: 'clear', selectedGlassGroupKey: 'clear-glass-with-no-grids', glassVariantConfirmed: true,
      hardwareId: hardwareOptions[0].id })
    let feedbackPayload: { configuration: unknown; context: { step: string } } | undefined
    await page.route('**/api/submit-feedback', route => {
      feedbackPayload = route.request().postDataJSON()
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.route('**/api/detect-entrance-structure', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ detection: { doorStructure: 'single', sidelites: 'none', transom: false, widthClass: 'standard', approximateWidthRatio: .35, structurallyWide: false, confidence: .96, summary: 'Single door.' } }) }))
    await page.route('**/api/generate-door-visualization', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ image: `data:image/jpeg;base64,${photo.toString('base64')}` }) }))
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    const next = () => page.getByRole('button', { name: 'Next configuration step' }).click()
    const done = () => page.getByRole('button', { name: /^Done editing(?: · Back to photo)?$/ })
    const feedback = () => page.getByRole('button', { name: 'Send feedback', exact: true })
    const testFeedback = async (send = false) => {
      const before = await saved()
      await feedback().click()
      const dialog = page.getByRole('dialog', { name: 'Help us improve' })
      await dialog.waitFor()
      if (send) {
        await dialog.getByLabel('Name', { exact: false }).fill('Layout Test')
        await dialog.getByLabel('Email', { exact: false }).fill('layout@example.com')
        await dialog.getByLabel('Phone', { exact: false }).fill('5551234567')
        await dialog.getByLabel('Feedback', { exact: true }).fill('Mocked layout verification; not sent externally.')
        await dialog.getByRole('button', { name: 'Send Feedback', exact: true }).click()
        await page.getByRole('dialog', { name: 'Thanks for the feedback!' }).getByRole('button', { name: 'Close', exact: true }).click()
        assert.ok(feedbackPayload?.configuration)
      } else await page.keyboard.press('Escape')
      assert.deepEqual(await saved(), before, 'Feedback preserves configuration')
      await page.waitForTimeout(40)
      assert.ok(await feedback().evaluate(element => element === document.activeElement), 'Feedback restores trigger focus')
    }
    await page.goto('http://127.0.0.1:5225/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    assert.equal(await done().count(), 0, 'Normal configurations do not expose Done editing')
    for (let i = 0; i < 30 && await page.getByRole('button', { name: 'Next configuration step' }).count(); i++) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      if (await page.locator('.step-heading h1').innerText() === 'Choose a Door Style') {
        await testFeedback()
        assert.equal(await page.locator('[data-feedback-trigger-host="preview"]').count(), 0)
        await page.screenshot({ path: `/tmp/builder-actions-normal-${width}.png` })
      }
      await next()
    }
    await page.getByRole('heading', { name: 'Configuration Summary' }).waitFor()
    await page.locator('.visualizer-promo-card:visible').getByRole('button', { name: 'Launch Visualizer' }).click()
    await page.locator('input[type=file]').setInputFiles({ name: 'house.jpg', mimeType: 'image/jpeg', buffer: photo })
    await page.getByText('AI Result', { exact: true }).waitFor({ timeout: 30000 })
    const original = await page.locator('.cleanup-comparison-original').getAttribute('src')
    await page.locator('.configuration-edit-actions-visualizer').getByRole('button', { name: 'Edit Door', exact: true }).click()
    await page.getByRole('heading', { name: 'Choose a Door Style', exact: true }).waitFor()
    assert.equal(await done().count(), 1, 'Only one editing action is accessible')
    assert.ok(await done().isVisible())
    assert.ok(await done().evaluate(element => !element.closest('.mobile-live-preview, .aside-preview-area')))
    assert.ok(await page.locator('.builder-actions .next').evaluate(element => (getComputedStyle(element).backgroundColor.match(/\d+/g) ?? []).slice(0, 3).every(channel => Number(channel) >= 200)), 'Next remains a secondary light surface, including its hover state')
    await testFeedback(true)
    assert.ok(await done().isVisible(), 'Feedback preserves editing context')
    assert.ok(feedbackPayload?.context.step.includes('door-style'))
    if (width <= 600) {
      const doneBox = (await done().boundingBox())!, navBox = (await page.locator('.builder-step-actions').boundingBox())!, feedbackBox = (await feedback().boundingBox())!
      assert.ok(doneBox.y >= navBox.y + navBox.height && feedbackBox.y + feedbackBox.height <= navBox.y, 'Phone ordering: feedback, navigation, Done editing')
      assert.ok(doneBox.width >= width - 40, 'Phone Done editing is full width')
    } else {
      assert.ok(await page.getByText('Editing your design', { exact: true }).isVisible())
      const bar = (await page.locator('.editing-bar').boundingBox())!, toolbar = (await page.locator('.builder-toolbar').boundingBox())!
      assert.ok(bar.y >= toolbar.y + toolbar.height - 1, 'Editing bar sits below main progress navigation')
      assert.ok(bar.width >= width - 2, 'Editing bar spans the layout, including iPad portrait')
      const feedbackBox = (await feedback().boundingBox())!, navBox = (await page.locator('.builder-step-actions').boundingBox())!
      assert.ok(feedbackBox.x + feedbackBox.width < navBox.x, 'Feedback is left of Previous/Next')
    }
    await page.locator('.builder-options-scroll').evaluate(element => element.scrollTo(0, element.scrollHeight))
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(100)
    assert.ok(await done().isVisible(), 'Done editing stays visible while scrolling')
    const visibleDone = (await done().boundingBox())!
    assert.ok(visibleDone.y >= 0 && visibleDone.y + visibleDone.height <= height, 'Editing action remains inside the viewport while scrolling')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow')
    if (width <= 900) {
      const last = (await page.locator('.builder-options-scroll .option-card').last().boundingBox())!, actions = (await page.locator('.builder-actions').boundingBox())!
      assert.ok(last.y + last.height <= actions.y, 'Bottom padding keeps the final card above sticky actions')
    }
    await page.screenshot({ path: `/tmp/builder-actions-editing-${width}.png` })
    await done().click()
    await page.locator('.visualizer-page').waitFor()
    assert.equal(await page.locator('.cleanup-comparison-original').getAttribute('src'), original, 'Done editing returns directly to the existing photo')
    assert.equal(await done().count(), 0)
    await page.locator('.configuration-edit-actions-visualizer').getByRole('button', { name: 'Edit Color', exact: true }).click()
    await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: /^White$/ }) }).click()
    await done().click()
    await page.locator('.visualizer-page').waitFor()
    assert.equal((await saved()).selectedPaint, 'paint-white', 'Done editing returns with updated selections without traversing other steps')
    console.log(`${width}×${height}: normal/editing controls, feedback submit/close/focus, scrolling, padding, photo return passed.`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
