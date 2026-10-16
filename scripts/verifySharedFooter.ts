import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium, type Page } from 'playwright-core'
import sharp from 'sharp'
import { doorStyles, hardwareOptions } from '../src/data/options'
import { assertBuilderFontFamilies } from './builderTypographyAssertions'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5196','--strictPort'], { stdio:'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const draft = { version:1, configuration:{ selectedDoorConfigurationType:'single',styleId:doorStyles.find(s=>s.code==='F')!.id,doorLineId:'20-gauge-smooth-steel',sidelites:'none',selectedFinishType:'paint',selectedPaint:'paint-black',jambType:'timber',jambFinishType:'paint',jambFinishColor:'paint-black',hardwareId:hardwareOptions[0].id,doorSwingId:'LHI' } }
const output='/tmp/hgi-shared-footer'
async function verifyFooter(page: Page, label: string) {
  await assertBuilderFontFamilies(page)
  assert.equal(await page.locator('footer').count(),1)
  assert.equal(await page.getByRole('button',{name:'Feedback',exact:true}).count(),1)
  assert.equal(await page.locator('.builder-feedback-trigger,.beta-feedback-page-trigger,.beta-feedback-context-trigger').count(),0)
  const footer=page.locator('.shared-site-footer')
  await footer.scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  assert.equal(await footer.evaluate(el=>getComputedStyle(el).position),'relative')
  for(const span of await footer.locator('.site-footer-contact a span').all()) assert.equal(await span.isVisible(),true)
  assert.equal(await footer.locator('.site-footer-logo img').getAttribute('src'),'/assets/branding/hgi-logo-white.png')
  const credit=footer.locator('.site-footer-feedback small')
  await credit.getByRole('link',{name:'School Radius',exact:true}).waitFor()
  assert.equal(await credit.getByRole('link',{name:'School Radius',exact:true}).getAttribute('href'),'https://schoolradius.co/')
  const feedbackBox=await page.getByRole('button',{name:'Feedback',exact:true}).boundingBox()
  const creditBox=await credit.boundingBox()
  assert.ok(feedbackBox&&creditBox&&creditBox.y>=feedbackBox.y+feedbackBox.height,`${label}: School Radius credit sits beneath Feedback`)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  const geometry=await page.evaluate(()=>{
    const footer=document.querySelector('.shared-site-footer')!.getBoundingClientRect()
    const actions=document.querySelector('.builder-actions')?.getBoundingClientRect()
    return {footerTop:footer.top,actionsBottom:actions?.bottom??null,footerBottom:footer.bottom}
  })
  if(geometry.actionsBottom!==null)assert.ok(geometry.actionsBottom<=geometry.footerTop+2,`${label}: navigation overlaps footer`)
  assert.ok(geometry.footerBottom>=await page.evaluate(()=>innerHeight)-2,`${label}: footer leaves space below viewport`)
  await footer.screenshot({path:`${output}/${label}-footer.png`})
  const before=await page.evaluate(()=>localStorage.getItem('hgi-door-builder-draft'))
  const button=page.getByRole('button',{name:'Feedback',exact:true})
  await button.click()
  await page.getByRole('dialog',{name:'Help us improve'}).waitFor()
  await assertBuilderFontFamilies(page)
  await page.getByRole('dialog',{name:'Help us improve'}).screenshot({path:`${output}/${label}-feedback.png`})
  await page.keyboard.press('Escape')
  await page.getByRole('dialog',{name:'Help us improve'}).waitFor({state:'hidden'})
  await page.waitForFunction(()=>document.activeElement?.matches('.site-feedback-trigger'))
  assert.equal(await page.evaluate(()=>localStorage.getItem('hgi-door-builder-draft')),before)
  console.log(`PASS ${label}: one responsive footer, links, feedback/context, no overflow/navigation overlap`)
}
try {
  await new Promise<void>((resolve,reject)=>{
    server.stdout.on('data',chunk=>{if(String(chunk).includes('127.0.0.1:5196'))resolve()})
    server.once('error',reject);server.once('exit',code=>reject(new Error(`Vite exited ${code}`)))
    setTimeout(()=>reject(new Error('Vite startup timeout')),10000).unref()
  })
  await mkdir(output,{recursive:true})
  browser=await chromium.launch({channel:'chrome',headless:true})
  const photo=await sharp({create:{width:800,height:600,channels:3,background:'#999999'}}).jpeg().toBuffer()
  for(const [width,height] of [[1440,1000],[820,1180],[1180,820],[390,844]]){
    const page=await browser.newPage({viewport:{width,height}})
    await page.route('**/api/detect-entrance-structure',route=>route.fulfill({json:{detection:{doorStructure:'single',sidelites:'none',transom:false,widthClass:'standard',approximateWidthRatio:.35,structurallyWide:false,confidence:.96,summary:'Single door.'},request_id:'local-footer-test'}}))
    await page.route('**/api/generate-door-visualization',route=>route.fulfill({json:{image:`data:image/jpeg;base64,${photo.toString('base64')}`}}))
    await page.addInitScript(value=>{
      if(!localStorage.getItem('hgi-door-builder-draft'))localStorage.setItem('hgi-door-builder-draft',JSON.stringify(value))
      ;(window as unknown as {__name:(fn:unknown)=>unknown}).__name=fn=>fn
    },draft)
    await page.goto('http://127.0.0.1:5196/')
    await verifyFooter(page,`${width}-home`)
    await page.getByRole('button',{name:'Start Building',exact:true}).click()
    const guidance=page.getByRole('button',{name:'Start Configuring',exact:true})
    if(await guidance.isVisible())await guidance.click()
    await page.locator('.builder-panel').waitFor()
    await page.evaluate(()=>window.scrollTo(0,0))
    await page.screenshot({path:`${output}/${width}-configuration.png`})
    await verifyFooter(page,`${width}-configuration`)
    // Walk the unchanged sub-step flow with the same complete draft fixture
    // used by the existing edit-navigation suite.
    for(let i=0;i<30&&await page.getByRole('button',{name:'Next configuration step'}).count();i++){
      await page.evaluate(()=>window.scrollTo(0,0))
      await page.waitForTimeout(120)
      if(await guidance.isVisible())await guidance.click()
      await assertBuilderFontFamilies(page)
      await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
      const cardLayout=await page.evaluate(()=>{
        const grids=[...document.querySelectorAll('[data-equal-product-grid]')].filter(el=>el.checkVisibility())
        return grids.map(grid=>{
          const cards=[...grid.children].filter(el=>el.matches('.option-card,.glass-choice-card,.hardware-option-card'))
          const heights=cards.map(el=>el.getBoundingClientRect().height)
          const clipped=[...grid.querySelectorAll('.option-copy>strong,.option-copy>span,.door-details-trigger')].filter(el=>el.checkVisibility()&&(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2)).map(el=>el.textContent)
          return {equal:!heights.length||Math.max(...heights)-Math.min(...heights)<2,clipped}
        })
      })
      assert.ok(cardLayout.every(grid=>grid.equal),`Unequal card heights: ${JSON.stringify(cardLayout)}`)
      assert.ok(cardLayout.every(grid=>!grid.clipped.length),`Clipped card labels: ${JSON.stringify(cardLayout)}`)
      const details=page.locator('.door-details-trigger').first()
      if(await details.isVisible()){
        await details.click()
        await page.getByRole('button',{name:'Close door details',exact:true}).waitFor()
        await assertBuilderFontFamilies(page)
        await page.locator('.door-details-dialog[open]').screenshot({path:`${output}/${width}-door-details.png`})
        await page.keyboard.press('Escape')
      }
      const title=await page.locator('.step-heading h1').innerText()
      if(/color|finish|glass|hardware/i.test(title))await page.screenshot({path:`${output}/${width}-step-${i}.png`})
      const next=page.getByRole('button',{name:'Next configuration step'})
      assert.equal(await next.isEnabled(),true,`Incomplete step: ${await page.locator('.step-heading h1').innerText()}`)
      await next.click()
    }
    await page.getByRole('heading',{name:'Configuration Summary',exact:true}).waitFor()
    await verifyFooter(page,`${width}-summary`)
    await page.getByRole('switch',{name:'Test current review experience'}).click()
    await page.locator('.visualizer-promo-card:visible').getByRole('button',{name:'Launch Visualizer'}).first().click()
    await page.locator('.customer-form-page').waitFor()
    await verifyFooter(page,`${width}-form`)
    await page.getByRole('button',{name:'Back to Review'}).click()
    // Existing Test mode opens the visualizer without sending a lead.
    await page.getByRole('switch',{name:'Test current review experience'}).click()
    await page.locator('.visualizer-promo-card:visible').getByRole('button',{name:'Launch Visualizer'}).first().click()
    await page.locator('.visualizer-page').waitFor()
    await verifyFooter(page,`${width}-visualizer`)
    await page.locator('.visualizer-page input[type=file]').first().setInputFiles({name:'local-test-house.jpg',mimeType:'image/jpeg',buffer:photo})
    await page.locator('.visualizer-final-result').waitFor()
    await verifyFooter(page,`${width}-visualizer-result`)
    await page.locator('.configuration-edit-actions-visualizer').getByRole('button',{name:'Edit Color',exact:true}).click()
    await page.locator('.editing-bar').waitFor()
    await verifyFooter(page,`${width}-visualizer-editing`)
    await page.getByRole('button',{name:'Done editing',exact:true}).click()
    await page.locator('.visualizer-final-result').waitFor()
    await page.close()
    const unavailable=await browser.newPage({viewport:{width,height}})
    await unavailable.goto('http://127.0.0.1:5196/invalid/path')
    await unavailable.getByRole('heading',{name:'This dealer link is unavailable.'}).waitFor()
    await verifyFooter(unavailable,`${width}-unavailable`)
    await unavailable.close()
  }
  console.log(`Shared footer checks passed; screenshots: ${output}. No lead or feedback submission sent.`)
}finally{await browser?.close();server.kill()}
