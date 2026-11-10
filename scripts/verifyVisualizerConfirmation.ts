import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium, type Page } from 'playwright-core'
import { doorStyles, hardwareOptions } from '../src/data/options'

const shots = process.env.HGI_CONFIRMATION_SHOTS
const server = await createServer({
  configFile: false,
  server: { host: '127.0.0.1', port: 5372, strictPort: true },
})
await server.listen()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const style = doorStyles.find((item) => item.code === 'F1') ?? doorStyles.find((item) => item.code === 'F')!
const draft = {
  version: 1,
  configuration: {
    selectedDoorConfigurationType: 'single',
    styleId: style.id,
    doorLineId: '20-gauge-smooth-steel',
    sidelites: 'none',
    selectedFinishType: 'paint',
    selectedPaint: 'paint-black',
    jambType: 'timber',
    jambFinishType: 'paint',
    jambFinishColor: 'paint-black',
    hardwareId: hardwareOptions[0].id,
    doorSwingId: 'LHI',
  },
}

async function openConfirmation(page: Page) {
  await page.addInitScript('window.__name = (fn) => fn')
  await page.addInitScript((value) => {
    localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value))
  }, draft)
  let submissions = 0
  await page.route('**/api/**', (route) => route.fulfill({ status: 503, json: { error: 'blocked' } }))
  await page.route('**/api/submit-door-builder', async (route) => {
    submissions += 1
    const body = route.request().postDataJSON()
    assert.equal(typeof body.submissionId, 'string')
    assert.equal(body.email, 'qa@example.invalid')
    assert.equal(body.full_name, 'Alex Sample')
    assert.equal(body.doorConfiguration?.schemaVersion, 1)
    await route.fulfill({ status: 200, json: { ok: true, destinations: { supabase: 'succeeded', zapier: 'succeeded' } } })
  })
  await page.goto(server.resolvedUrls?.local?.[0] ?? 'http://127.0.0.1:5372/')
  await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
  for (let i = 0; i < 40; i++) {
    const next = page.getByRole('button', { name: 'Next configuration step' })
    if (!(await next.count())) break
    if (await next.isDisabled()) {
      const card = page.locator('.builder-options-scroll .option-card').first()
      if (await card.count()) await card.click()
      else throw new Error(`Stuck on ${await page.locator('.step-heading h1').innerText()}`)
      continue
    }
    await next.click()
  }
  await page.getByRole('heading', { name: 'Configuration Summary', exact: true }).waitFor()
  await page.getByRole('button', { name: /Launch (Door )?Visualizer/i }).first().click()
  await page.getByRole('heading', { name: 'Complete Your Information', exact: true }).waitFor()
  await page.getByLabel(/Full Name/i).fill('Alex Sample')
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('qa@example.invalid')
  await page.getByLabel(/^Phone/i).fill('5550100000')
  await page.getByLabel(/ZIP/i).fill('46741')
  await page.getByRole('button', { name: 'Continue to Visualizer', exact: true }).click()
  await page.locator('.visualizer-home-success-card').waitFor()
  await page.evaluate(() => document.fonts.ready)
  return () => submissions
}

const viewports = [
  { name: '1440', width: 1440, height: 900, columns: true },
  { name: '768', width: 768, height: 1024, columns: true },
  { name: '390', width: 390, height: 844, columns: false },
]

try {
  if (shots) await mkdir(shots, { recursive: true })
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
    page.setDefaultTimeout(25000)
    const submissions = await openConfirmation(page)
    const card = page.locator('.visualizer-home-success-card')
    await page.getByRole('heading', { name: 'Your Door Is Ready to Visualize', exact: true }).waitFor()
    assert.equal(await card.locator('.form-screen-eyebrow').innerText(), 'INFORMATION RECEIVED')
    assert.equal(await card.locator('p').innerText(), 'Your door configuration has been received. Next, upload a photo of your entrance to see how your selected door could look on your home.')
    assert.equal(await card.locator('img').getAttribute('src'), '/assets/visualizer/view-on-your-home-tablet.webp')
    assert.equal(await card.getByText('See your configured door on your own entryway').count(), 0)
    const metrics = await card.evaluate((node) => {
      const box = (el: Element | null) => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }
      }
      const graphic = node.querySelector('.visualizer-confirmation-graphic')
      const intro = node.querySelector('.visualizer-confirmation-intro')
      const heading = node.querySelector('h1')
      const button = node.querySelector('.post-submit-visualizer-button')
      const paragraph = node.querySelector('p')
      const cardBox = node.getBoundingClientRect()
      const header = document.querySelector('header')
      return {
        scrollWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        viewportHeight: innerHeight,
        headerBottom: header ? header.getBoundingClientRect().bottom : 0,
        card: box(node),
        graphic: box(graphic),
        intro: box(intro),
        heading: box(heading),
        paragraph: box(paragraph),
        button: box(button),
        buttonPaint: button ? { background: getComputedStyle(button).backgroundColor, color: getComputedStyle(button).color, opacity: getComputedStyle(button).opacity } : null,
        gapAbove: Math.min(graphic?.getBoundingClientRect().top ?? 9999, intro?.getBoundingClientRect().top ?? 9999) - cardBox.top,
      }
    })
    console.log(viewport.name, JSON.stringify(metrics))
    assert.ok(metrics.scrollWidth <= metrics.viewport + 1, 'no horizontal overflow')
    assert.ok(metrics.heading && metrics.heading.y >= metrics.headerBottom - 1, 'heading is below the header')
    assert.ok(metrics.heading.y + metrics.heading.h <= metrics.viewportHeight, 'heading is inside the viewport')
    assert.ok(metrics.button && metrics.button.y >= (metrics.paragraph?.bottom ?? 0) - 2, 'button follows the description')
    assert.ok(metrics.button.y < metrics.viewportHeight, 'button starts inside the viewport')
    assert.ok(metrics.gapAbove <= 48, `content sits in the card padding, gap was ${metrics.gapAbove}`)
    assert.equal(metrics.buttonPaint?.opacity, '1')
    assert.equal(metrics.buttonPaint?.background, 'rgb(13, 102, 108)')
    assert.equal(metrics.buttonPaint?.color, 'rgb(255, 255, 255)')
    assert.ok(metrics.graphic && metrics.intro)
    if (viewport.columns) {
      assert.ok(metrics.graphic.right <= metrics.intro.x + 2, 'illustration stays left of the message')
      assert.ok(metrics.graphic.y < metrics.intro.bottom && metrics.intro.y < metrics.graphic.bottom, 'columns share a vertical band')
      assert.ok(Math.abs(metrics.button.x - metrics.heading.x) <= 8, 'button aligns with the heading')
    } else {
      assert.ok(metrics.intro.bottom <= metrics.graphic.y + 2, 'message and button stay together above the illustration')
      assert.ok(metrics.button.w >= metrics.intro.w - 4, 'button spans the mobile message column')
    }
    if (viewport.columns) assert.ok(metrics.button.w >= metrics.intro.w - 4, 'button spans the message column')
    if (shots) await page.screenshot({ path: `${shots}/confirmation_ready_${viewport.name}.png` })
    if (viewport.name === '390') {
      await page.getByRole('button', { name: 'Continue to Home Visualizer' }).click()
      await page.getByText('Upload a photo of your entrance', { exact: true }).waitFor()
      assert.equal(submissions(), 1)
    }
    await page.close()
  }
} finally {
  await browser.close()
  await server.close()
}
