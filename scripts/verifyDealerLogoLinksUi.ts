import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium, type Page } from 'playwright-core'

const port = 5196
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const shotDir = process.env.LOGO_LINK_SHOTS || '/tmp/hgi-logo-links'

const brand = {
  slug: 'northstar-doors',
  companyName: 'Northstar Doors',
  logoUrl: `http://127.0.0.1:${port}/assets/branding/hgi-logo-black.webp`,
  logoLightUrl: `http://127.0.0.1:${port}/assets/branding/hgi-logo-white.png`,
  logoGeneratedLightUrl: null,
  logoGeneratedLightUsable: true,
  logoBlackUrl: `http://127.0.0.1:${port}/assets/branding/hgi-logo-black.webp`,
  logoGeneratedBlackUrl: null,
  logoGeneratedBlackUsable: true,
  logoHeaderVariant: 'original' as const,
  logoPagesVariant: 'black' as const,
  logoPlacement: 'header' as const,
  logoDisplay: 'dual' as const,
  logoSecondaryUrl: `http://127.0.0.1:${port}/assets/branding/pro-match-logo.webp`,
  logoSecondaryLightUrl: `http://127.0.0.1:${port}/assets/branding/hgi-logo-white.png`,
  logoSecondaryGeneratedLightUrl: null,
  logoSecondaryGeneratedLightUsable: true,
  logoSecondaryBlackUrl: `http://127.0.0.1:${port}/assets/branding/timberstain-logo.webp`,
  logoSecondaryGeneratedBlackUrl: null,
  logoSecondaryGeneratedBlackUsable: true,
  logoSecondaryHeaderVariant: 'white' as const,
  logoSecondaryPagesVariant: 'black' as const,
  logoWebsiteUrl: 'https://northstar.example/brand',
  logoSecondaryWebsiteUrl: 'https://partner.example/doors',
  primaryColor: '#2456a6',
  secondaryColor: '#123044',
  websiteUrl: 'https://northstar.example/company',
  headingFontFamily: null, headingFontWeight: null, headingFontSize: null,
  bodyFontFamily: null, bodyFontWeight: null, bodyFontSize: null,
  customHeadingFontUrl: null, customHeadingFontName: null, customHeadingFontWeight: null,
  customBodyFontUrl: null, customBodyFontName: null, customBodyFontWeight: null,
}

function routeBrand(page: Page, dealer = brand) {
  return page.route('**/api/dealer-context**', route => route.fulfill({
    status: 200,
    json: { available: true, dealer },
  }))
}

async function expectLogoLinks(page: Page, scope: string) {
  const primary = page.locator(`${scope} a[aria-label="Northstar Doors website (opens in new tab)"]`)
  const secondary = page.locator(`${scope} a[aria-label="Northstar Doors partner website (opens in new tab)"]`)
  assert.equal(await primary.count(), 1)
  assert.equal(await secondary.count(), 1)
  assert.equal(await primary.getAttribute('href'), 'https://northstar.example/brand')
  assert.equal(await secondary.getAttribute('href'), 'https://partner.example/doors')
  for (const link of [primary, secondary]) {
    assert.equal(await link.getAttribute('target'), '_blank')
    assert.equal(await link.getAttribute('rel'), 'noopener noreferrer')
  }
  const divider = page.locator(`${scope} .dealer-logo-divider`)
  assert.equal(await divider.count(), 1)
  assert.equal(await divider.evaluate(element => element.closest('a')), null)
  const primaryBox = await primary.boundingBox()
  const dividerBox = await divider.boundingBox()
  const secondaryBox = await secondary.boundingBox()
  assert.ok(primaryBox && dividerBox && secondaryBox)
  assert.ok(primaryBox.x + primaryBox.width <= dividerBox.x + 1)
  assert.ok(dividerBox.x + dividerBox.width <= secondaryBox.x + 1)
}

