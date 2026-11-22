import assert from 'node:assert/strict'
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import sharp from 'sharp'
import playwright, { type Page } from 'playwright-core'
import { APPEARANCE_FIELDS } from '../src/utils/doorBuilderAppearance'

const repo = new URL('..', import.meta.url).pathname
const headPort = 4191
const baseCss = execFileSync('git', ['show', '5a12b3b:src/styles/dealerAppearance.css'], { cwd: repo, encoding: 'utf8' })
const svg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80" fill="#235176"/><text x="20" y="50" fill="#fff" font-size="28" font-family="Arial">LOGO</text></svg>')}`
const wide = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><rect width="240" height="80" fill="#8ebb53"/><text x="12" y="50" fill="#102418" font-size="22" font-family="Arial">PARTNER</text></svg>')}`

function legacyAppearance() {
  const config: Record<string, string> = {}
  APPEARANCE_FIELDS.forEach((field, index) => {
    const red = (index * 37 + 28) % 256
    const green = (index * 19 + 64) % 256
    const blue = (index * 53 + 96) % 256
    config[field.key] = `#${[red, green, blue].map((part) => part.toString(16).padStart(2, '0')).join('')}`
  })
  return config
}

function dealer(slug: string, appearance: Record<string, string> | null) {
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

async function pixelDelta(left: Buffer, right: Buffer) {
  const a = await sharp(left).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const b = await sharp(right).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) return 1
  let changed = 0
  for (let index = 0; index < a.data.length; index += 4) {
    if (Math.abs(a.data[index] - b.data[index]) > 2 || Math.abs(a.data[index + 1] - b.data[index + 1]) > 2 || Math.abs(a.data[index + 2] - b.data[index + 2]) > 2) changed += 1
  }
  return changed / (a.data.length / 4)
}

function startServer(cwd: string, port: number) {
  const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  return server
}

async function waitFor(port: number, server: ChildProcess) {
  let log = ''
  server.stdout?.on('data', (chunk) => { log += chunk })
  server.stderr?.on('data', (chunk) => { log += chunk })
  const deadline = Date.now() + 40000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return
    } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(log || `Server on ${port} did not start`)
}

async function open(page: Page, port: number, slug: string, appearance: Record<string, string> | null, path: string) {
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.includes('dealer-context')) return route.fulfill({ json: { dealer: dealer(url.searchParams.get('slug') || slug, appearance) } })
    return route.fulfill({ status: 204, body: '' })
  })
  await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none !important;transition:none !important}' })
}

async function reachStep(page: Page, label: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const active = (await page.locator('.stepper button.active em').innerText()).trim()
    if (active === label) return
    const next = page.locator('.builder-actions .next')
    if (await next.isDisabled()) {
      await page.locator('.builder-options-scroll .option-card').first().click()
      await page.waitForTimeout(120)
    }
    if (await next.isDisabled()) throw new Error(`Stuck before ${label}`)
    await next.click()
    await page.waitForTimeout(160)
  }
  throw new Error(`Did not reach ${label}`)
}

function parseRgb(value: string) {
  const match = value.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/)
  if (!match) return null
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) }
}

