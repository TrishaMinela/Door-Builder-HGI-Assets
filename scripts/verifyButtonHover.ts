import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium, type Locator, type Page } from 'playwright-core'
import { doorStyles, hardwareOptions } from '../src/data/options'

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5201','--strictPort'],{stdio:'pipe'})
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined
const draft={version:1,configuration:{selectedDoorConfigurationType:'single',styleId:doorStyles.find(s=>s.code==='F')!.id,doorLineId:'20-gauge-smooth-steel',sidelites:'none',selectedFinishType:'paint',selectedPaint:'paint-black',jambType:'timber',jambFinishType:'paint',jambFinishColor:'paint-black',hardwareId:hardwareOptions[0].id,doorSwingId:'LHI'}}
async function snapshot(button:Locator){return button.evaluate(el=>{
  const css=getComputedStyle(el),matrix=new DOMMatrix(css.transform==='none'?undefined:css.transform),r=el.getBoundingClientRect()
  const unchanged=Object.fromEntries(['color','backgroundColor','backgroundImage','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','paddingTop','paddingRight','paddingBottom','paddingLeft','fontSize','fontWeight','textDecorationLine','letterSpacing','opacity'].map(key=>[key,css[key as keyof CSSStyleDeclaration]]))
  return {unchanged,matrix:[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f],shadow:css.boxShadow,duration:css.transitionDuration,width:r.width,height:r.height,children:[...el.querySelectorAll('svg,.hardware-finish-color')].map(child=>({transform:getComputedStyle(child).transform,shadow:getComputedStyle(child).boxShadow})),text:el.textContent}
})}
async function check(page:Page,button:Locator,label:string,animated=true){
  await button.scrollIntoViewIfNeeded();await page.mouse.move(1,1);await page.waitForTimeout(220)
  const before=await snapshot(button)
  await button.hover();await page.waitForTimeout(220)
  const after=await snapshot(button)
  assert.deepEqual(after.unchanged,before.unchanged,`${label}: hover must not recolor, re-border, resize or change text styling`)
  assert.deepEqual(after.children,before.children,`${label}: no nested icon rotation or swatch glow`)
  assert.equal(after.text,before.text)
  assert.ok(Math.abs(after.width-before.width)<.1&&Math.abs(after.height-before.height)<.1,`${label}: no scale/size change`)
  assert.deepEqual(after.matrix.slice(0,4),before.matrix.slice(0,4),`${label}: no scale/rotation`)
  assert.ok(Math.abs(after.matrix[4]-before.matrix[4])<.1,`${label}: no horizontal jump`)
  if(animated){
    assert.ok(Math.abs(after.matrix[5]-before.matrix[5]+2)<.1,`${label}: exactly 2px lift`)
    assert.notEqual(after.shadow,before.shadow,`${label}: subtle shadow`)
    assert.equal(after.duration,'0.18s')
  }else{
    assert.deepEqual(after.matrix,before.matrix,`${label}: no movement`)
    assert.equal(after.shadow,before.shadow,`${label}: no hover shadow`)
  }
  console.log(`PASS ${label}`)
}
async function checkSegmentedView(page:Page,button:Locator,label:string,selected=false){
  await button.scrollIntoViewIfNeeded();await page.mouse.move(1,1);await page.waitForTimeout(220)
  const before=await snapshot(button)
  await button.hover();await page.waitForTimeout(220)
  const after=await snapshot(button)
  assert.deepEqual(after.matrix,before.matrix,`${label}: stays stationary`)
  assert.equal(after.shadow,before.shadow,`${label}: no hover shadow`)
  if(selected)assert.equal(after.unchanged.backgroundColor,before.unchanged.backgroundColor,`${label}: selected teal remains unchanged`)
  else assert.notEqual(after.unchanged.backgroundColor,before.unchanged.backgroundColor,`${label}: subtle hover highlight`)
  console.log(`PASS ${label}`)
}
try{
  await new Promise<void>((resolve,reject)=>{server.stdout.on('data',chunk=>{if(String(chunk).includes('127.0.0.1:5201'))resolve()});server.once('error',reject);server.once('exit',code=>reject(new Error(`Vite exited ${code}`)));setTimeout(()=>reject(new Error('Vite startup timeout')),10000).unref()})
  browser=await chromium.launch({channel:'chrome',headless:true})
  const page=await browser.newPage({viewport:{width:1440,height:1000}})
  await page.addInitScript(value=>{localStorage.setItem('hgi-door-builder-draft',JSON.stringify(value));(window as unknown as {__name:(fn:unknown)=>unknown}).__name=fn=>fn},draft)
  await page.goto('http://127.0.0.1:5201/')
  await check(page,page.getByRole('button',{name:'Start Building',exact:true}),'Home CTA')
  await check(page,page.getByRole('link',{name:'Find a Dealer'}),'Dealer CTA link')
  await check(page,page.getByRole('button',{name:'Feedback',exact:true}),'Footer feedback')
  await page.getByRole('button',{name:'Feedback',exact:true}).click()
  await check(page,page.getByRole('button',{name:'Close feedback'}),'Portaled modal close')
  await check(page,page.getByRole('button',{name:'Cancel',exact:true}),'Portaled modal cancel')
  await check(page,page.getByRole('button',{name:'Send Feedback',exact:true}),'Portaled modal submit')
  await page.keyboard.press('Escape')
  await page.getByRole('button',{name:'Start Building',exact:true}).click()
  const guidance=page.getByRole('button',{name:'Start Configuring',exact:true})
  if(await guidance.isVisible())await guidance.click()
  await check(page,page.getByRole('button',{name:'Previous configuration step'}),'Disabled Previous',false)
  await check(page,page.getByRole('button',{name:'Next configuration step'}),'Next')
  await check(page,page.locator('.door-configuration-card').first(),'Selected configuration card')
  await check(page,page.locator('.preview-toolbar-reset'),'Reset icon stays unrotated')
  const viewToggle=page.locator('.preview-toolbar .preview-view-toggle')
  await checkSegmentedView(page,viewToggle.locator('button.active'),'Selected preview view',true)
  await checkSegmentedView(page,viewToggle.locator('button:not(.active)').first(),'Unselected preview view')
  // Existing positional transforms must survive the shared lift; exercise the
  // same CSS classes used by interactive comparison/position handles.
  await page.evaluate(()=>{
    const host=document.createElement('div');host.className='hover-contract-fixture';host.style.cssText='position:fixed;left:600px;top:350px;width:180px;height:180px;z-index:9000;background:white'
    host.innerHTML='<button class="visualizer-comparison-handle" style="left:50%;top:50%">Compare</button><button aria-disabled="true" style="position:absolute;bottom:0">Unavailable</button>'
    document.querySelector('.builder-typography')!.append(host)
  })
  await check(page,page.locator('.hover-contract-fixture .visualizer-comparison-handle'),'Centered comparison handle')
  await check(page,page.locator('.hover-contract-fixture [aria-disabled=true]'),'ARIA-disabled button',false)
  await page.locator('.hover-contract-fixture').evaluate(el=>el.remove())
  await page.mouse.move(1,1)
  await page.keyboard.press('Tab')
  const focus=await page.evaluate(()=>{const el=document.activeElement!;return {visible:el.matches(':focus-visible'),outline:getComputedStyle(el).outlineStyle,width:parseFloat(getComputedStyle(el).outlineWidth)}})
  assert.ok(focus.visible&&focus.outline!=='none'&&focus.width>0,'Keyboard focus remains visible')
  await page.close()
  for(const mode of ['touch','reduced-motion'] as const){
    const p=await browser.newPage(mode==='touch'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:1000},reducedMotion:'reduce'})
    await p.addInitScript('window.__name = fn => fn')
    await p.goto('http://127.0.0.1:5201/')
    assert.equal(await p.evaluate(()=>matchMedia('(hover:hover)').matches),mode!=='touch')
    await check(p,p.getByRole('button',{name:'Start Building',exact:true}),`${mode}: home CTA`,false)
    await check(p,p.getByRole('button',{name:'Feedback',exact:true}),`${mode}: footer`,false)
    await p.close()
  }
  console.log('Shared hover contract passed: lift/shadow only, focus, centering, disabled, touch and reduced motion; no feedback submitted.')
}finally{await browser?.close();server.kill()}
