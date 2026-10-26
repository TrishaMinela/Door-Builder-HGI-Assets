import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'
import { doorStyles, hardwareOptions } from '../src/data/options'

// Test-only marks in served source. No telemetry, source mutation, or external submissions.
const output = process.env.HGI_SUBMISSION_QA_OUTPUT ?? '/tmp/hgi-submission-experience'
await mkdir(output, { recursive: true })
const server = await createServer({ configFile: false, cacheDir: `${output}/vite-cache`, optimizeDeps: { include: ['react/jsx-dev-runtime'] }, server: { host: '127.0.0.1', port: 5348, strictPort: true }, plugins: [{
  name: 'submission-local-timing', enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('/src/App.tsx')) return
    return code
      .replace('const submit = async () => {', "const submit = async () => { performance.mark('qa-validation-start');")
      .replace('await submitQuote({', "performance.mark('qa-post-start'); await submitQuote({")
      .replace('const completedAction = pendingCustomerAction', "performance.mark('qa-post-end'); const completedAction = pendingCustomerAction")
      .replace('const downloadPdf = async () => {', "const downloadPdf = async () => { performance.mark('qa-pdf-start');")
      .replace("setPdfError(error instanceof Error ? error.message : 'The configuration PDF could not be downloaded. Please retry.')", "performance.mark('qa-pdf-error'); setPdfError(error instanceof Error ? error.message : 'The configuration PDF could not be downloaded. Please retry.')")
      .replace("const renderConfiguredPdfProduct = async () => {", "const renderConfiguredPdfProduct = async () => { performance.mark('qa-preview-start');")
      .replace('return dataUrl\n', "performance.mark('qa-preview-end'); return dataUrl\n")
  },
}] })
await server.listen()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const draft = { version: 1, configuration: { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'F')!.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'none', selectedFinishType: 'paint', selectedPaint: 'paint-black', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-black', hardwareId: hardwareOptions[0].id, doorSwingId: 'LHI' } }
try {
  for (const width of [1440, 820, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, acceptDownloads: true })
    page.setDefaultTimeout(30000)
    await page.addInitScript('window.__name = (fn) => fn')
    await page.addInitScript(value => {
      localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value))
      Object.assign(window, { __name: (fn: unknown) => fn })
      document.addEventListener('click', event => {
        if ((event.target as Element)?.closest('a[download]')) performance.mark('qa-download')
      }, true)
      new MutationObserver(() => {
        if (document.querySelector('.success h1')?.textContent?.startsWith('Thanks,') && !performance.getEntriesByName('qa-success').length) performance.mark('qa-success')
      }).observe(document, { childList: true, subtree: true })
    }, draft)
    let requests = 0
    let outcome: 'success' | 'supabase-failure' | 'zapier-failure' = width === 1440 ? 'supabase-failure' : 'success'
    const ids: string[] = []
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unexpected API blocked by local verification' } }))
    await page.route('**/api/submit-door-builder', async route => {
      requests++
      ids.push(String(route.request().postDataJSON().submissionId))
      await new Promise(resolve => setTimeout(resolve, 500))
      await route.fulfill(outcome === 'success' ? { status: 200, json: { ok: true, destinations: { supabase: 'succeeded', zapier: 'succeeded' } } } : { status: 502, json: { error: 'Submission could not be completed. Please try again.', destinations: { supabase: outcome === 'supabase-failure' ? 'failed' : 'succeeded', zapier: outcome === 'supabase-failure' ? 'skipped' : 'failed' } } })
    })
    let downloads = 0
    page.on('download', () => downloads++)
    await page.goto('http://127.0.0.1:5348/')
    await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
    assert.equal(await page.getByRole('switch', { name: 'Test current review experience' }).count(), 0)
    for (let i = 0; i < 35 && await page.getByRole('button', { name: 'Next configuration step' }).count(); i++) {
      await page.getByRole('button', { name: 'Next configuration step' }).click()
    }
    await page.getByRole('heading', { name: 'Configuration Summary', exact: true }).waitFor()
    await page.getByRole('button', { name: /Download.*PDF/i }).first().click()
    await page.getByRole('heading', { name: 'Complete Your Information', exact: true }).waitFor()
    await page.getByLabel(/Full Name/i).fill('Alex Sample')
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('qa@example.invalid')
    await page.getByLabel(/^Phone/i).fill('5550100000')
    await page.getByLabel(/ZIP/i).fill('46741')
    assert.equal(downloads, 0, 'No PDF before successful submission')
    const submit = page.getByRole('button', { name: 'Submit & Download PDF', exact: true })
    if (width === 1440) {
      for (const failure of ['supabase-failure', 'zapier-failure'] as const) {
        outcome = failure
        await submit.click()
        await page.getByRole('alert').waitFor()
        assert.equal(downloads, 0)
        assert.equal(await page.getByLabel(/Full Name/i).inputValue(), 'Alex Sample')
        assert.equal(await page.locator('.success').count(), 0)
      }
      console.log('KNOWN LEGACY LIMITATION: retry IDs stable:', new Set(ids).size === 1, '; saved-but-Zapier-failed remains a generic error. No delivery behavior changed.')
    }
    outcome = 'success'
    await page.evaluate(() => performance.clearMarks())
    const requestCount = requests
    const downloadPromise = page.waitForEvent('download')
    await submit.click()
    const busy = page.getByRole('button', { name: 'Preparing & Sending...' })
    assert.equal(await busy.isDisabled(), true)
    await busy.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click() })
    assert.equal(await page.locator('.success').count(), 0)
    const download = await downloadPromise
    const path = await download.path()
    assert.ok(path)
    const pdf = await readFile(path)
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
    assert.equal(requests, requestCount + 1, 'Disabled button prevents duplicate clicks')
    await page.getByRole('heading', { name: 'Thanks, Alex Sample.', exact: true }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    const geometry = await page.locator('.success').evaluate(card => {
      const rect = card.getBoundingClientRect()
      return { width: rect.width, height: rect.height, scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth,
        ancestors: [card.parentElement!, card.parentElement!.parentElement!].map(el => { const s = getComputedStyle(el); return { tag: el.className, top: el.getBoundingClientRect().top, height: el.getBoundingClientRect().height, margin: s.margin, padding: s.padding, display: s.display, align: s.alignItems, justify: s.justifyContent } }),
        children: Array.from(card.children).map(child => { const r = child.getBoundingClientRect(); return { tag: child.tagName, text: child.textContent?.slice(0, 40), center: r.x + r.width / 2, top: r.top, bottom: r.bottom } }) }
    })
    assert.ok(geometry.scrollWidth <= geometry.viewport)
    if (await page.locator('.submission-confirmation').count()) {
      assert.ok(parseFloat(geometry.ancestors[1].padding) <= 48, 'Confirmation must not inherit the mobile preview spacer')
      assert.ok(geometry.children[2].top >= 0, 'Thank-you heading is visible immediately, not above a stale form scroll offset')
      const headerBottom = await page.locator('header').first().evaluate(el => el.getBoundingClientRect().bottom)
      assert.ok(geometry.children[0].top >= headerBottom, 'Success icon is not covered by the fixed header')
      for (const child of geometry.children) assert.ok(Math.abs(child.center - geometry.children[0].center) < 2, `${child.tag} centered`)
      const primary = page.getByRole('button', { name: 'Continue to Home Visualizer' })
      const secondary = page.getByRole('button', { name: 'Return to Review', exact: true })
      assert.equal(await primary.evaluate(el => getComputedStyle(el).opacity), '1', 'Primary action is immediately visible')
      const a = await primary.boundingBox(), b = await secondary.boundingBox()
      assert.ok(a && b && b.y >= a.y + a.height)
      assert.ok(a.height >= 44 && b.height >= 44)
    }
    await page.screenshot({ path: `${output}/success-${width}.png`, fullPage: true })
    const timings = await page.evaluate(() => {
      const last = (name: string) => performance.getEntriesByName(name).at(-1)?.startTime ?? 0
      const delta = (a: string, b: string) => Math.round(last(b) - last(a))
      return { validationAndPayloadMs: delta('qa-validation-start', 'qa-post-start'), mockedPostMs: delta('qa-post-start', 'qa-post-end'), pdfPreparationAndDownloadMs: delta('qa-pdf-start', 'qa-download'), transitionAfterDownloadMs: delta('qa-download', 'qa-success'), totalMs: delta('qa-validation-start', 'qa-success'), pdfResources: performance.getEntriesByType('resource').filter(e => /pdf|template|branding/i.test(e.name)).map(e => ({ path: new URL(e.name).pathname, durationMs: Math.round(e.duration) })) }
    })
    console.log(JSON.stringify({ width, browser: browser.version(), timings, geometry, pdfBytes: pdf.length, download: download.suggestedFilename() }))
    if (width === 320) {
      await page.getByRole('button', { name: 'Continue to Home Visualizer' }).click()
      await page.getByText('Upload a photo of your entrance', { exact: true }).waitFor()
    } else {
      await page.getByRole('button', { name: 'Return to Review', exact: true }).click()
      await page.getByRole('heading', { name: 'Configuration Summary', exact: true }).waitFor()
    }
    await page.close()
  }
} finally { await browser.close(); await server.close() }
