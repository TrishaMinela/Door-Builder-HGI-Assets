import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles, hardwareOptions } from '../src/data/options'
import { hardwarePreviewAssetUrl } from '../src/data/hardware'

const baseline = process.argv.includes('--baseline')
const baselinePath = '/private/tmp/hgi-mobile-builder-desktop.json'
const desktopImage = '/private/tmp/hgi-mobile-builder-desktop.png'
const draft = { version: 1, configuration: { selectedDoorConfigurationType: 'single', styleId: doorStyles.find(item => item.code === 'F1')!.id, doorLineId: '20-gauge-smooth-steel', sidelites: 'none', selectedFinishType: 'paint', selectedPaint: 'paint-black', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'paint-black', hardwareId: hardwareOptions[0].id, doorSwingId: 'LHI' } }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5197', '--strictPort'], { stdio: 'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve, reject) => { server.stdout.on('data', chunk => { if (String(chunk).includes('127.0.0.1:5197')) resolve() }); server.once('error', reject); setTimeout(() => reject(new Error('Vite startup timeout')), 10000).unref() })
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const requestedWidth=process.argv.find(argument=>argument.startsWith('--width='))?.split('=')[1]
  for (const width of requestedWidth ? [Number(requestedWidth)] : baseline ? [1280,390] : [320,375,390,430,768,1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    page.setDefaultTimeout(10000)
    await page.addInitScript(value => { localStorage.setItem('hgi-door-builder-draft', JSON.stringify(value)); (window as unknown as { __name: (fn: unknown) => unknown }).__name = fn => fn }, draft)
    await page.goto('http://127.0.0.1:5197/')
    await page.getByRole('button', { name: 'Start Building', exact: true }).click()
    const next = page.getByRole('button', { name: 'Next configuration step' })
    await next.waitFor()
    for (let step=0; step<20; step++) {
      const heading = await page.locator('.step-heading h1').innerText()
      if(requestedWidth)console.log(`${width}px: ${heading}`)
      if (!baseline && width<=900) {
        await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight))
        const nav=await page.locator('.builder-actions').evaluate(el=>{ const r=el.getBoundingClientRect(); const f=document.querySelector('.site-footer')!.getBoundingClientRect(); return {position:getComputedStyle(el).position,top:r.top,bottom:r.bottom,footerTop:f.top,footerBottom:f.bottom,height:innerHeight} })
        assert.equal(nav.position,'fixed',heading)
        assert.ok(nav.top>=0 && nav.bottom<=nav.footerTop+1,`${width}px ${heading}: navigation above footer`)
        assert.ok(nav.footerBottom<=nav.height+1)
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
      }
      if (/Hardware/.test(heading)) break
      if (await page.getByRole('button', { name: 'Start Configuring', exact: true }).isVisible()) await page.getByRole('button', { name: 'Start Configuring', exact: true }).click()
      await next.click()
      await page.waitForTimeout(100)
    }
    await page.locator('.hardware-option-card').first().waitFor()
    await page.evaluate(async()=>{await document.fonts.ready; await Promise.all([...document.images].filter(i=>i.classList.contains('hardware-card-image')).map(i=>{i.loading='eager';return i.decode().catch(()=>{})}))})
    const metrics=await page.locator('.hardware-option-card').evaluateAll(cards=>cards.map(el=>{const r=el.getBoundingClientRect(),main=el.querySelector('.hardware-card-main')!,image=el.querySelector('img')!,swatch=el.querySelector('.hardware-finish-color')!,s=getComputedStyle(swatch); return {width:r.width,height:r.height,mainDisplay:getComputedStyle(main).display,imageFit:getComputedStyle(image).objectFit,swatchDisplay:s.display,swatchWidth:swatch.getBoundingClientRect().width} }))
    if(baseline) {
      console.log(`${width}px baseline:`,JSON.stringify(metrics))
      if(width===1280) { await writeFile(baselinePath,JSON.stringify(metrics)); await page.screenshot({path:desktopImage}) }
    } else if(width===1280) {
      const savedBaseline=process.argv.includes('--compare-baseline') ? await readFile(baselinePath,'utf8').catch(()=>null) : null
      if(savedBaseline) {
        assert.deepEqual(metrics,JSON.parse(savedBaseline),'Desktop card geometry and swatches remain identical')
        assert.deepEqual(await page.screenshot(),await readFile(desktopImage),'Desktop screenshot remains pixel-identical')
      }
      assert.ok(metrics.every(m=>m.mainDisplay==='flex' && m.imageFit==='contain' && m.swatchDisplay==='block'))
      assert.notEqual(await page.locator('.builder-actions').evaluate(el=>getComputedStyle(el).position),'fixed')
    } else {
      assert.ok(metrics.every(m=>m.height<400 && m.imageFit==='contain' && m.swatchDisplay==='block' && m.swatchWidth>=28),'Compact cards, uncropped image sizing and visible swatches')
      const finishes=page.locator('.hardware-option-card').filter({has:page.locator('.hardware-finish-options button:nth-child(2)')}).first()
      const selected=finishes.locator('.hardware-finish-options button').nth(1)
      await selected.click()
      assert.equal(await selected.getAttribute('aria-pressed'),'true')
      const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.hardwareId)
      assert.notEqual(id,draft.configuration.hardwareId)
      assert.ok(await page.locator('.mobile-live-preview img').count(),'Door preview remains available')
      const chosen=hardwareOptions.find(option=>option.id===id)!
      const expected=hardwarePreviewAssetUrl(chosen,'Exterior',{id:'LHI',name:'Left hand inswing',image:''})
      await page.waitForFunction(path=>[...document.querySelectorAll('.mobile-live-preview .hardware img')].some(image=>image.getAttribute('src')===path),expected)
      for(const view of ['Interior','Both','Exterior']) await page.locator('.mobile-preview-view-toggle').getByRole('button',{name:view,exact:true}).click()
      assert.equal(await page.locator('.mobile-live-preview').evaluate(el=>getComputedStyle(el).position),'relative','Preview is not sticky')
      const touch=await selected.boundingBox(); assert.ok(touch && touch.width>=44 && touch.height>=44)
      await page.getByRole('button',{name:'Previous configuration step'}).click(); await next.click()
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.hardwareId),id)
      const last=page.locator('.hardware-option-card').last(); await last.scrollIntoViewIfNeeded()
      await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight))
      assert.ok((await last.boundingBox())!.y+(await last.boundingBox())!.height <= (await page.locator('.builder-actions').boundingBox())!.y+1,'Last hardware card clears navigation')
      await page.screenshot({path:`/private/tmp/hgi-mobile-builder-${width}.png`,fullPage:true})
    }
    console.log(`${width}px ${baseline?'baseline captured':'responsive checks passed'}`)
    await page.close()
  }
} finally { await browser?.close(); server.kill('SIGTERM') }
