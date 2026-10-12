import assert from 'node:assert/strict'
import { exportInventoryCatalog, canonical, TABLES } from './exportInventoryCatalog'
import { validateManifest, compareRows, devCredentials } from './importInventoryCatalog'
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const directory=mkdtempSync(join(tmpdir(),'hgi-inventory-guard-')),file=join(directory,'env')
const mockKey=(ref:string,role='service_role')=>`test.${Buffer.from(JSON.stringify({ref,role,exp:4102444800})).toString('base64url')}.not-a-real-signature`
try {
  writeFileSync(file,`SUPABASE_URL=https://production-example.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=${mockKey('production-example')}\n`)
  assert.throws(()=>devCredentials(file),/non-allowlisted DEV target/,'Production-like target rejected locally, without requests')
  writeFileSync(file,`SUPABASE_URL=https://udbcnpjtwhmjzpjjhoph.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=${mockKey('wrong-project')}\n`)
  assert.throws(()=>devCredentials(file),/claims invalid/)
  writeFileSync(file,`SUPABASE_URL=https://udbcnpjtwhmjzpjjhoph.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=${mockKey('udbcnpjtwhmjzpjjhoph','anon')}\n`)
  assert.throws(()=>devCredentials(file),/claims invalid/)
}finally{unlinkSync(file);rmdirSync(directory)}
const a=await exportInventoryCatalog(),b=await exportInventoryCatalog()
assert.equal(canonical(a),canonical(b),'Repeated export is deterministic')
validateManifest(a)
assert.equal(a.counts.door_styles,42);assert.equal(a.counts.door_variants,127);assert.equal(a.counts.finishes,47);assert.equal(a.counts.hardware_variants,34)
const paris=a.tables.glass_options.filter(row=>row.legacy_id==='paris'&&row.scope==='door')
assert.ok(paris.length>0);assert.ok(paris.every(row=>JSON.parse(row.notes).sourceRowPositions.length===2))
assert.ok(a.tables.glass_options.filter(row=>/\blinen\b/i.test(row.display_name)).every(row=>!row.customer_selectable&&row.renderable))
assert.equal(a.tables.frame_materials.length,2)
assert.equal(a.tables.frame_material_finishes.filter(row=>row.frame_material_id===a.tables.frame_materials.find(row=>row.frame_kind==='clad')!.id).length,6)
assert.ok(a.tables.allowed_grid_combinations.some(row=>row.width_selection_mode==='none'&&row.grid_width_id===null))
assert.ok(a.tables.sidelite_variants.some(row=>row.asset_family_alias==='smooth-steel'&&row.product_code==='SSL'))
for(const table of TABLES){assert.deepEqual(compareRows(a.tables[table],b.tables[table]),{missing:[],extra:[],changed:[]});if(a.tables[table].length)assert.equal(compareRows(a.tables[table],[]).missing.length,a.tables[table].length)}
const modified=a.tables.finishes.map(row=>({...row,display_name:'Unexpected edit'}));assert.equal(compareRows(a.tables.finishes,modified).changed.length,a.tables.finishes.length)
assert.equal(compareRows([],a.tables.finishes).extra.length,a.tables.finishes.length)
console.log(JSON.stringify({deterministic:true,foreignKeys:true,paris:true,linen:true,cladSubset:true,widthlessGrids:true,hardwareViews:true,modifiedRowsDetected:true,productionTargetRejected:true,wrongProjectCredentialRejected:true,anonymousCredentialRejected:true,counts:a.counts},null,2))
