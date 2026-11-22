import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import sharp from 'sharp'
import playwright, { type Page } from 'playwright-core'

const port = 4183
const widths = [320, 390, 768, 1024, 1440]
const svg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80" fill="#235176"/><text x="20" y="50" fill="#fff" font-size="28" font-family="Arial">LOGO</text></svg>')}`
const wide = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80" fill="#8ebb53"/><text x="12" y="50" fill="#102418" font-size="22" font-family="Arial">PARTNER</text></svg>')}`

type Appearance = Record<string, string> | null

function dealer(slug: string, appearance: Appearance) {
  const dual = slug === 'diligent-exterior-remodeling'
  return {
    slug,
    companyName: dual ? 'Diligent Exterior Remodeling' : 'Uhr',
    logoUrl: svg,
    logoLightUrl: null,
    logoGeneratedLightUrl: null,
    logoGeneratedLightUsable: null,
    logoBlackUrl: null,
    logoGeneratedBlackUrl: null,
    logoGeneratedBlackUsable: null,
    logoHeaderVariant: 'original',
    logoPagesVariant: 'original',
    logoPlacement: 'header',
    logoDisplay: dual ? 'dual' : 'single',
    logoSecondaryUrl: dual ? wide : null,
    logoSecondaryLightUrl: null,
    logoSecondaryGeneratedLightUrl: null,
    logoSecondaryGeneratedLightUsable: null,
    logoSecondaryBlackUrl: null,
    logoSecondaryGeneratedBlackUrl: null,
    logoSecondaryGeneratedBlackUsable: null,
    logoSecondaryHeaderVariant: dual ? 'original' : null,
    logoSecondaryPagesVariant: dual ? 'original' : null,
    logoWebsiteUrl: 'https://example.com/logo',
    logoSecondaryWebsiteUrl: dual ? 'https://example.com/partner' : null,
    primaryColor: '#235176',
    secondaryColor: '#8ebb53',
    websiteUrl: 'https://example.com',
    headingFontFamily: null,
    headingFontWeight: null,
    headingFontSize: null,
    bodyFontFamily: null,
    bodyFontWeight: null,
    bodyFontSize: null,
    customHeadingFontUrl: null,
    customHeadingFontName: null,
    customHeadingFontWeight: null,
    customBodyFontUrl: null,
    customBodyFontName: null,
    customBodyFontWeight: null,
    appearance,
  }
}

function paintOf(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      background: style.backgroundColor,
      color: style.color,
      border: style.borderTopColor,
      filter: style.filter,
      display: style.display,
    }
  })
}

async function pixelDelta(left: Buffer, right: Buffer) {
  const a = await sharp(left).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const b = await sharp(right).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) return 1
  let changed = 0
  const pixels = a.data.length / 4
  for (let index = 0; index < a.data.length; index += 4) {
    if (Math.abs(a.data[index] - b.data[index]) > 2 || Math.abs(a.data[index + 1] - b.data[index + 1]) > 2 || Math.abs(a.data[index + 2] - b.data[index + 2]) > 2) changed += 1
  }
  return changed / pixels
}

async function openDealer(page: Page, slug: string, appearance: Appearance, path: string) {
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('dealer-context')) {
      const requested = url.searchParams.get('slug') ?? url.searchParams.get('dealer')
      return route.fulfill({ json: { dealer: dealer(requested || slug, appearance) } })
    }
    return route.fulfill({ status: 204, body: '' })
  })
  await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'networkidle' })
}

async function reachStep(page: Page, label: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const active = (await page.locator('.stepper button.active em').innerText()).trim()
    if (active === label) return
    const next = page.locator('.builder-actions .next')
    if (await next.isDisabled()) {
      await page.locator('.builder-options-scroll .option-card').first().click()
      await page.waitForTimeout(150)
    }
    if (await next.isDisabled()) throw new Error(`Could not leave ${active} on the way to ${label}`)
    await next.click()
    await page.waitForTimeout(200)
  }
  throw new Error(`Did not reach ${label}`)
}

