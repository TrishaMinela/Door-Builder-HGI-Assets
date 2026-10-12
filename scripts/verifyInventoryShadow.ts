import assert from 'node:assert/strict'
import { readDevShadowCatalog } from '../server/inventoryShadowReader'
import { hardcodedSnapshot, databaseSnapshot } from '../server/inventoryShadowSemantics'
import { compareSnapshots } from '../src/inventory-shadow/compare'
import { safeContext, type ShadowContext } from '../src/inventory-shadow/types'
import { productCatalog, catalogDoorStyles, doorLineChoices } from '../src/data/productCatalog'
import { hardwareOptions } from '../src/data/hardware'
import { glassOptions } from '../src/data/glassOptions'
import { sideliteAssetFamilyForSlab,sideliteStylesForFamily } from '../src/data/sideliteAssets'

const catalog=await readDevShadowCatalog(30000)
let failedReads=0
await assert.rejects(()=>readDevShadowCatalog(1000,async(_input,init)=>{failedReads++;assert.equal(init?.method,'GET');return new Response('',{status:503})}),/read failed/)
assert.equal(failedReads,1,'Outage is isolated; no writes or alternate catalog request')
await assert.rejects(()=>readDevShadowCatalog(1000,async()=>Response.json([])),/not found uniquely/)
await assert.rejects(()=>readDevShadowCatalog(1000,async()=>Response.json([{...catalog.revision,status:'published'}])),/provenance\/status mismatch/)
await assert.rejects(()=>readDevShadowCatalog(10,async(_input,init)=>new Promise<Response>((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(new DOMException('Timeout','AbortError'))))),error=>error instanceof Error&&error.name==='AbortError')
let comparisons=0,matches=0
const failures:ReturnType<typeof compareSnapshots>=[],contexts:ShadowContext[]=[{}]
for(const style of catalogDoorStyles){contexts.push({styleId:style.id});for(const variant of style.variants){const line=productCatalog.find(l=>l.id===variant.lineId)!,group=doorLineChoices.find(g=>g.lineIds.includes(line.id))!,grain=line.grains[0]||null,base={styleId:style.id,lineId:group.id,grain};contexts.push(base);for(const kind of ['paint','stain'])contexts.push({...base,finishType:kind});for(const slab of sideliteStylesForFamily(sideliteAssetFamilyForSlab({doorLineId:group.id,grain})))contexts.push({...base,sideliteStyle:slab});for(const glass of glassOptions.filter(g=>g.overlaysByDoorStyle[variant.code]))contexts.push({...base,glassId:glass.id})}}
for(const hardware of hardwareOptions)contexts.push({hardwareId:hardware.id})
for(const context of contexts){const reports=compareSnapshots(hardcodedSnapshot(context),databaseSnapshot(catalog,context),context);comparisons+=reports.length;matches+=reports.filter(r=>r.matches).length;failures.push(...reports.filter(r=>!r.matches))}
const baseline=hardcodedSnapshot(contexts[2]),same=compareSnapshots(baseline,baseline,contexts[2]);assert.ok(same.every(r=>r.matches))
const reordered=Object.fromEntries(Object.entries(baseline).map(([key,area])=>[key,{...area,choices:[...area.choices].reverse()}]));assert.ok(compareSnapshots(baseline,reordered,contexts[2]).every(r=>r.matches),'Harmless order does not mismatch')
const mutated=structuredClone(baseline);mutated.hardwareProducts.choices[0].metadata.finish='Injected mismatch';assert.ok(compareSnapshots(baseline,mutated,{}).some(r=>!r.matches),'Metadata drift detected')
assert.deepEqual(safeContext({styleId:'x',email:'private@example.test',photo:'data:image/...',serviceKey:'secret'}),{styleId:'x'})
console.log(JSON.stringify({contexts:contexts.length,comparisons,matches,mismatches:failures.length,failures:failures.slice(0,12),orderingTest:true,metadataDriftTest:true,piiExcluded:true,readOnlyOutageTest:true,pinnedRevisionTests:true,timeoutTest:true},null,2))
if(failures.length)process.exitCode=1
