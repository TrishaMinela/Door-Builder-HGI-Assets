import assert from 'node:assert/strict'
import { readDevShadowCatalog } from '../server/inventoryShadowReader'
import { normalizeCleanupTables, cleanupDigest } from './inventory/normalizeCleanup'
import { exportInventoryCatalog } from './exportInventoryCatalog'
import { validateManifest } from './importInventoryCatalog'
import { EXPECTED_CLEANUP_DIGEST } from '../src/inventory-shadow/cleanupPin'

const catalog=await readDevShadowCatalog(30000),normalized=normalizeCleanupTables(catalog.tables,catalog.revision.id)
assert.equal(cleanupDigest(normalized),EXPECTED_CLEANUP_DIGEST)
assert.equal(cleanupDigest(normalizeCleanupTables(normalized,catalog.revision.id)),EXPECTED_CLEANUP_DIGEST,'Normalization is idempotent')
assert.equal(normalized.finishes.length,47)
assert.equal(normalized.finish_assets.length,21)
assert.equal(normalized.assets.length,919)
assert.equal(normalized.allowed_grid_combinations.length,384)
assert.equal(normalized.grid_combination_locations.length,386)
assert.equal(normalized.grid_combination_coatings.length,578)
assert.equal(normalized.allowed_grid_combinations.filter(r=>r.pattern_selection_mode==='none').length,28)
assert.equal(normalized.allowed_grid_combinations.filter(r=>r.pattern_selection_mode==='implicit').length,18)
assert.equal(normalized.allowed_grid_combinations.filter(r=>r.width_selection_mode==='none'&&r.grid_width_id===null).length,22)
assert.ok(normalized.allowed_grid_combinations.every(r=>!JSON.parse(r.notes).contexts))
for(const binding of normalized.finish_assets)assert.equal(normalized.finishes.find(f=>f.id===binding.finish_id)?.finish_type,'stain')
const bad=structuredClone(catalog.tables)
bad.allowed_grid_combinations[0].width_selection_mode='none';bad.allowed_grid_combinations[0].grid_width_id='invalid-width'
assert.throws(()=>normalizeCleanupTables(bad,catalog.revision.id),/Invalid width/)
const manifest=await exportInventoryCatalog('HEAD',{workingTree:true})
validateManifest(manifest)
assert.equal(manifest.tables.finish_assets.length,21)
assert.equal(manifest.tables.assets.length,919)
assert.equal(manifest.tables.grid_combination_locations.length,386)
assert.equal(manifest.tables.grid_combination_coatings.length,578)
assert.ok(manifest.tables.finishes.every(f=>f.finish_type!=='paint'||JSON.parse(f.notes).source.image===''))
const wrong=structuredClone(manifest);wrong.tables.grid_combination_locations=[]
assert.throws(()=>validateManifest(wrong),/explicit grid location/)
console.log(JSON.stringify({dataSource:'READ-ONLY PLAN + IN-MEMORY WORKING-TREE EXPORT; NO DATABASE WRITES',idempotent:true,manifestValid:true,paintBindings:0,stainBindings:21,combinations:384,locations:386,coatings:578,noPatternPrairie:28,implicitPrairie:18,noWidth:22,passed:true},null,2))
