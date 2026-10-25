import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { statSync, readdirSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { finishes } from '../src/data/options'
import { paintColors, stainColors } from '../src/data/finishes'
import type { Finish } from '../src/types'

assert.equal(finishes.length,47)
for(const color of paintColors){const f=finishes.find(f=>f.id===`paint-${color.id}`)!;assert.equal(f.name,color.name);assert.equal(f.color,color.hex);assert.equal(f.image,'')}
for(const color of stainColors){const f=finishes.find(f=>f.id===`stain-${color.id}`)!;assert.equal(f.color,color.hex);assert.equal(f.image,`/assets/finishes/stain/${color.id}.webp`);assert.ok(statSync(`public${f.image}`).size>0)}
assert.equal(readdirSync('public/assets/finishes/stain').filter(f=>f.endsWith('.webp')).length,21)
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5197','--strictPort'],{stdio:'pipe',env:{...process.env,VITE_INVENTORY_SHADOW:'false'}})
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined
try{
 await new Promise<void>((resolve,reject)=>{server.stdout.on('data',c=>{if(String(c).includes('127.0.0.1:5197'))resolve()});server.once('error',reject);server.once('exit',c=>reject(new Error(`Vite exited ${c}`)));setTimeout(()=>reject(new Error('Vite start timeout')),10000).unref()})
 browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),paintRequests:string[]=[]
 page.on('request',r=>{if(r.url().includes('/assets/finishes/paint/'))paintRequests.push(r.url())})
 await page.addInitScript('globalThis.__name = (target) => target')
 await page.goto('http://127.0.0.1:5197/scripts/pdfRendererHarness.html');await page.waitForFunction(()=> 'pdfFixtures' in window)
 const pdf=await page.evaluate(async()=>{
  const load=<T,>(path:string)=>import(path) as Promise<T>
  const {finishes,doorStyles,glassOptions,hardwareOptions}=await load<typeof import('../src/data/options')>('/src/data/options.ts'),{resolveDoorProduct}=await load<typeof import('../src/data/productCatalog')>('/src/data/productCatalog.ts'),{renderPdfProduct}=await load<typeof import('../src/utils/pdfProductRenderer')>('/src/utils/pdfProductRenderer.ts'),{resolveDoorPreviewCandidates}=await load<typeof import('../src/data/doorPreviewAssets')>('/src/data/doorPreviewAssets.ts')
  const style=doorStyles.find(s=>s.code==='F')!,glass=glassOptions.find(g=>g.id==='f-clear-no-grids')!
  const render=async(finish:Finish)=>renderPdfProduct({style,finish,product:resolveDoorProduct(style,finish,finish.finishType==='stain'?'Oak':undefined,'22-gauge-steel'),grain:finish.finishType==='stain'?'Oak':null,glass,grid:null,hardware:hardwareOptions[0],doorSwing:{id:'LHI',name:'Left Hand Inswing',image:''},sidelites:'none',doorConfigurationType:'single'},{glass,jambFinish:finish,glassFrameFinish:finish})
  let paints=0,stains=0
  for(const f of finishes){const actual=await render(f);if(f.finishType==='paint'){const legacy=await render({...f,image:`/assets/finishes/paint/${f.id.slice(6)}.webp`});if(actual.dataUrl!==legacy.dataUrl||actual.assets.some(p=>p.includes('/finishes/paint/')))throw new Error(`Paint changed: ${f.id}`);paints++}else{
   // Grain is authored in the resolved slab; finish.image is a card thumbnail.
   const product=resolveDoorProduct(style,f,'Oak','22-gauge-steel'),slab=resolveDoorPreviewCandidates(style,'stain',product,'Oak')[0]
   if(!product.matchingVariants.length||!slab||!actual.assets.some(path=>decodeURIComponent(new URL(path,location.href).pathname)===decodeURIComponent(slab)))throw new Error(`Stain slab missing: ${f.id}`)
   if(actual.assets.some(p=>p.includes('/finishes/stain/')))throw new Error(`Card thumbnail used as slab texture: ${f.id}`)
   const withoutThumbnail=await render({...f,image:'/assets/finish-regression-missing.webp'})
   if(actual.dataUrl!==withoutThumbnail.dataUrl)throw new Error(`Stain depends on card thumbnail: ${f.id}`)
   stains++
  }}
  return {paints,stains}
 })
 assert.deepEqual(pdf,{paints:26,stains:21})
 // A fresh page avoids the renderer's image cache. Missing required slab art
 // must still fail, rather than accepting a preview with its texture absent.
 const missing=await browser.newPage()
 await missing.addInitScript('globalThis.__name = (target) => target')
 let blockedAssets=0
 await missing.route('**/assets/**',route=>{blockedAssets++;return route.abort()})
 await missing.goto('http://127.0.0.1:5197/scripts/pdfRendererHarness.html');await missing.waitForFunction(()=> 'pdfFixtures' in window)
 const missingSlabRejected=await missing.evaluate(async()=>{
  const load=<T,>(path:string)=>import(path) as Promise<T>
  const {finishes,doorStyles,glassOptions,hardwareOptions}=await load<typeof import('../src/data/options')>('/src/data/options.ts'),{resolveDoorProduct}=await load<typeof import('../src/data/productCatalog')>('/src/data/productCatalog.ts'),{renderPdfProduct}=await load<typeof import('../src/utils/pdfProductRenderer')>('/src/utils/pdfProductRenderer.ts')
  const style=doorStyles.find(s=>s.code==='F')!,finish=finishes.find(f=>f.id==='stain-nutmeg')!,glass=glassOptions.find(g=>g.id==='f-clear-no-grids')!
  try{await renderPdfProduct({style,finish,product:resolveDoorProduct(style,finish,'Oak','22-gauge-steel'),grain:'Oak',glass,grid:null,hardware:hardwareOptions[0],doorSwing:{id:'LHI',name:'Left Hand Inswing',image:''},sidelites:'none',doorConfigurationType:'single'},{glass,jambFinish:finish,glassFrameFinish:finish});return false}catch(e){return /PDF asset could not be loaded/.test((e as Error).message)}
 })
 assert.equal(missingSlabRejected,true);assert.ok(blockedAssets>0);await missing.close()
 const capture=await page.evaluate(async()=>{
  const load=<T,>(path:string)=>import(path) as Promise<T>
  const rm=await load<typeof import('react') & {default?:typeof import('react')}>('/node_modules/.vite/deps/react.js'),React=rm.default??rm,dm=await load<typeof import('react-dom/client') & {default:typeof import('react-dom/client')}>('/node_modules/.vite/deps/react-dom_client.js'),createRoot=dm.createRoot??dm.default.createRoot
  const {DoorPreview}=await load<typeof import('../src/components/DoorPreview')>('/src/components/DoorPreview.tsx'),{captureFinalDoorPreview}=await load<typeof import('../src/features/home-visualizer/captureDoorPreview')>('/src/features/home-visualizer/captureDoorPreview.ts'),{finishes,doorStyles,glassOptions,hardwareOptions}=await load<typeof import('../src/data/options')>('/src/data/options.ts'),{resolveDoorProduct}=await load<typeof import('../src/data/productCatalog')>('/src/data/productCatalog.ts')
  const css=document.createElement('link');css.rel='stylesheet';css.href='/src/styles.css';document.head.appendChild(css);await new Promise(r=>css.onload=r)
  const style=doorStyles.find(s=>s.code==='F')!,glass=glassOptions.find(g=>g.id==='f-clear-no-grids')!,result:{id:string;variant:string;hash:string}[]=[]
  for(const id of ['paint-black','paint-white','paint-wineberry','stain-nutmeg'])for(const variant of ['current','legacy']){
   const original=finishes.find(f=>f.id===id)!,finish={...original,image:variant==='legacy'&&original.finishType==='paint'?`/assets/finishes/paint/${id.slice(6)}.webp`:original.image},key=id+variant
   const host=document.createElement('div');host.style.cssText='width:700px;height:900px';document.body.appendChild(host);const root=createRoot(host);let ready=false
   root.render(React.createElement(DoorPreview,{style,glass,finish,hardware:hardwareOptions[0],product:resolveDoorProduct(style,finish,finish.finishType==='stain'?'Oak':undefined,'22-gauge-steel'),grain:finish.finishType==='stain'?'Oak':null,jambFinish:finish,glassFrameFinish:finish,applyFinish:true,view:'Exterior',showViewToggle:false,renderConfigurationKey:key,onRenderReadinessChange:(s)=>{ready=s.ready}}))
   for(let i=0;i<100&&!ready;i++)await new Promise(r=>setTimeout(r,100))
   const cap=await captureFinalDoorPreview(host,{frameMode:'visible',preserveCanonicalFrameBounds:true,expectedConfigurationKey:key}),hash=await crypto.subtle.digest('SHA-256',await cap.blob.arrayBuffer())
   result.push({id,variant,hash:Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,'0')).join('')});root.unmount();host.remove()
  }return result
 })
 for(let i=0;i<capture.length;i+=2)assert.equal(capture[i].hash,capture[i+1].hash,`Reference pixels changed: ${capture[i].id}`)
 assert.equal(paintRequests.length,0)
 console.log(JSON.stringify({pdf,missingSlabRejected,capturePairs:capture.length/2,paintRequests:paintRequests.length,stainFiles:21,paidAiRequests:0,passed:true},null,2))
}finally{await browser?.close();server.kill('SIGTERM')}
