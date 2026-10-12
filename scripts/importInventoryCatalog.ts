import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { exportInventoryCatalog, TABLES, FORMAT, canonical, type Row, type Catalog } from './exportInventoryCatalog'

export const DEV_REF = 'udbcnpjtwhmjzpjjhoph'
export function devCredentials(file = '.env.local') {
  const env:Record<string,string>={}
  for(const line of readFileSync(file,'utf8').split(/\r?\n/)){
    const match=line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if(match)env[match[1]]=match[2].trim().replace(/^(['"])(.*)\1$/,'$2')
  }
  let url:URL
  try{url=new URL(env.SUPABASE_URL)}catch{throw new Error('Server-only DEV URL is missing or invalid')}
  if(url.origin!==`https://${DEV_REF}.supabase.co` || url.pathname!=='/' || url.search || url.hash || url.username || url.password)throw new Error('Refusing non-allowlisted DEV target')
  const key=env.SUPABASE_SERVICE_ROLE_KEY
  if(!key)throw new Error('Server-only DEV credential missing')
  let claims:any
  try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString())}catch{throw new Error('Expected a DEV service-role JWT; credential not printed')}
  if(claims.role!=='service_role'||claims.ref!==DEV_REF || (claims.exp && claims.exp*1000<Date.now()))throw new Error('DEV credential claims invalid')
  return {origin:url.origin,key}
}

export function compareRows(expected:Row[], actual:Row[]) {
  const byId=new Map(actual.map(row=>[row.id,row])),expectedIds=new Set(expected.map(row=>row.id))
  const missing:string[]=[],extra:string[]=[],changed:string[]=[]
  for(const row of expected){const found=byId.get(row.id);if(!found)missing.push(row.id);else if(Object.entries(row).some(([key,value])=>canonical(found[key])!==canonical(value)))changed.push(row.id)}
  for(const row of actual)if(!expectedIds.has(row.id))extra.push(row.id)
  return {missing,extra,changed}
}

export function validateManifest(catalog:Catalog) {
  const all=new Set<string>()
  for(const table of TABLES)for(const row of catalog.tables[table]){
    if(all.has(row.id))throw new Error(`Duplicate row UUID in ${table}`);all.add(row.id)
    if(table!=='catalog_revisions'&&row.catalog_revision_id!==catalog.revisionId)throw new Error('Cross-revision manifest row')
  }
  for(const table of TABLES)for(const row of catalog.tables[table])for(const [key,value] of Object.entries(row))if(key.endsWith('_id')&&value!==null&&key!=='legacy_id'&&key!=='changed_by'&&key!=='published_by'&&!all.has(value))throw new Error(`Dangling ${table}.${key}`)
  for(const row of catalog.tables.allowed_grid_combinations)if((row.width_selection_mode==='none')!==(row.grid_width_id===null))throw new Error('Invalid grid width semantics')
  for(const row of catalog.tables.allowed_grid_combinations) {
    if((row.pattern_selection_mode==='none')!==(row.grid_pattern_id===null))throw new Error('Invalid grid pattern semantics')
    if(!catalog.tables.grid_combination_locations.some(location=>location.grid_combination_id===row.id))throw new Error('Missing explicit grid location')
    if(!catalog.tables.grid_combination_coatings.some(coating=>coating.grid_combination_id===row.id))throw new Error('Missing explicit coating eligibility')
  }
  for(const binding of catalog.tables.finish_assets)if(catalog.tables.finishes.find(f=>f.id===binding.finish_id)?.finish_type!=='stain')throw new Error('Paint must not require an image binding')
  for(const binding of catalog.tables.grid_combination_assets)if(!catalog.tables.grid_combination_locations.some(location=>location.grid_combination_id===binding.grid_combination_id&&location.grid_location_id===binding.grid_location_id))throw new Error('Artwork must match an eligible location')
  for(const row of catalog.tables.glass_options)if(/\blinen\b/i.test(row.display_name)&&(row.customer_selectable||!row.renderable))throw new Error('Linen lifecycle mismatch')
  if(catalog.tables.hardware_variants.length!==catalog.sourceCounts.hardwareProducts)throw new Error('Artwork views became sellable hardware')
  if(catalog.tables.catalog_revisions.length!==1||catalog.tables.catalog_revisions[0].status!=='draft'||catalog.tables.catalog_revisions[0].published_at!==null)throw new Error('Only one unpublished draft is permitted')
}

export async function inventoryImport({apply=false,expectDigest='',verifyOnly=false}: {apply?:boolean;expectDigest?:string;verifyOnly?:boolean}={}) {
  const credentials=devCredentials()
  async function request(path:string,init:RequestInit={}) {
    const response=await fetch(`${credentials.origin}/rest/v1/${path}`,{...init,redirect:'error',headers:{apikey:credentials.key,Authorization:`Bearer ${credentials.key}`,...init.headers},signal:AbortSignal.timeout(30000)})
    if(!response.ok){let code='unknown';try{code=(await response.json()).code||'unknown'}catch{}throw new Error(`DEV inventory request ${path.split('?')[0]} failed: HTTP ${response.status}, code ${code}`)}
    return response
  }
  const schema=await (await request('',{headers:{Accept:'application/openapi+json'}})).json()
  for(const table of TABLES)if(!schema.definitions?.[table])throw new Error(`DEV inventory table unavailable: ${table}`)
  async function rows(table:string) {
    if(!TABLES.includes(table as any))throw new Error('Non-inventory table forbidden')
    const countResponse=await request(`${table}?select=id`,{method:'HEAD',headers:{Prefer:'count=exact'}})
    const count=Number(countResponse.headers.get('content-range')?.split('/')[1]);if(!Number.isFinite(count))throw new Error(`Exact count unavailable: ${table}`)
    const result:Row[]=[]
    for(let start=0;start<count;start+=500)result.push(...await (await request(`${table}?select=*&order=id&offset=${start}&limit=500`)).json())
    if(result.length!==count)throw new Error(`Concurrent count changed: ${table}`)
    return result
  }
  const existing=Object.fromEntries(TABLES.map(t=>[t,[] as Row[]])) as Record<typeof TABLES[number],Row[]>
  for(let i=0;i<TABLES.length;i+=5)await Promise.all(TABLES.slice(i,i+5).map(async table=>{existing[table]=await rows(table)}))
  const prior=existing.catalog_revisions
  if(prior.length>1)throw new Error('Refusing DEV inventory with multiple revisions')
  if(prior.length && (prior[0].status!=='draft'||JSON.parse(prior[0].notes||'{}').format!==FORMAT))throw new Error('Existing revision is not this tool’s managed unpublished draft')
  const catalog=await exportInventoryCatalog(prior[0]?.source_commit||'HEAD')
  validateManifest(catalog)
  for(const table of TABLES)for(const row of catalog.tables[table])for(const column of Object.keys(row))if(!schema.definitions[table].properties[column])throw new Error(`Schema mismatch ${table}.${column}`)
  for(const table of TABLES)for(const row of catalog.tables[table])for(const [column,value] of Object.entries(row)){
    if(value===null)continue
    const description=schema.definitions[table].properties[column]?.description||''
    const parent=description.match(/<fk table='([^']+)' column='id'\/>/)?.[1]
    if(parent && TABLES.includes(parent as any) && !catalog.tables[parent as typeof TABLES[number]].some(record=>record.id===value))throw new Error(`Foreign-key type mismatch ${table}.${column}`)
  }
  const beforeCounts=Object.fromEntries(TABLES.map(t=>[t,existing[t].length]))
  const resume=prior.length===1
  if(resume && prior[0].id!==catalog.revisionId)throw new Error('Current catalog does not match the existing draft revision')
  for(const table of TABLES){const diff=compareRows(catalog.tables[table],existing[table]);if(diff.changed.length||diff.extra.length)throw new Error(`Refusing foreign/modified records in ${table}: ${diff.changed.length} changed, ${diff.extra.length} extra`)}
  console.log(JSON.stringify({stage:'preflight',targetProjectRef:DEV_REF,productionTarget:false,authenticatedReadSucceeded:true,allTablesEmpty:Object.values(beforeCounts).every(n=>n===0),managedDraftResume:resume,beforeCounts,intendedCounts:catalog.counts,revisionId:catalog.revisionId,sourceCommit:catalog.sourceCommit,catalogChecksum:catalog.catalogChecksum},null,2))
  if(!apply&&!verifyOnly)return {catalog,beforeCounts,applied:false}
  if(apply&&expectDigest!==catalog.catalogChecksum)throw new Error('Apply requires --expect-digest matching the reviewed plan')
  async function assertDraft() {
    const found=await (await request(`catalog_revisions?id=eq.${catalog.revisionId}&select=id,status,notes`)).json()
    if(found.length!==1||found[0].status!=='draft'||JSON.parse(found[0].notes).catalogChecksum!==catalog.catalogChecksum)throw new Error('Draft revision changed; stopping import')
  }
  const inserted:Record<string,number>={}
  if(apply)for(const table of TABLES){
    const present=new Set(existing[table].map(row=>row.id)),pending=catalog.tables[table].filter(row=>!present.has(row.id));inserted[table]=pending.length
    const shapes=new Map<string,Row[]>()
    for(const row of pending){const shape=Object.keys(row).sort().join(',');shapes.set(shape,[...(shapes.get(shape)||[]),row])}
    for(const group of shapes.values())for(let index=0;index<group.length;index+=150){
      if(table!=='catalog_revisions')await assertDraft()
      await request(`${table}?on_conflict=id`,{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(group.slice(index,index+150))})
    }
    console.log(JSON.stringify({stage:'import',table,inserted:pending.length}))
  }
  await assertDraft()
  const parity:Record<string,any>={}
  for(let i=0;i<TABLES.length;i+=5)await Promise.all(TABLES.slice(i,i+5).map(async table=>{const actual=await rows(table);const differences=compareRows(catalog.tables[table],actual);parity[table]={expected:catalog.tables[table].length,actual:actual.length,missing:differences.missing.length,extra:differences.extra.length,changed:differences.changed.length}}))
  const matches=Object.values(parity).every(row=>row.missing===0&&row.extra===0&&row.changed===0)
  if(!matches)throw new Error(`DEV parity failed: ${canonical(parity)}`)
  console.log(JSON.stringify({stage:'parity',matches,revisionStatus:'draft',revisionId:catalog.revisionId,sourceCommit:catalog.sourceCommit,parity},null,2))
  return {catalog,beforeCounts,applied:apply,inserted,parity,matches}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)inventoryImport({apply:process.argv.includes('--apply'),verifyOnly:process.argv.includes('--verify'),expectDigest:process.argv.find(arg=>arg.startsWith('--expect-digest='))?.slice('--expect-digest='.length)}).catch(error=>{console.error(error instanceof Error?error.message:'Inventory operation failed');process.exitCode=1})
