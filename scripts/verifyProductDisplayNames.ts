import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { doorStyles, hardwareOptions, finishes } from '../src/data/options'
import { doorStyleDisplayName, doorStyleCardName, sideliteStyleDisplayName, glassDisplayName } from '../src/data/productDisplayNames'
import { resolveDoorProduct } from '../src/data/productCatalog'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import { aiTestConfiguration } from './aiVisualizerFixture'

const slab = doorStyles.find(style => style.code === '2PHD')!
assert.equal(doorStyleDisplayName(slab), '2P HD Flat Top')
const arch = doorStyles.find(style => style.code === 'S4')!
assert.equal(doorStyleCardName(arch), 'Four Lite Arch Top')
assert.equal(doorStyleDisplayName(arch), 'Four Lites Together Each With An Arch At Top')
assert.equal(doorStyleDisplayName(doorStyles.find(style => style.code === 'F48')!), '3/4 Lite')
assert.equal(sideliteStyleDisplayName('SSL'), 'Half Side Lite')
assert.equal(sideliteStyleDisplayName('f48sl'), 'Three Quarter Side Lite')
assert.equal(sideliteStyleDisplayName('fsl'), 'Full Side Lite Cut Out')
assert.equal(sideliteStyleDisplayName('s2sl'), 'S2 Sidelite')
assert.equal(glassDisplayName('NOGRID - No Grids'), 'No Grids')
assert.equal(new Set(doorStyles.map(doorStyleDisplayName)).size, doorStyles.length)
const finish = finishes.find(finish => finish.id === 'paint-white')!
const payload = buildDoorBuilderSubmissionPayload({ contact: { fullName:'Test',email:'',phone:'',zip:'',notes:'' }, configuration: { ...aiTestConfiguration, style: slab, finish, product: resolveDoorProduct(slab, finish, undefined, '20-gauge-smooth-steel'), sidelites:'right', sideliteStyle:'SSL', sideliteSlab:'ssl' } })
assert.equal(payload.door_style, '2PHD - 2P HD FLAT TOP')
assert.equal(payload.sidelite_slab, 'SSL')
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5218','--strictPort'], { stdio:'pipe' })
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await new Promise<void>((resolve,reject) => { server.stdout.on('data', chunk => { if(String(chunk).includes('127.0.0.1:5218')) resolve() }); server.once('error',reject); setTimeout(()=>reject(new Error('Vite startup timeout')),10000).unref() })
  browser = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true })
  for (const width of [1280,390]) {
    const page = await browser.newPage({ viewport:{ width,height:1000 } })
    await page.addInitScript(value=>localStorage.setItem('hgi-door-builder-draft',JSON.stringify({version:1,configuration:value})), {selectedDoorConfigurationType:'single',styleId:slab.id,doorLineId:'20-gauge-smooth-steel',sidelites:'right',sideliteStyleId:'ssl',selectedFinishType:'paint',selectedPaint:'paint-white',doorSwingId:'LHI',hardwareId:hardwareOptions[0].id,sideliteGlassCategory:'clear',sideliteGlassId:'clear-no-grids'})
    await page.goto('http://127.0.0.1:5218/')
    await page.getByRole('button',{name:'Start Building',exact:true}).click()
    const next=async()=>{await page.getByRole('button',{name:'Next configuration step'}).click();await page.waitForTimeout(120)}
    const navigate=async(name:string)=>{for(let i=0;i<30 && !(await page.getByRole('heading',{name,exact:true}).isVisible());i++){if(await page.getByRole('button',{name:'Start Configuring',exact:true}).isVisible())await page.getByRole('button',{name:'Start Configuring',exact:true}).click();await next()} await page.getByRole('heading',{name,exact:true}).waitFor()}
    await navigate('Choose a Door Style')
    if(await page.getByRole('button',{name:'Start Configuring',exact:true}).isVisible())await page.getByRole('button',{name:'Start Configuring',exact:true}).click()
    const labels=await page.locator('.builder-options-scroll .option-card strong').allTextContents()
    assert.equal(labels.length,42)
    assert.ok(labels.includes('2P HD Flat Top')); assert.ok(labels.includes('3/4 Lite'))
    assert.ok(!labels.some(label=>label.startsWith('2PHD ')))
    await page.getByRole('button',{name:'Full product name for Four Lite Arch Top',exact:true}).click()
    const dialog=page.getByRole('dialog',{name:'Full product name'})
    assert.match(await dialog.innerText(),/Four Lites Together Each With An Arch At Top/)
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration.styleId),slab.id,'Info does not select a different product')
    await dialog.getByRole('button',{name:'Close',exact:true}).click()
    await navigate('Choose Your Sidelite Slab')
    assert.ok((await page.locator('.builder-options-scroll .option-card strong').allTextContents()).includes('Half Side Lite'))
    assert.equal(await page.locator('.builder-options-scroll .option-card.selected strong').innerText(),'Half Side Lite')
    await navigate('Configuration Summary')
    const summary=await page.locator('.summary-card').innerText()
    assert.match(summary,/2P HD Flat Top/); assert.match(summary,/Half Side Lite/)
    assert.doesNotMatch(summary,/2PHD -|Sidelite Slab\s*SSL/)
    const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('hgi-door-builder-draft')!).configuration)
    assert.equal(state.styleId,slab.id);assert.equal(state.sideliteStyleId,'ssl')
    console.log(`${width}px: 42 readable door cards, verified SSL label, summaries and unchanged saved IDs passed`)
    await page.close()
  }
} finally { await browser?.close();server.kill('SIGTERM') }