try {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite startup timeout')), 20_000)
    server.stdout.on('data', chunk => {
      if (String(chunk).includes(`127.0.0.1:${port}`)) {
        clearTimeout(timer)
        resolve()
      }
    })
    server.stderr.on('data', chunk => {
      if (String(chunk).includes(`127.0.0.1:${port}`)) {
        clearTimeout(timer)
        resolve()
      }
    })
    server.once('error', reject)
    server.once('exit', code => reject(new Error(`Vite exited ${code}`)))
  })
  await mkdir(shotDir, { recursive: true })
  browser = await chromium.launch({ channel: 'chrome', headless: true })

  for (const [width, height, name] of [[1440, 1000, 'desktop'], [390, 844, 'mobile']] as const) {
    const page = await browser.newPage({ viewport: { width, height } })
    await routeBrand(page)
    await page.goto(`http://127.0.0.1:${port}/northstar-doors`)
    await page.getByRole('button', { name: 'Start Building Your Door' }).waitFor()
    await expectLogoLinks(page, 'header')
    assert.equal(await page.locator('.dealer-hero-logo a').count(), 0)
    await page.screenshot({ path: `${shotDir}/door-builder-header-${name}-${width}.png` })
    await page.keyboard.press('Tab')
    const first = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
    assert.equal(first, 'Northstar Doors website (opens in new tab)')
    await page.keyboard.press('Tab')
    const second = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
    assert.equal(second, 'Northstar Doors partner website (opens in new tab)')
    await page.getByRole('button', { name: 'Start Building Your Door' }).click()
    await page.locator('.builder-panel').waitFor()
    await expectLogoLinks(page, 'header')
    assert.equal(await page.getByRole('button', { name: 'Go to Northstar Doors Door Builder home' }).count(), 1)
    await page.close()
  }

  const heroPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await routeBrand(heroPage, { ...brand, logoPlacement: 'hero', logoDisplay: 'single', logoWebsiteUrl: null, logoSecondaryWebsiteUrl: 'https://partner.example/doors' })
  await heroPage.goto(`http://127.0.0.1:${port}/northstar-doors`)
  await heroPage.getByRole('button', { name: 'Start Building Your Door' }).waitFor()
  assert.equal(await heroPage.locator('.dealer-hero-logo').count(), 1)
  assert.equal(await heroPage.locator('.dealer-hero-logo a').count(), 0)
  assert.equal(await heroPage.locator('header .dealer-brand-mark').count(), 0)
  await heroPage.screenshot({ path: `${shotDir}/door-builder-hero-not-linked-1440.png` })
  await heroPage.close()

  const fallbackPage = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await routeBrand(fallbackPage, {
    ...brand,
    logoDisplay: 'single',
    logoWebsiteUrl: null,
    logoSecondaryWebsiteUrl: null,
    logoHeaderVariant: 'white',
    logoPagesVariant: 'black',
  })
  await fallbackPage.goto(`http://127.0.0.1:${port}/northstar-doors`)
  await fallbackPage.getByRole('link', { name: 'Northstar Doors website (opens in new tab)' }).waitFor()
  assert.equal(await fallbackPage.getByRole('link', { name: 'Northstar Doors website (opens in new tab)' }).getAttribute('href'), 'https://northstar.example/company')
  assert.equal(await fallbackPage.getByRole('link', { name: 'Northstar Doors partner website (opens in new tab)' }).count(), 0)
  await fallbackPage.screenshot({ path: `${shotDir}/door-builder-logo1-fallback-1440.png` })
  await fallbackPage.close()

  const missingSecond = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await routeBrand(missingSecond, { ...brand, logoSecondaryUrl: null, logoSecondaryLightUrl: null, logoSecondaryBlackUrl: null })
  await missingSecond.goto(`http://127.0.0.1:${port}/northstar-doors`)
  await missingSecond.getByRole('link', { name: 'Northstar Doors website (opens in new tab)' }).waitFor()
  assert.equal(await missingSecond.locator('header .dealer-brand-mark--pair').count(), 0)
  assert.equal(await missingSecond.locator('header .dealer-logo-divider').count(), 0)
  assert.equal(await missingSecond.getByRole('link', { name: 'Northstar Doors partner website (opens in new tab)' }).count(), 0)
  await missingSecond.close()

  const finder = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await routeBrand(finder, { ...brand, logoPagesVariant: 'original', logoSecondaryPagesVariant: 'original' })
  await finder.goto(`http://127.0.0.1:${port}/findmydoor?dealer=northstar-doors`)
  await finder.getByRole('link', { name: 'Northstar Doors website (opens in new tab)' }).waitFor()
  await expectLogoLinks(finder, 'header')
  assert.equal(await finder.getByRole('link', { name: 'Home Guard Door Builder home' }).getAttribute('href'), '/northstar-doors')
  const nested = await finder.locator('header a a').count()
  assert.equal(nested, 0)
  await finder.screenshot({ path: `${shotDir}/door-builder-find-my-door-1440.png` })
  await finder.close()

  console.info('Verified logo links at 1440 and 390, keyboard order, hero stays plain, and Find My Door links.')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
