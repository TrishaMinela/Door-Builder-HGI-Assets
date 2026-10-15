import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { doorStyles, hardwareOptions } from '../src/data/options'
import { builderGroupForPage, builderGroupStart } from '../src/utils/builderNavigation'
import { assertBuilderTypography } from './builderTypographyAssertions'

for (const page of ['door-configuration', 'door-line', 'door-grain', 'door-style', 'sidelites', 'sidelite-style', 'door-swing']) assert.equal(builderGroupForPage(page), 'Door')
for (const page of ['door-finish', 'jamb-type', 'jamb-finish']) assert.equal(builderGroupForPage(page), 'Finish')
for (const page of ['glass-type', 'glass', 'glass-variant', 'grid-color', 'sidelite-glass-type', 'sidelite-glass-variant', 'sidelite-grid-width', 'glass-frame-color']) assert.equal(builderGroupForPage(page), 'Glass')
for (const page of ['hardware', 'lock-setup']) assert.equal(builderGroupForPage(page), 'Hardware')
assert.equal(builderGroupStart(['door-style', 'door-finish', 'sidelite-glass-type', 'hardware'], 'Glass'), 2)
assert.equal(builderGroupStart(['door-style', 'door-finish', 'hardware'], 'Glass'), -1)

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
  for (const [width, height] of [[1440, 1000], [820, 1180], [1180, 820], [390, 844], [320, 740]]) {
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
    const assertNavigationFeedback = async () => {
      assert.equal(await feedback().count(), 1, 'Feedback appears exactly once')
      assert.equal(await page.locator('.step-heading .builder-feedback-trigger, .review-heading .builder-feedback-trigger').count(), 0, 'No duplicate heading feedback')
      assert.ok(await feedback().evaluate(element => Boolean(element.closest('.builder-forward-actions')) && !element.closest('.options-grid, .preview-scene')), 'Feedback belongs to the right navigation group')
      const button = (await feedback().boundingBox())!, forward = (await page.getByRole('button', { name: 'Next configuration step' }).boundingBox())!
      const gap = forward.x - button.x - button.width
      assert.ok(gap >= 0 && gap <= 10, 'Feedback is immediately before Next')
      assert.ok(Math.abs(button.y + button.height / 2 - forward.y - forward.height / 2) < 2, 'Feedback and Next share a row')
      assert.ok(button.height >= 44 && button.width >= 44, 'Feedback has a comfortable touch target')
      assert.ok(await feedback().evaluate(element => {
        const style = getComputedStyle(element)
        return style.position === 'static' && style.borderTopWidth === '0px' && style.backgroundColor === 'rgba(0, 0, 0, 0)'
      }), 'Feedback is a low-emphasis text button')
    }
    const assertBottomAlignment = async () => {
      const nav = (await page.locator('.builder-step-actions').boundingBox())!, previous = (await page.getByRole('button', { name: 'Previous configuration step' }).boundingBox())!, forward = (await page.getByRole('button', { name: 'Next configuration step' }).boundingBox())!
      assert.ok(Math.abs(previous.x - nav.x) < 2 && Math.abs(forward.x + forward.width - nav.x - nav.width) < 2, 'Previous is far left and Next far right')
      assert.ok(Math.abs(previous.y - forward.y) < 2, `Bottom actions share a baseline: ${JSON.stringify({ nav, previous, forward })}`)
    }
    const testFeedback = async (send = false) => {
      const before = await saved()
      await feedback().click()
      const dialog = page.getByRole('dialog', { name: 'Help us improve' })
      await dialog.waitFor()
      await assertBuilderTypography(page, 'feedback')
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
    await assertBuilderTypography(page, 'home')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    assert.equal(await done().count(), 0, 'Normal configurations do not expose Done editing')
    const assertGroups = async (glass = true) => {
      const expected = glass ? ['Door', 'Finish', 'Glass', 'Hardware'] : ['Door', 'Finish', 'Hardware']
      await page.waitForFunction(labels => Array.from(document.querySelectorAll('.stepper em')).map(element => element.textContent).join('|') === labels.join('|'), expected)
      assert.deepEqual(await page.locator('.stepper em').allTextContents(), expected)
      assert.ok(await page.locator('.stepper em').evaluateAll(elements => elements.every(element => {
        const style = getComputedStyle(element), rect = element.getBoundingClientRect()
        return style.display !== 'none' && rect.width > 0 && element.scrollWidth <= element.clientWidth + 1
      })), 'All group labels are fully readable')
    }
    await assertGroups()
    const reset = page.getByRole('button', { name: 'Reset Design', exact: true }).filter({ visible: true }).first()
    await reset.click()
    await page.getByRole('dialog', { name: 'Start over?' }).waitFor()
    await assertBuilderTypography(page, 'reset-dialog')
    await page.keyboard.press('Escape')
    assert.ok(await page.locator('.step-heading h1').isVisible(), 'Long first-step heading stays readable on phones')
    assert.ok(await page.locator('.step-heading-copy > p').isVisible(), 'Intro remains visible above feedback')
    await assertNavigationFeedback()
    await assertBottomAlignment()
    await page.screenshot({ path: `/tmp/builder-actions-long-heading-${width}.png` })
    for (let i = 0; i < 30 && await page.getByRole('button', { name: 'Next configuration step' }).count(); i++) {
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      await assertBuilderTypography(page, `step-${i}`)
      if (await page.locator('.step-heading h1').innerText() === 'Choose a Door Style') {
        assert.equal(await page.locator('.stepper button[aria-current="step"] em').innerText(), 'Door')
        assert.match(await page.locator('.step-label-row').innerText(), /Step 1 of 4 · Door/i)
        await testFeedback()
        await assertNavigationFeedback()
        await assertBottomAlignment()
        assert.equal(await page.locator('[data-feedback-trigger-host="preview"]').count(), 0)
        await page.screenshot({ path: `/tmp/builder-actions-normal-${width}.png` })
      }
      if (await page.locator('.step-heading h1').innerText() === 'Choose Your Hardware') assert.equal(await page.getByRole('button', { name: 'Next configuration step' }).innerText(), 'Review & Quote')
      await next()
    }
    await page.getByRole('heading', { name: 'Configuration Summary' }).waitFor()
    await assertBuilderTypography(page, 'results')
    await testFeedback()
    assert.equal(await feedback().count(), 1, 'Results keep one feedback trigger')
    const resultActions = (await page.locator('.builder-step-actions').boundingBox())!, resultFeedback = (await feedback().boundingBox())!
    assert.ok(Math.abs(resultFeedback.x - resultActions.x) < 2, 'Results feedback is left-aligned, independently of configuration navigation')
    if (width <= 600) {
      const launch = (await page.getByRole('button', { name: 'Launch Door Visualizer', exact: true }).boundingBox())!
      assert.ok(launch.y + launch.height <= resultActions.y, 'Floating visualizer launch cannot cover results feedback')
    }
    assert.equal(await page.getByRole('button', { name: 'Next configuration step' }).count(), 0, 'Results do not show configuration Next')
    await page.screenshot({ path: `/tmp/builder-results-feedback-${width}.png` })
    const testSwitch = page.getByRole('switch', { name: 'Test current review experience' })
    const wasTestMode = await testSwitch.getAttribute('aria-checked') === 'true'
    if (wasTestMode) await testSwitch.click()
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click()
    await page.getByRole('heading', { name: 'Complete Your Information' }).waitFor()
    await assertBuilderTypography(page, 'contact-form')
    await page.getByRole('button', { name: 'Submit & Download PDF', exact: true }).click()
    assert.ok(await page.locator('.quote-fields [aria-invalid=true]').count() > 0)
    await assertBuilderTypography(page, 'contact-validation')
    await page.getByRole('button', { name: 'Back to Review', exact: true }).click()
    if (wasTestMode) await testSwitch.click()
    await page.locator('.visualizer-promo-card:visible').getByRole('button', { name: 'Launch Visualizer' }).click()
    await assertBuilderTypography(page, 'visualizer-upload')
    await page.locator('input[type=file]').setInputFiles({ name: 'house.jpg', mimeType: 'image/jpeg', buffer: photo })
    await page.getByText('AI Result', { exact: true }).waitFor({ timeout: 30000 })
    await assertBuilderTypography(page, 'visualizer-result')
    const original = await page.locator('.cleanup-comparison-original').getAttribute('src')
    await page.locator('.configuration-edit-actions-visualizer').getByRole('button', { name: 'Edit Door', exact: true }).click()
    await page.getByRole('heading', { name: 'Choose a Door Style', exact: true }).waitFor()
    assert.equal(await done().count(), 1, 'Only one editing action is accessible')
    assert.ok(await done().isVisible())
    assert.ok(await done().evaluate(element => !element.closest('.mobile-live-preview, .aside-preview-area')))
    assert.equal(await page.locator('.builder-actions .next').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(13, 102, 108)', 'Next remains the prominent brand-teal navigation action')
    await testFeedback(true)
    assert.ok(await done().isVisible(), 'Feedback preserves editing context')
    assert.ok(feedbackPayload?.context.step.includes('door-style'))
    assert.ok(await page.getByText('Editing your design', { exact: true }).isVisible())
    const bar = (await page.locator('.editing-bar').boundingBox())!, toolbar = (await page.locator('.builder-toolbar').boundingBox())!, header = (await page.locator('.app > header').boundingBox())!
    assert.ok(Math.abs(bar.y - (header.y + header.height)) <= 1 && bar.y + bar.height <= toolbar.y + 1, 'Editing bar is directly below black header, above navigation')
    assert.ok(bar.width >= width - 2, 'Editing bar spans every viewport')
    assert.equal(await page.locator('.builder-actions').getByRole('button', { name: /^Done editing/ }).count(), 0, 'No duplicate bottom action')
    assert.equal(await page.locator('.editing-bar').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(13, 102, 108)', 'Existing brand teal')
    await assertGroups()
    await assertNavigationFeedback()
    await assertBottomAlignment()
    await page.locator('.builder-options-scroll').evaluate(element => element.scrollTo(0, element.scrollHeight))
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(100)
    assert.ok(await done().isVisible(), 'Done editing stays visible while scrolling')
    const visibleDone = (await done().boundingBox())!
    assert.ok(visibleDone.y >= 0 && visibleDone.y + visibleDone.height <= height, 'Editing action remains inside the viewport while scrolling')
    await assertBottomAlignment()
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
    // A solid main slab hides Glass only when no sidelites need it either.
    await page.locator('.configuration-edit-actions-visualizer').getByRole('button', { name: 'Edit Door', exact: true }).click()
    await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: /^Nine Panel$/ }) }).click()
    await assertGroups(false)
    await page.locator('.stepper button').filter({ hasText: 'Door' }).click()
    await next() // Entry configuration → sidelite position, sequence unchanged.
    await page.locator('.builder-options-scroll .option-card').filter({ has: page.locator('strong').filter({ hasText: /^Right$/ }) }).click()
    await assertGroups()
    // Invalid sidelites may not be bypassed by forward group navigation.
    const glassGroup = page.locator('.stepper button').filter({ hasText: 'Glass' })
    assert.equal(await glassGroup.isDisabled(), false, 'Complete prior groups allow navigation to sidelite-only glass')
    await glassGroup.click()
    assert.match(await page.locator('.step-heading h1').innerText(), /Sidelite Glass/)
    assert.equal(await page.locator('.stepper button[aria-current="step"] em').innerText(), 'Glass')
    await done().click()
    // Adding a sidelite no longer matches the previously detected single opening.
    await page.getByRole('dialog', { name: 'This door configuration doesn’t match your entrance' }).waitFor()
    await assertBuilderTypography(page, 'incompatible-dialog')
    await page.getByRole('button', { name: 'Change Photo', exact: true }).click()
    console.log(`${width}×${height}: normal/editing controls, feedback submit/close/focus, scrolling, padding, photo return passed.`)
    await page.close()
    const fresh = await browser.newPage({ viewport: { width, height } })
    await fresh.goto('http://127.0.0.1:5225/')
    await fresh.getByRole('button', { name: 'Start Building', exact: true }).click()
    assert.ok(await fresh.getByRole('button', { name: 'Next configuration step' }).isDisabled(), 'An unanswered entry question blocks Next')
    for (const label of ['Finish', 'Hardware']) assert.ok(await fresh.locator('.stepper button').filter({ hasText: label }).isDisabled(), 'Group navigation cannot bypass required Door questions')
    assert.equal(await fresh.getByRole('button', { name: 'Done editing', exact: true }).count(), 0)
    await fresh.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
