import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { chromium } from 'playwright-core'
import { hardwareOptions, hardwarePreviewAssetUrl, supportsInactiveKnobPrep } from '../src/data/hardware'
import { lockSetupOptionsForHardware } from '../src/data/doorConfigurationRules'
import { doorStyles } from '../src/data/options'

const repairedStyles = new Set<string>()
for (const hardware of hardwareOptions) {
  const supported = !['Longview', 'Santa Cruz', 'Seattle'].includes(hardware.style)
  assert.equal(supportsInactiveKnobPrep(hardware), supported)
  assert.equal(lockSetupOptionsForHardware(hardware).some(option => option.code === 'DDLLKP'), supported)
  if (!supported) continue
  for (const view of ['Exterior', 'Interior'] as const) {
    const { data, info } = await sharp(`public${hardwarePreviewAssetUrl(hardware, view).split('?')[0]}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const crop = hardware.crop!.knobOnly, top = info.height * crop.top / 100, bottom = info.height * (1 - crop.bottom / 100)
    const oldTop = info.height * (hardware.type === 'long' ? .52 : .5), oldBottom = info.height * (hardware.type === 'long' ? .73 : .58)
    let lowerPixels = 0
    for (let y = 270; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (!data[(y * info.width + x) * 4 + 3]) continue
      assert.ok(y >= top && y < bottom, `${hardware.style}/${view}: complete lower hardware, including alpha edges, fits prep crop`)
      assert.ok(x > 0 && x < info.width - 1, `${hardware.style}/${view}: artwork fits either mirrored leaf without horizontal clipping`)
      if (y < oldTop || y >= oldBottom) repairedStyles.add(hardware.style)
      lowerPixels++
    }
    assert.ok(lowerPixels > 0)
    for (let y = 270; y <= Math.floor(top); y++) for (let x = 0; x < info.width; x++) assert.equal(data[(y * info.width + x) * 4 + 3], 0, 'Crop boundary stays in the transparent gap below the upper lock')
  }
}
console.log(`Audited ${hardwareOptions.length} hardware products in both views. Repaired crop styles: ${[...repairedStyles].join(', ')}.`)

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5210', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5210')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    await page.addInitScript(styleId => localStorage.setItem('hgi-door-builder-draft', JSON.stringify({ version: 1, configuration: {
      selectedDoorConfigurationType: 'french', styleId, doorLineId: '20-gauge-smooth-steel', sidelites: 'none',
      selectedFinishType: 'paint', selectedPaint: 'paint-white', doorSwingId: 'LHI', hardwareId: 'baldwin-adirondack-dark-bronze-right', doubleDoorLockPrep: 'DDLLKP',
    } })), doorStyles.find(style => style.code === '2PHD')!.id)
    await page.goto('http://127.0.0.1:5210/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    const next = () => page.getByRole('button', { name: 'Next configuration step' }).click()
    const back = () => page.getByRole('button', { name: 'Previous configuration step' }).click()
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    for (let i = 0; i < 20 && await page.locator('.step-heading h1').innerText() !== 'Choose Your Hardware'; i++) {
      assert.notEqual(await page.locator('.step-heading h1').innerText(), 'Lock Setup', 'Hardware must precede Lock Setup')
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      await next()
    }
    const hardwareCard = (style: string) => page.locator('.hardware-option-card').filter({ has: page.locator('strong').filter({ hasText: new RegExp(`^${style}$`) }) }).locator('.hardware-card-main').click()
    for (const style of ['Longview', 'Santa Cruz', 'Seattle']) {
      await hardwareCard(style); await next()
      assert.equal(await page.locator('.step-heading h1').innerText(), 'Lock Setup')
      assert.equal(await page.locator('.double-door-lock-prep-card').count(), 2)
      assert.equal(await page.getByText('Knob Prep Only', { exact: true }).count(), 0)
      assert.equal((await saved()).doubleDoorLockPrep, 'DDLLBO', 'Invalid prep falls back to first valid setup')
      await back(); await hardwareCard('Camelot Trim with Georgian Knob'); await next()
      assert.equal(await page.locator('.double-door-lock-prep-card').count(), 3)
      await page.locator('.double-door-lock-prep-card').filter({ hasText: 'Knob Prep Only' }).click()
      await back()
    }
    await hardwareCard('Century Trim with Latitude Lever'); await next()
    assert.equal((await saved()).doubleDoorLockPrep, 'DDLLKP', 'Supported setup survives hardware change')
    await page.locator('.double-door-lock-prep-card').filter({ hasText: 'Lock on Main Door Only' }).click()
    await back(); await hardwareCard('Longview'); await next()
    assert.equal((await saved()).doubleDoorLockPrep, 'DDLLAC', 'Valid current setup is preserved')
    console.log(`${width}px: hardware-first flow, capability filtering, invalid fallback and valid setup preservation passed.`)
    await page.close()
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto('http://127.0.0.1:5210/scripts/doubleHardwareHarness.html')
  for (let index = 0; index < hardwareOptions.length; index++) {
    const hardware = hardwareOptions[index], mode = supportsInactiveKnobPrep(hardware) ? 'DDLLKP' : 'DDLLAC'
    await page.evaluate(index => (window as unknown as { selectHardwareIndex: (i: number) => void }).selectHardwareIndex(index), index)
    await page.getByRole('button', { name: mode, exact: true }).click()
    for (const [label, id] of [['Left Active', 'LHI'], ['Right Active', 'RHI']]) {
      await page.getByRole('button', { name: label, exact: true }).click()
      for (const view of ['Exterior', 'Interior']) {
        await page.getByRole('button', { name: view, exact: true }).click()
        await page.waitForFunction(key => document.querySelector('.preview-scene')?.getAttribute('data-render-configuration-key') === key && document.querySelector('.preview-scene')?.getAttribute('data-render-semantically-ready') === 'true', `${index ? `${index}:` : ''}${mode}:${id}`)
        const prep = page.locator('.hardware[data-hardware-mode="knob-only"] img')
        if (supportsInactiveKnobPrep(hardware)) assert.match(await prep.evaluate(element => (element as HTMLElement).style.clipPath), /^inset\(50% 0% 0%(?: 0%)?\)$/)
        assert.equal(await page.locator('.hardware').count(), supportsInactiveKnobPrep(hardware) ? 2 : 1)
        if (/Trim with/.test(hardware.style)) await page.locator('.preview-scene').screenshot({ path: `/tmp/french-${hardware.id}-${id}-${view}.png` })
      }
      const result = await page.evaluate(() => (window as unknown as { renderHardwarePdf: () => Promise<{ dataUrl: string }> }).renderHardwarePdf())
      assert.ok(result.dataUrl.startsWith('data:image/png;base64,'))
      if (/Trim with/.test(hardware.style)) await writeFile(`/tmp/french-${hardware.id}-${id}-pdf.png`, Buffer.from(result.dataUrl.split(',')[1], 'base64'))
    }
  }
  console.log('All hardware products rendered on both French active leaves, in Exterior/Interior, with deterministic PDF outputs.')
  await page.close()
} finally { await browser?.close(); server.kill('SIGTERM') }
