import assert from 'node:assert/strict'
import { isCustomerSelectableGlass, isHiddenDecorativeGlass } from '../src/data/customerGlassAvailability'
import { glassOptions } from '../src/data/glassOptions'
import { fslGlassOptions } from '../src/data/fslGlass'
import { f48slGlassOptions } from '../src/data/f48slGlass'
import { sslGlassOptions } from '../src/data/sslGlass'

for (const [name, catalog] of [['Main door', glassOptions], ['FSL', fslGlassOptions], ['F48SL', f48slGlassOptions], ['SSL', sslGlassOptions]] as const) {
  const linen = catalog.filter(option => /\blinen\b/i.test(option.name))
  assert.ok(linen.length > 0, `${name} legacy Linen data is retained`)
  const visible = catalog.filter(isCustomerSelectableGlass)
  const hidden = catalog.filter(isHiddenDecorativeGlass)
  assert.equal(visible.length, catalog.length - linen.length - hidden.length)
  assert.ok(visible.every(option => !/\blinen\b/i.test(option.name)))
  assert.ok(linen.every(option => !visible.includes(option)))
  assert.ok(hidden.every(option => !visible.includes(option)))
  assert.ok(isCustomerSelectableGlass({ id: 'bri', name: 'Bristol' }))
  console.log(`${name}: Linen and ${hidden.length} unapproved decorative options hidden; ${visible.length} others unchanged; legacy catalog retained.`)
}
