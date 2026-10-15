import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium, type Page } from 'playwright-core'

const assess = process.env.ASSESS_ONLY === 'true'
const output='/tmp/hgi-configuration-clipping'
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5198','--strictPort'],{stdio:'pipe'})
let browser: Awaited<ReturnType<typeof chromium.launch>>|undefined
async function inspect(page: Page,label:string){
  await page.locator('.door-configuration-card-image').first().evaluate(async(img:HTMLImageElement)=>img.decode())
  await page.evaluate(()=>document.fonts.ready)
  await page.waitForTimeout(150)
  const result=await page.evaluate(()=>{
    const rect=(el:Element)=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}}
    const heading=document.querySelector('.step-heading h1')!,panel=document.querySelector('.builder-panel')!
    const chrome=[...document.querySelectorAll('.app>header,.builder-toolbar,.editing-bar')].map(rect)
    const cards=[...document.querySelectorAll('.door-configuration-card')].map(card=>{
      const visual=card.querySelector('.option-visual')!,wrapper=card.querySelector('.door-configuration-preview')!,image=card.querySelector('img')!;
      return {height:rect(card).height,visual:rect(visual),wrapper:rect(wrapper),image:rect(image),fit:getComputedStyle(image).objectFit,overflow:getComputedStyle(wrapper).overflow,natural:[image.naturalWidth,image.naturalHeight]}
    })
    return {heading:rect(heading),panel:rect(panel),panelScroll:panel.scrollTop,chrome,cards,overflow:document.documentElement.scrollWidth>innerWidth}
  })
  if(assess)console.log(label,JSON.stringify(result))
  else console.log(`PASS ${label}: full thumbnails, equal cards, heading below header, no overflow`)
  await page.screenshot({path:`${output}/${assess?'before':'after'}-${label}.png`})
  if(assess)return
  assert.equal(result.overflow,false)
  assert.ok(result.heading.top>=Math.max(result.panel.top,...result.chrome.map(r=>r.bottom))-1,`${label}: heading behind header or clipped panel`)
  assert.ok(result.heading.bottom<=result.panel.bottom,`${label}: heading clipped at panel bottom`)
  const heights=result.cards.map(card=>card.height)
  assert.ok(Math.max(...heights)-Math.min(...heights)<2,`${label}: card heights differ`)
  for(const card of result.cards){
    assert.equal(card.fit,'contain')
    assert.ok(card.image.top>=card.visual.top-1&&card.image.bottom<=card.visual.bottom+1,`${label}: thumbnail extends outside visual region`)
    assert.ok(card.wrapper.top>=card.visual.top-1&&card.wrapper.bottom<=card.visual.bottom+1,`${label}: nested wrapper extends outside visual region`)
    assert.ok(card.image.left>=card.visual.left-1&&card.image.right<=card.visual.right+1)
    assert.ok(card.natural.every(value=>value>0),'Source image loaded')
  }
}
try{
  await new Promise<void>((resolve,reject)=>{server.stdout.on('data',chunk=>{if(String(chunk).includes('127.0.0.1:5198'))resolve()});server.once('error',reject);server.once('exit',code=>reject(new Error(`Vite exited ${code}`)));setTimeout(()=>reject(new Error('Startup timeout')),10000).unref()})
  await mkdir(output,{recursive:true})
  browser=await chromium.launch({channel:'chrome',headless:true})
  for(const [width,height] of [[1440,1000],[1280,800],[1024,768],[820,1180],[1180,820],[390,844],[320,740]]){
    const page=await browser.newPage({viewport:{width,height}})
    await page.addInitScript('window.__name = fn => fn')
    await page.goto('http://127.0.0.1:5198/')
    await page.getByRole('button',{name:'Start Building',exact:true}).click()
    await page.locator('.door-configuration-grid').waitFor()
    await inspect(page,`${width}-enter`)
    await page.locator('.door-configuration-card').first().click()
    await page.getByRole('button',{name:'Next configuration step'}).click()
    const guidance=page.getByRole('button',{name:'Start Configuring',exact:true})
    await page.waitForTimeout(200)
    if(await guidance.isVisible())await guidance.click()
    await page.locator('.door-configuration-grid').waitFor({state:'detached'})
    if(width<=900)await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight))
    else await page.locator('.builder-options-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight})
    await page.getByRole('button',{name:'Previous configuration step'}).click()
    await page.locator('.door-configuration-grid').waitFor()
    await inspect(page,`${width}-return`)
    await page.close()
  }
  console.log(`${assess?'Baseline assessment':'Configuration clipping checks'} complete: ${output}`)
}finally{await browser?.close();server.kill()}
