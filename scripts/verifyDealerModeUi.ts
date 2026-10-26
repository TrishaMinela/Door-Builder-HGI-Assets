import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import { chromium, type Page } from 'playwright-core'
import { doorStyles, hardwareOptions } from '../src/data/options'

const output = '/tmp/hgi-dealer-mode-ui'
await mkdir(output, { recursive: true })
const server = await createServer({ configFile: false, cacheDir: `${output}/cache`, server: { host: '127.0.0.1', port: 5351, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const draft = { version: 1, configuration: { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'F')!.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'none', selectedFinishType: 'paint', selectedPaint: 'paint-black', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-black', hardwareId: hardwareOptions[0].id, doorSwingId: 'LHI' } }
async function review(page: Page) {
  await page.getByRole('button', { name: 'Start Building Your Door', exact: true }).click()
  for (let i = 0; i < 35 && await page.getByRole('button', { name: 'Next configuration step' }).count(); i++) await page.getByRole('button', { name: 'Next configuration step' }).click()
  await page.getByRole('heading', { name: 'Configuration Summary', exact: true }).waitFor()
}
try {
  for (const width of [1440, 820, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, acceptDownloads: true })
    page.setDefaultTimeout(30000)
    await page.addInitScript(value => { localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value)); localStorage.setItem('dealerMode', 'true'); localStorage.setItem('testMode', 'true') }, draft)
    let expiry = 0, logins = 0, submissions = 0, failLogout = false
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Blocked by test' } }))
    await page.route('**/api/submit-door-builder', route => { submissions++; return route.fulfill({ status: 500, json: { error: 'Unexpected submission' } }) })
    await page.route('**/api/dealer-session', async route => {
      if (route.request().method() === 'POST') {
        logins++
        if (route.request().postDataJSON().password !== 'mock-only') { await route.fulfill({ status: 401, json: { error: 'Incorrect password' } }); return }
        expiry = Date.now() + 24 * 60 * 60 * 1000
      }
      if (route.request().method() === 'DELETE') {
        if (failLogout) { await route.fulfill({ status: 503, json: { error: 'Mock store failure' } }); return }
        expiry = 0
      }
      await route.fulfill({ status: 200, json: { authenticated: expiry > Date.now(), expiresAt: expiry } })
    })
    await page.goto('http://127.0.0.1:5351/?testMode=true&dealerMode=true')
    assert.equal(await page.getByRole('switch', { name: 'Test current review experience' }).count(), 0)
    await review(page)
    await page.getByRole('button', { name: /Download.*PDF/i }).first().click()
    await page.getByRole('heading', { name: 'Complete Your Information', exact: true }).waitFor()
    await page.reload()
    await review(page)
    await page.getByRole('button', { name: 'Launch Door Visualizer', exact: true }).click()
    await page.getByRole('heading', { name: 'Complete Your Information', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Back to Review', exact: true }).click()
    const trigger = page.getByRole('button', { name: 'Dealer Mode', exact: true })
    await trigger.click()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true)
    await trigger.click()
    await page.keyboard.press('Escape')
    await trigger.click()
    await page.getByLabel('Dealer password', { exact: true }).fill('incorrect')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Incorrect password' }).waitFor()
    await page.getByLabel('Dealer password', { exact: true }).fill('mock-only')
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab')
    assert.equal(await page.getByLabel('Dealer password', { exact: true }).evaluate(el => el === document.activeElement), true, 'Native modal traps keyboard focus')
    const bounds = await page.getByRole('dialog').boundingBox()
    assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= 1000)
    await page.screenshot({ path: `${output}/modal-${width}.png` })
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Exit Dealer Mode', exact: true }).waitFor()
    assert.equal(logins, 2)
    const downloadWait = page.waitForEvent('download')
    await page.getByRole('button', { name: /Download.*PDF/i }).first().click()
    const download = await downloadWait
    assert.equal((await readFile((await download.path())!)).subarray(0, 5).toString(), '%PDF-')
    await page.getByRole('button', { name: 'Launch Door Visualizer', exact: true }).click()
    await page.getByText('Upload a photo of your entrance', { exact: true }).waitFor()
    failLogout = true
    await page.getByRole('button', { name: 'Exit Dealer Mode', exact: true }).click()
    await page.getByRole('button', { name: 'Retry sign-out', exact: true }).waitFor()
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    assert.equal(await page.locator('.dealer-mode-access>button').textContent(), 'Dealer Mode', 'Failed logout cannot silently re-enable local bypass')
    failLogout = false
    await page.getByRole('button', { name: 'Retry sign-out', exact: true }).click()
    await trigger.waitFor()
    await page.getByRole('button', { name: 'Launch Door Visualizer', exact: true }).click()
    await page.getByRole('heading', { name: 'Complete Your Information', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Back to Review', exact: true }).click()
    await trigger.click()
    await page.getByLabel('Dealer password', { exact: true }).fill('mock-only')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Exit Dealer Mode', exact: true }).waitFor()
    await page.clock.setFixedTime(new Date(Date.now() + 31 * 60 * 1000))
    await page.reload()
    await page.getByRole('button', { name: 'Exit Dealer Mode', exact: true }).waitFor()
    await review(page)
    await page.clock.setSystemTime(new Date())
    expiry = Date.now() + 600
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await trigger.waitFor()
    // Also verify the action itself checks server expiry, not just the local timer.
    expiry = Date.now() - 1
    await page.getByRole('button', { name: /Download.*PDF/i }).first().click()
    await page.getByRole('heading', { name: 'Complete Your Information', exact: true }).waitFor()
    assert.equal(submissions, 0, 'No dealer journey creates a lead')
    console.log(`PASS ${width}: customer gates/reload, URL/storage ignored, cancel/Escape/focus, wrong/correct password, dealer PDF/Visualizer, logout, authenticated refresh, expired-session gate.`)
    await page.close()
  }
} finally { await browser.close(); await server.close() }
