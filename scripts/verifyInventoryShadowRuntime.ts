import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { readFile } from 'node:fs/promises'
import { doorStyles, hardwareOptions } from '../src/data/options'
const draft={version:1,configuration:{selectedDoorConfigurationType:'single',styleId:doorStyles.find(s=>s.code==='F1')!.id,doorLineId:'20-gauge-smooth-steel',sidelites:'none',selectedFinishType:'paint',selectedPaint:'paint-black',jambType:'timber',jambFinishType:'paint',jambFinishColor:'paint-black',doorSwingId:'LHI',hardwareId:hardwareOptions[0].id}}
for(const enabled of [false,true]){
  const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5194','--strictPort'],{env:{...process.env,VITE_INVENTORY_SHADOW:String(enabled)},stdio:'pipe'})
  let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined
  try{
    await new Promise<void>((resolve,reject)=>{server.stdout.on('data',chunk=>{if(String(chunk).includes('127.0.0.1:5194'))resolve()});server.once('error',reject);setTimeout(()=>reject(new Error('Vite timeout')),15000).unref()})
    browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
    const page=await browser.newPage({viewport:{width:1280,height:900}})
    let calls=0;page.on('request',request=>{if(request.url().includes('/__dev/inventory-shadow/')){calls++;const context=request.postDataJSON();assert.ok(Object.keys(context).every(key=>['styleId','lineId','grain','finishType','glassId','sideliteStyle','hardwareId'].includes(key)))}})
    await page.addInitScript(value=>{localStorage.setItem('hgi-door-builder-draft',JSON.stringify(value));(window as unknown as {__name:(fn:unknown)=>unknown}).__name=fn=>fn},draft)
    await page.goto('http://127.0.0.1:5194/')
    const response=enabled?page.waitForResponse(r=>r.url().includes('/__dev/inventory-shadow/'),{timeout:25000}):null
    await page.getByRole('button',{name: 'Start Building Your Door', exact: true}).click()
    await page.getByRole('button',{name:'Next configuration step'}).waitFor()
    await page.waitForTimeout(200)
    const before=await page.evaluate(()=>localStorage.getItem('hgi-door-builder-draft'))
    if(response){const body=await (await response).json();assert.equal(body.status,'ok');assert.ok(body.reports.every((r:{matches:boolean})=>r.matches))}else{await page.waitForTimeout(800);assert.equal(calls,0)}
    assert.equal(await page.evaluate(()=>localStorage.getItem('hgi-door-builder-draft')),before,'Shadow result never changes draft state')
    if(enabled){
      await page.route('**/__dev/inventory-shadow/compare',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({status:'unavailable',reason:'Simulated outage'})}))
      await page.getByRole('button',{name:'Next configuration step'}).click();await page.waitForTimeout(700)
      await page.getByRole('button',{name:'Next configuration step'}).click()
      assert.ok(await page.getByRole('button',{name:'Next configuration step'}).isVisible(),'Navigation continues during outage')
      await page.unroute('**/__dev/inventory-shadow/compare')
      await page.route('**/__dev/inventory-shadow/compare',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({status:'ok',reports:[{matches:false,area:'injected mismatch',revisionId:'test'}]})}))
      const prior=await page.evaluate(()=>JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.selectedPaint)
      await page.getByRole('button',{name:'Next configuration step'}).click();await page.waitForTimeout(700)
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.selectedPaint),prior)
    }
    console.log(`${enabled?'Enabled':'Disabled'} local shadow: request guard, unchanged draft and ${enabled?'outage/mismatch isolation':'zero shadow requests'} passed`)
  }finally{await browser?.close();server.kill('SIGTERM')}
}
const app=await readFile('src/App.tsx','utf8');assert.ok(!app.includes('SUPABASE_SERVICE_ROLE_KEY'))