function contrast(first: string, second: string) {
  const left = parseRgb(first)
  const right = parseRgb(second)
  if (!left || !right) return 21
  const channel = (value: number) => {
    const srgb = value / 255
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  const luminance = (color: { r: number; g: number; b: number }) => 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
  const lighter = Math.max(luminance(left), luminance(right))
  const darker = Math.min(luminance(left), luminance(right))
  return (lighter + 0.05) / (darker + 0.05)
}

async function useAppearanceCss(page: Page, css: string) {
  const swapped = await page.evaluate((next) => {
    const style = [...document.querySelectorAll('style')].find((element) => element.textContent?.includes('--db-header-background, var(--dealer-secondary)'))
    if (!style) return false
    style.textContent = next
    return true
  }, css)
  if (!swapped) throw new Error('Appearance stylesheet was not found')
}

async function main() {
  const head = startServer(repo, headPort)
  const browser = await playwright.chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] })
  try {
    await waitFor(headPort, head)
    const legacy = legacyAppearance()
    const failures: string[] = []
    for (const width of [390, 1440]) {
      const shots = new Map<string, Buffer>()
      for (const label of ['base', 'head'] as const) {
        const page = await browser.newPage({ viewport: { width, height: 900 } })
        await open(page, headPort, 'uhr', legacy, '/uhr')
        if (label === 'base') await useAppearanceCss(page, baseCss)
        await page.locator('header img').first().waitFor()
        const take = async (name: string, selector: string) => {
          if (await page.locator(selector).count() === 0) return
          shots.set(`${label}:${name}`, await page.locator(selector).first().screenshot())
        }
        await take('home-header', 'header')
        await take('home-hero', '.home-hero-copy')
        await take('home-footer', 'footer')
        await page.getByRole('button', { name: /Start Building/i }).click()
        for (const step of ['Door', 'Finish', 'Glass', 'Hardware']) {
          await reachStep(page, step)
          await take(`${step}-panel`, '.builder-panel')
          await take(`${step}-toolbar`, '.builder-toolbar')
          if (width >= 1024) await take(`${step}-aside`, 'aside')
          else await take(`${step}-mobile-preview`, '.mobile-live-preview')
        }
        await take('builder-footer', 'footer')
        await page.goto(`http://127.0.0.1:${headPort}/findmydoor?dealer=uhr`, { waitUntil: 'networkidle' })
        await page.addStyleTag({ content: '*,*::before,*::after{animation:none !important;transition:none !important}' })
        if (label === 'base') await useAppearanceCss(page, baseCss)
        await page.locator('header.find-my-door-header').waitFor()
        await take('finder-header', 'header.find-my-door-header')
        await take('finder-copy', '.find-door-open')
        await take('finder-footer', 'footer')
        await page.close()
      }
      for (const name of [...shots.keys()].filter((key) => key.startsWith('base:')).map((key) => key.slice(5))) {
        const delta = await pixelDelta(shots.get(`base:${name}`)!, shots.get(`head:${name}`)!)
        if (delta > 0.004) failures.push(`${width} ${name} ${(delta * 100).toFixed(2)}%`)
      }
    }
    assert.deepEqual(failures, [], failures.join('; '))

    const weak: string[] = []
    for (const setting of [
      { bodyBackground: '#112233', bodyText: '#ffffff' },
      { bodyBackground: '#f7f3ea', bodyText: '#000000' },
    ]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await open(page, headPort, 'uhr', setting, '/uhr')
      await page.locator('.home-hero-copy h1').waitFor()
      const read = async (scope: string) => page.locator(scope).evaluateAll(eval(`(roots) => {
        const found = []
        for (const root of roots) {
          const nodes = [root, ...root.querySelectorAll('h1,h2,h3,p,span,em,strong,label,button,small,a,b,li')]
          for (const node of nodes) {
            if (!(node instanceof HTMLElement)) continue
            const style = getComputedStyle(node)
            const rect = node.getBoundingClientRect()
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 || rect.width <= 1 || rect.height <= 1) continue
            let own = false
            for (const child of node.childNodes) if (child.nodeType === Node.TEXT_NODE && (child.textContent || '').trim()) own = true
            if (!own || node.closest('header, footer')) continue
            let background = 'rgb(255, 255, 255)'
            let current = node
            while (current) {
              const bg = getComputedStyle(current).backgroundColor
              const parsed = bg.match(/rgba?\\((\\d+), (\\d+), (\\d+)(?:, ([\\d.]+))?\\)/)
              const alpha = parsed && parsed[4] !== undefined ? Number(parsed[4]) : 1
              if (parsed && alpha > 0.05) { background = bg; break }
              current = current.parentElement
            }
            found.push({ text: (node.innerText || '').trim().slice(0, 80), color: style.color, background })
          }
        }
        return found
      }`) as (roots: Element[]) => Array<{ text: string; color: string; background: string }>)
      const check = async (place: string, scope: string) => {
        for (const item of await read(scope)) {
          const ratio = contrast(item.color, item.background)
          if (ratio < 4.5) weak.push(`${setting.bodyText} on ${setting.bodyBackground} ${place} “${item.text}” ${item.color} on ${item.background} ${ratio.toFixed(2)}`)
        }
      }
      await check('homepage', '.home-hero-copy, .home-preview-caption')
      await page.getByRole('button', { name: /Start Building/i }).click()
      for (const label of ['Door', 'Finish', 'Glass', 'Hardware']) {
        await reachStep(page, label)
        await check(label, '.builder-panel .section-heading, .step-label-row, .builder-toolbar, .preview-toolbar, .mini-summary')
      }
      await page.goto(`http://127.0.0.1:${headPort}/findmydoor?dealer=uhr`, { waitUntil: 'networkidle' })
      await page.locator('.find-my-door-main h1').waitFor()
      await check('find-my-door', '.find-my-door-main, .find-door-steps')
      await page.close()
    }
    assert.deepEqual(weak, [], weak.join('\n'))
    console.info('Verified legacy appearance matches the base visualizer and main text stays readable.')
  } finally {
    await browser.close()
    if (head.pid) {
      try { process.kill(-head.pid, 'SIGTERM') } catch { head.kill('SIGTERM') }
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
