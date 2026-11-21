import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import playwright from 'playwright-core'

const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const appearance = readFileSync(new URL('../src/styles/dealerAppearance.css', import.meta.url), 'utf8')

function cards(prefix: string) {
  return `<div class="options-grid" data-equal-product-grid>
    <button class="option-card" id="${prefix}-option"><span class="option-copy"><strong>Craftsman</strong></span></button>
    <button class="option-card selected" id="${prefix}-option-selected"><span class="option-copy"><strong>Selected door</strong></span></button>
    <article class="hardware-option-card" id="${prefix}-hardware"><span class="option-copy"><strong>Multipoint</strong></span></article>
    <article class="hardware-option-card selected" id="${prefix}-hardware-selected"><span class="option-copy"><strong>Selected hardware</strong></span></article>
  </div>`
}

const shell = (id: string, style: string, prefix: string) =>
  `<div class="app dealer-cobranded" id="${id}" style="--dealer-primary:#235176;--dealer-secondary:#8ebb53;${style}"><main class="configuration-step"><div class="builder-options-scroll">${cards(prefix)}</div></main></div>`

const html = `<!doctype html><style>${styles}${appearance}
.option-card,.hardware-option-card{transition:none !important}
</style>
${shell('plain', '', 'plain')}
${shell('themed', '--db-card-border:#c45500;--db-card-selected:#0b6b2a;--db-card-hover:#123a8a;', 'themed')}`

async function color(page: playwright.Page, selector: string, hover = false) {
  const locator = page.locator(selector)
  if (hover) await locator.hover({ force: true })
  return locator.evaluate((element) => getComputedStyle(element).borderTopColor)
}

const browser = await playwright.chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
  await page.setContent(html, { waitUntil: 'load' })
  const plainOption = await color(page, '#plain-option')
  const plainHardware = await color(page, '#plain-hardware')
  const plainOptionHover = await color(page, '#plain-option', true)
  const plainHardwareHover = await color(page, '#plain-hardware', true)
  const plainOptionSelected = await color(page, '#plain-option-selected')
  const plainHardwareSelected = await color(page, '#plain-hardware-selected')
  assert.equal(plainOption, 'rgb(207, 216, 218)')
  assert.equal(plainHardware, 'rgb(207, 216, 218)')
  assert.equal(plainOptionHover, 'rgb(170, 185, 188)')
  assert.equal(plainHardwareHover, 'rgb(170, 185, 188)')
  assert.equal(plainOptionSelected, 'rgb(35, 81, 118)')
  assert.equal(plainHardwareSelected, 'rgb(35, 81, 118)')

  assert.equal(await color(page, '#themed-option'), 'rgb(196, 85, 0)')
  assert.equal(await color(page, '#themed-hardware'), 'rgb(196, 85, 0)')
  assert.equal(await color(page, '#themed-option', true), 'rgb(18, 58, 138)')
  assert.equal(await color(page, '#themed-hardware', true), 'rgb(18, 58, 138)')
  assert.equal(await color(page, '#themed-option-selected'), 'rgb(11, 107, 42)')
  assert.equal(await color(page, '#themed-hardware-selected'), 'rgb(11, 107, 42)')
  const selectedOutline = await page.locator('#themed-option-selected').evaluate((element) => getComputedStyle(element).outlineColor)
  assert.equal(selectedOutline, 'rgb(11, 107, 42)')
  await page.close()
} finally {
  await browser.close()
}

console.info('Verified option and hardware card borders with and without appearance colors.')
