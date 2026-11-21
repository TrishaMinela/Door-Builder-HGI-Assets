import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import playwright from 'playwright-core'

const css = readFileSync(new URL('../src/styles/dealerAppearance.css', import.meta.url), 'utf8')
const pair = readFileSync(new URL('../src/styles/logoPair.css', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const footer = readFileSync(new URL('../src/components/SiteFooter.css', import.meta.url), 'utf8')

assert.match(css, /\.door-style-catalog-grid > \.door-catalog-card/)
assert.match(css, /\.sidelite-catalog-grid > \.sidelite-catalog-card/)
assert.match(css, /\.door-configuration-grid > \.door-configuration-card/)
assert.match(css, /\.door-image-card \.door-details-trigger/)
assert.match(css, /outline-color: var\(--db-card-selected\)/)
assert.match(css, /outline: 2px solid var\(--db-card-hover\)/)
assert.match(css, /\.site-footer-feedback small :is\(a, span\)/)
const narrow = pair.slice(pair.indexOf('@media (max-width: 560px)'), pair.indexOf('@media (max-width: 400px)'))
assert.match(narrow, /--logo-pair-max-height:\s*32px/)
assert.doesNotMatch(narrow, /46%/)

const square = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="518" viewBox="0 0 500 518"><rect width="500" height="518" fill="#235176"/></svg>')}`
const wide = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="250" height="104" viewBox="0 0 250 104"><rect width="250" height="104" fill="#102418"/></svg>')}`
const html = `<!doctype html><style>${styles}${footer}${pair}${css}</style>
<div class="app dealer-cobranded" style="--dealer-secondary:#8ebb53;--dealer-secondary-foreground:#101417;--dealer-primary:#235176;--db-card-background:#fff4d6;--db-card-title:#7a1f1f;--db-card-border:#c45500;--db-card-selected:#0b6b2a;--db-card-hover:#123a8a;--db-footer-text:#ffd24a">
  <header>
    <div class="dealer-header-brand"><div class="dealer-brand-home"><div class="dealer-brand-mark dealer-brand-mark--pair logo-pair">
      <a class="dealer-logo-link logo-pair__link" href="https://diligentexteriorremodeling.com/"><img id="square" src="${square}" alt=""></a>
      <span class="dealer-logo-divider logo-pair__rule"></span>
      <a class="dealer-logo-link logo-pair__link" href="https://diligentwindowsupply.example/"><img id="wide" src="${wide}" alt=""></a>
    </div></div></div>
    <div class="dealer-header-actions">
      <button class="home-return" type="button"><svg viewBox="0 0 16 16" width="17" height="17"></svg><span>Home</span></button>
      <a class="dealer-website-link" href="https://example.com">Visit Our Website <svg viewBox="0 0 16 16" width="15" height="15"></svg></a>
    </div>
  </header>
  <main class="configuration-step"><div class="builder-options-scroll">
    <div class="options-grid door-configuration-grid door-style-catalog-grid">
      <button class="option-card door-catalog-card door-configuration-card selected" id="config"><span class="option-visual"></span><span class="option-copy"><strong>Single entry</strong><span>Description</span></span></button>
    </div>
    <div class="options-grid sidelite-catalog-grid">
      <button class="option-card sidelite-catalog-card" id="sidelite"><span class="option-copy"><strong>No sidelites</strong></span></button>
    </div>
    <div class="options-grid door-style-catalog-grid door-style-product-grid">
      <article class="option-card door-catalog-card door-image-card" id="image"><button class="door-details-trigger" type="button">View details</button></article>
    </div>
  </div></main>
  <footer class="site-footer shared-site-footer"><div class="site-footer-feedback"><small>Built with <span>♥</span> by <a href="https://schoolradius.co/">School Radius</a></small></div></footer>
</div>`

const browser = await playwright.chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] })
try {
  for (const width of [320, 390, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    await page.setContent(html, { waitUntil: 'load' })
    const squareBox = await page.locator('#square').boundingBox()
    const wideBox = await page.locator('#wide').boundingBox()
    assert.ok(squareBox && wideBox, `logos missing at ${width}`)
    const taller = Math.max(squareBox.height, wideBox.height)
    if (width <= 390) assert.ok(taller >= 28, `taller logo is ${taller}px at ${width}`)
    assert.ok(Math.abs(squareBox.width / squareBox.height - 500 / 518) < 0.2, `square distorted at ${width}`)
    assert.ok(wideBox.width / wideBox.height > 2, `wide logo squeezed at ${width}`)
    const overflow = await page.locator('header').evaluate((element) => element.scrollWidth - element.clientWidth)
    assert.ok(overflow <= 1, `header overflows by ${overflow}px at ${width}`)
    await page.close()
  }
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } })
  await page.setContent(html, { waitUntil: 'load' })
  const config = await page.locator('#config').evaluate((element) => {
    const style = getComputedStyle(element)
    const title = getComputedStyle(element.querySelector('strong')!)
    return { background: style.backgroundColor, border: style.borderTopColor, outline: style.outlineColor, title: title.color }
  })
  assert.equal(config.background, 'rgb(255, 244, 214)')
  assert.equal(config.title, 'rgb(122, 31, 31)')
  assert.equal(config.border, 'rgb(11, 107, 42)')
  assert.equal(config.outline, 'rgb(11, 107, 42)')
  const sidelite = await page.locator('#sidelite strong').evaluate((element) => getComputedStyle(element).color)
  const image = await page.locator('#image .door-details-trigger').evaluate((element) => getComputedStyle(element).color)
  assert.equal(sidelite, 'rgb(122, 31, 31)')
  assert.equal(image, 'rgb(122, 31, 31)')
  const credit = await page.locator('.site-footer-feedback small').evaluate((element) => getComputedStyle(element).color)
  const heart = await page.locator('.site-footer-feedback span').evaluate((element) => getComputedStyle(element).color)
  const school = await page.locator('.site-footer-feedback a').evaluate((element) => getComputedStyle(element).color)
  assert.equal(credit, 'rgb(255, 210, 74)')
  assert.equal(heart, 'rgb(255, 210, 74)')
  assert.equal(school, 'rgb(255, 210, 74)')
  await page.close()
} finally {
  await browser.close()
}

console.info('Verified 320px logo legibility, catalog card colors, and the footer credit color.')