async function main() {
  const server: ChildProcess = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  let log = ''
  server.stdout?.on('data', (chunk) => { log += chunk })
  server.stderr?.on('data', (chunk) => { log += chunk })
  const deadline = Date.now() + 30000
  let ready = false
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/`)).ok) { ready = true; break }
    } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  if (!ready) throw new Error(log || 'Door Builder did not start')

  const browser = await playwright.chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] })
  try {
    for (const slug of ['uhr', 'diligent-exterior-remodeling']) {
      for (const width of widths) {
        const page = await browser.newPage({ viewport: { width, height: 900 } })
        await page.addStyleTag({ content: '*,*::before,*::after{animation:none !important;transition:none !important}' })
        await openDealer(page, slug, null, `/${slug}`)
        await page.locator('header img').first().waitFor()
        const header = await paintOf(page, 'header')
        const logoCount = await page.locator('header img').count()
        const logoLinks = await page.locator('header a.dealer-logo-link').count()
        assert.equal(header.background, 'rgb(142, 187, 83)', `${slug} ${width} header`)
        assert.equal(header.color, 'rgb(16, 20, 23)', `${slug} ${width} header text`)
        assert.equal(logoCount, slug === 'uhr' ? 1 : 2, `${slug} logos`)
        assert.equal(logoLinks, slug === 'uhr' ? 1 : 2, `${slug} logo links`)
        assert.equal((await paintOf(page, 'header img')).filter, 'none')
        const firstHeader = await page.locator('header').screenshot()
        await page.reload({ waitUntil: 'networkidle' })
        await page.locator('header img').first().waitFor()
        const secondHeader = await page.locator('header').screenshot()
        const headerDelta = await pixelDelta(firstHeader, secondHeader)
        assert.ok(headerDelta < 0.01, `${slug} ${width} header moved ${(headerDelta * 100).toFixed(2)}%`)

        await page.goto(`http://127.0.0.1:${port}/findmydoor?dealer=${slug}`, { waitUntil: 'networkidle' })
        await page.locator('header.find-my-door-header').waitFor()
        const finder = await paintOf(page, 'header.find-my-door-header')
        assert.equal(finder.background, 'rgb(5, 4, 11)', `${slug} ${width} finder header`)
        assert.equal(finder.color, 'rgb(255, 255, 255)', `${slug} ${width} finder text`)
        const finderMain = await paintOf(page, '.find-my-door-main')
        assert.equal(finderMain.background, 'rgba(0, 0, 0, 0)', `${slug} ${width} finder main`)

        await page.goto(`http://127.0.0.1:${port}/${slug}`, { waitUntil: 'networkidle' })
        await page.getByRole('button', { name: /Start Building/i }).click()
        await page.locator('.builder-panel').waitFor()
        const panel = await paintOf(page, '.builder-panel')
        const aside = await paintOf(page, 'aside')
        const preview = await paintOf(page, '.mobile-live-preview')
        assert.equal(panel.background, 'rgb(245, 247, 247)', `${slug} ${width} panel`)
        if (width >= 1024) assert.equal(aside.background, 'rgb(233, 240, 241)', `${slug} ${width} aside`)
        else assert.equal(aside.display, 'none', `${slug} ${width} aside hidden`)
        assert.equal(preview.background, 'rgb(233, 240, 241)', `${slug} ${width} mobile preview`)
        assert.equal((await paintOf(page, '.option-card strong')).color, 'rgb(5, 4, 11)')
        assert.equal((await paintOf(page, '.option-card img')).filter, 'none')
        const footer = await paintOf(page, 'footer')
        assert.equal(footer.background, 'rgb(142, 187, 83)', `${slug} ${width} footer`)
        assert.equal(footer.color, 'rgb(16, 20, 23)')
        await page.close()
      }
    }

    const steps = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await openDealer(steps, 'uhr', null, '/uhr')
    await steps.getByRole('button', { name: /Start Building/i }).click()
    for (const label of ['Door', 'Finish', 'Glass', 'Hardware']) {
      await reachStep(steps, label)
      assert.equal((await paintOf(steps, '.builder-panel')).background, 'rgb(245, 247, 247)', label)
      assert.equal((await paintOf(steps, 'aside')).background, 'rgb(233, 240, 241)', label)
      const image = steps.locator('.option-card img, .finish-tile-image, .glass-option-thumbnail, .hardware-option-card img').first()
      if (await image.count()) assert.equal((await image.evaluate((element) => getComputedStyle(element).filter)), 'none', label)
    }
    await steps.close()

    const themed = {
      headerBackground: '#112233',
      headerText: '#ffffff',
      bodyBackground: '#f4e1c1',
      bodyText: '#000000',
      footerBackground: '#203040',
      footerText: '#ffffff',
    }
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } })
      await openDealer(page, 'diligent-exterior-remodeling', themed, '/diligent-exterior-remodeling')
      await page.locator('header img').first().waitFor()
      const plain = await browser.newPage({ viewport: { width, height: 900 } })
      await openDealer(plain, 'diligent-exterior-remodeling', null, '/diligent-exterior-remodeling')
      await plain.locator('header img').first().waitFor()
      const themedLogo = await page.locator('header img').first().screenshot()
      const plainLogo = await plain.locator('header img').first().screenshot()
      assert.ok(await pixelDelta(themedLogo, plainLogo) < 0.01, 'logo pixels changed')
      await plain.close()
      const themedHeader = await paintOf(page, 'header')
      assert.equal(themedHeader.background, 'rgb(17, 34, 51)')
      assert.equal(themedHeader.color, 'rgb(255, 255, 255)')
      assert.equal((await paintOf(page, 'header .home-return, header .dealer-website-link')).color, 'rgb(255, 255, 255)')
      assert.equal((await paintOf(page, 'header svg')).color, 'rgb(255, 255, 255)')
      await page.getByRole('button', { name: /Start Building/i }).click()
      assert.equal((await paintOf(page, '.builder-panel')).background, 'rgb(244, 225, 193)')
      assert.equal((await paintOf(page, '.section-heading h1')).color, 'rgb(0, 0, 0)')
      assert.equal((await paintOf(page, '.option-card strong')).color, 'rgb(5, 4, 11)')
      if (width >= 1024) assert.equal((await paintOf(page, 'aside')).background, 'rgb(244, 225, 193)')
      else assert.equal((await paintOf(page, '.mobile-live-preview')).background, 'rgb(244, 225, 193)')
      assert.equal((await paintOf(page, '.stepper')).background, 'rgb(244, 225, 193)')
      assert.equal((await paintOf(page, 'footer')).background, 'rgb(32, 48, 64)')
      assert.equal((await paintOf(page, 'footer')).color, 'rgb(255, 255, 255)')
      assert.equal((await paintOf(page, '.site-footer-feedback small')).color, 'rgb(255, 255, 255)')
      assert.equal((await paintOf(page, '.site-footer-feedback a')).color, 'rgb(255, 255, 255)')
      assert.equal((await paintOf(page, '.site-footer-contact svg')).color, 'rgb(255, 255, 255)')
      await page.goto(`http://127.0.0.1:${port}/findmydoor?dealer=diligent-exterior-remodeling`, { waitUntil: 'networkidle' })
      assert.equal((await paintOf(page, 'header.find-my-door-header')).background, 'rgb(17, 34, 51)')
      assert.equal((await paintOf(page, 'header.find-my-door-header')).color, 'rgb(255, 255, 255)')
      assert.equal((await paintOf(page, '.find-my-door-main')).background, 'rgb(244, 225, 193)')
      assert.equal((await paintOf(page, '.find-my-door-main h1')).color, 'rgb(0, 0, 0)')
      await page.close()
    }

    const headerOnly = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await openDealer(headerOnly, 'uhr', { headerBackground: '#ff0000' }, '/uhr')
    await headerOnly.getByRole('button', { name: /Start Building/i }).click()
    assert.equal((await paintOf(headerOnly, 'header')).background, 'rgb(255, 0, 0)')
    assert.equal((await paintOf(headerOnly, '.builder-panel')).background, 'rgb(245, 247, 247)')
    assert.equal((await paintOf(headerOnly, 'aside')).background, 'rgb(233, 240, 241)')
    assert.equal((await paintOf(headerOnly, 'footer')).background, 'rgb(142, 187, 83)')
    await headerOnly.close()

    const mainOnly = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await openDealer(mainOnly, 'uhr', { bodyBackground: '#00aa00' }, '/uhr')
    await mainOnly.getByRole('button', { name: /Start Building/i }).click()
    assert.equal((await paintOf(mainOnly, 'header')).background, 'rgb(142, 187, 83)')
    assert.equal((await paintOf(mainOnly, '.builder-panel')).background, 'rgb(0, 170, 0)')
    assert.equal((await paintOf(mainOnly, 'aside')).background, 'rgb(0, 170, 0)')
    assert.equal((await paintOf(mainOnly, 'footer')).background, 'rgb(142, 187, 83)')
    await mainOnly.close()

    const footerOnly = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await openDealer(footerOnly, 'uhr', { footerBackground: '#0000ff' }, '/uhr')
    assert.equal((await paintOf(footerOnly, 'footer')).background, 'rgb(0, 0, 255)')
    assert.equal((await paintOf(footerOnly, 'header')).background, 'rgb(142, 187, 83)')
    await footerOnly.close()

    const brands = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await openDealer(brands, 'uhr', { headerBackground: 'primary', bodyBackground: 'secondary', headerText: '#000000', footerText: '#ffffff' }, '/uhr')
    await brands.getByRole('button', { name: /Start Building/i }).click()
    assert.equal((await paintOf(brands, 'header')).background, 'rgb(35, 81, 118)')
    assert.equal((await paintOf(brands, 'header')).color, 'rgb(0, 0, 0)')
    assert.equal((await paintOf(brands, '.builder-panel')).background, 'rgb(142, 187, 83)')
    assert.equal((await paintOf(brands, 'aside')).background, 'rgb(142, 187, 83)')
    assert.equal((await paintOf(brands, 'footer')).color, 'rgb(255, 255, 255)')
    await brands.close()

    const legacy = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await openDealer(legacy, 'uhr', {
      headerText: '#ffffff',
      headerIcon: '#123456',
      bodyBackground: '#abcdef',
      previewBackground: '#654321',
      cardBackground: '#fff4d6',
      cardTitle: '#7a1f1f',
      footerText: '#00ff00',
      footerLink: '#0000ff',
    }, '/uhr')
    await legacy.getByRole('button', { name: /Start Building/i }).click()
    assert.equal((await paintOf(legacy, 'header')).color, 'rgb(255, 255, 255)')
    assert.equal((await paintOf(legacy, 'header svg')).color, 'rgb(18, 52, 86)')
    assert.notEqual((await paintOf(legacy, 'header .dealer-website-link')).color, 'rgb(255, 255, 255)')
    assert.equal((await paintOf(legacy, '.builder-panel')).background, 'rgb(171, 205, 239)')
    assert.equal((await paintOf(legacy, 'aside')).background, 'rgb(101, 67, 33)')
    assert.equal((await paintOf(legacy, '.option-card')).background, 'rgb(255, 244, 214)')
    assert.equal((await paintOf(legacy, '.option-card strong')).color, 'rgb(122, 31, 31)')
    assert.equal((await paintOf(legacy, 'footer')).color, 'rgb(0, 255, 0)')
    assert.equal((await paintOf(legacy, 'footer a')).color, 'rgb(0, 0, 255)')
    await legacy.close()

    console.info('Verified simplified Door Builder appearance, legacy colors, and the unchanged default look.')
  } finally {
    await browser.close()
    if (server.pid) {
      try { process.kill(-server.pid, 'SIGTERM') } catch { server.kill('SIGTERM') }
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
