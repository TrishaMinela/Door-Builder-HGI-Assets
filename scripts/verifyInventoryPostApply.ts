import assert from 'node:assert/strict'
import { readDevShadowCatalog } from '../server/inventoryShadowReader'
import { devCredentials, DEV_REF } from './importInventoryCatalog'
import { exportInventoryCatalog, TABLES, canonical } from './exportInventoryCatalog'
import { EXPECTED_REVISION, EXPECTED_COMMIT } from '../src/inventory-shadow/types'
import { EXPECTED_CLEANUP_DIGEST } from '../src/inventory-shadow/cleanupPin'
import { CLEANUP_VERSION, cleanupDigest } from './inventory/normalizeCleanup'

const {origin,key}=devCredentials(),origins=new Set<string>(),methods=new Set<string>()
const trackedFetch:typeof fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url)
 assert.equal(url.origin,origin,'Only allowlisted DEV may be accessed')
 assert.equal(init?.method,'GET','Verification must remain read-only')
 origins.add(url.origin);methods.add(init!.method!)
 return fetch(input,init)
}
const actual=await readDevShadowCatalog(30000,trackedFetch),meta=JSON.parse(actual.revision.notes||'{}')
assert.equal(actual.revision.id,EXPECTED_REVISION);assert.equal(actual.revision.status,'draft')
assert.equal(actual.revision.published_at,null);assert.equal(actual.revision.published_by,null)
assert.equal(meta.cleanupVersion,CLEANUP_VERSION);assert.equal(meta.cleanupChecksum,EXPECTED_CLEANUP_DIGEST)
assert.equal(cleanupDigest(actual.tables),EXPECTED_CLEANUP_DIGEST)
async function read(path:string,accept?:string){const response=await trackedFetch(`${origin}/rest/v1/${path}`,{method:'GET',redirect:'error',headers:{apikey:key,Authorization:`Bearer ${key}`,...(accept?{Accept:accept}:{})},signal:AbortSignal.timeout(30000)});assert.equal(response.ok,true,`DEV read HTTP ${response.status}`);return response.json()}
const schema=await read('','application/openapi+json')
for(const [table,columns] of Object.entries({grid_locations:['legacy_id'],grid_combination_locations:['grid_combination_id','grid_location_id'],grid_combination_coatings:['grid_combination_id','glass_coating_id'],grid_patterns:['lite_count','orientation'],grid_colors:['primary_hex_color','secondary_hex_color'],glass_coatings:['coating_kind'],allowed_grid_combinations:['pattern_selection_mode'],grid_combination_assets:['grid_location_id']}))for(const column of columns)assert.ok(schema.definitions[table]?.properties[column],`${table}.${column} exists`)
assert.ok(schema.definitions.allowed_grid_combinations.required.includes('pattern_selection_mode'))
assert.ok(!schema.definitions.allowed_grid_combinations.required.includes('grid_pattern_id'))
assert.ok(!schema.definitions.allowed_grid_combinations.required.includes('grid_width_id'))
assert.ok(schema.definitions.grid_combination_assets.required.includes('grid_location_id'))
const revisions=await read('catalog_revisions?select=id,status,published_at,published_by')
assert.equal(revisions.length,1);assert.equal(revisions[0].id,EXPECTED_REVISION)
const audit=await read(`catalog_change_log?catalog_revision_id=eq.${EXPECTED_REVISION}&select=id,action,change_summary,after_data`)
assert.equal((audit as {action?:unknown;after_data?:{cleanupChecksum?:unknown}}[]).filter(r=>r.action==='update'&&r.after_data?.cleanupChecksum===EXPECTED_CLEANUP_DIGEST).length,1)

// Fresh working-tree manifest has new UUIDs/provenance, but identical product facts.
// Reconcile using complete exported field values and remapped parent UUIDs, NOT labels.
const expected=await exportInventoryCatalog('HEAD',{workingTree:true}),ids=new Map<string,string>([[expected.revisionId,EXPECTED_REVISION]])
const ignored=new Set(['id','catalog_revision_id','created_at','updated_at'])
const parseNotes=(v:unknown)=>{if(typeof v!=='string')return v??null;try{return JSON.parse(v)}catch{return v}}
const parity:Record<string,{expected:number;actual:number;missing:number;extra:number}>={}
let compared=0
for(const table of TABLES.filter(t=>t!=='catalog_revisions'&&t!=='catalog_change_log')){
 const erows=expected.tables[table],arows=actual.tables[table]??[]
 const columns=[...new Set(erows.flatMap(r=>Object.keys(r)))].filter(k=>!ignored.has(k)&&!(table==='assets'&&k==='provenance')).sort()
 const values=(r:Record<string,unknown>,remap:boolean)=>canonical(Object.fromEntries(columns.map(k=>{
  let v=r[k]??null
  if(remap&&k.endsWith('_id')&&k!=='legacy_id'&&v!==null){assert.ok(ids.has(v),`Unresolved expected ${table}.${k}`);v=ids.get(v)}
  if(k==='notes')v=parseNotes(v)
  return [k,v]
 })))
 const index=new Map<string,Record<string,unknown>[]>()
 for(const r of arows){const k=values(r,false);index.set(k,[...(index.get(k)||[]),r])}
 let missing=0
 for(const r of erows){const matches=index.get(values(r,true))??[];if(matches.length!==1){missing++;continue}ids.set(r.id,matches[0].id);index.delete(values(matches[0],false));compared++}
 const extra=[...index.values()].reduce((n,rows)=>n+rows.length,0)
 parity[table]={expected:erows.length,actual:arows.length,missing,extra}
 assert.equal(missing,0,`Missing/changed/ambiguous records: ${table}`);assert.equal(extra,0,`Unexpected records: ${table}`)
}
assert.ok(actual.tables.assets.every(r=>r.provenance===EXPECTED_COMMIT),'Original asset provenance retained')
assert.equal(actual.tables.finish_assets.length,21)
const byId=new Map(actual.tables.finishes.map(r=>[r.id,r]))
assert.ok(actual.tables.finish_assets.every(b=>byId.get(b.finish_id as string)?.finish_type==='stain'))
assert.equal(actual.tables.finish_assets.filter(b=>byId.get(b.finish_id as string)?.finish_type==='paint').length,0)
assert.ok(!actual.tables.assets.some(r=>String(r.current_path).startsWith('/assets/finishes/paint/')))
console.log(JSON.stringify({target:DEV_REF,productionAccessed:false,networkOrigins:[...origins],networkMethods:[...methods],schemaVerified:true,revision:EXPECTED_REVISION,status:'draft',published:false,cleanupChecksum:EXPECTED_CLEANUP_DIGEST,comparedRecords:compared,paintBindings:0,stainBindings:21,parity,passed:true},null,2))
