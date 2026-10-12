import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { sideliteAssetFamilyForSlab, sideliteSlabAsset, sideliteGlassMask, sideliteStylesForFamily } from '../src/data/sideliteAssets'

const smooth = sideliteAssetFamilyForSlab({ doorLineId: '20-gauge-smooth-steel' })
const textured = sideliteAssetFamilyForSlab({ doorLineId: 'textured-fiberglass' })
assert.equal(smooth, 'smooth-steel')
assert.equal(textured, '22-gauge')
assert.equal(sideliteSlabAsset(smooth, 'ssl'), '/assets/hgi-assets/Sidelites/20 Gauge/SSL.webp')
assert.equal(sideliteSlabAsset(textured, 'ssl'), '/assets/hgi-assets/Sidelites/Signature/Oak/SSL.webp')
assert.equal(sideliteSlabAsset('oak', 'ssl'), sideliteSlabAsset(textured, 'ssl'))
assert.deepEqual(sideliteStylesForFamily(smooth), ['fsl', 'f48sl', 'ssl', 's2sl'], 'Compatibility and ordering remain unchanged')
for (const [id, filename] of [['fsl', 'FSL'], ['f48sl', 'F48SL'], ['s2sl', 'S2SL']] as const) {
  assert.equal(sideliteSlabAsset(smooth, id), `/assets/hgi-assets/Sidelites/20 Gauge/${filename}.webp`)
}
const source = `public${sideliteSlabAsset(smooth, 'ssl')}`
const mask = `public${sideliteGlassMask(smooth, 'ssl')}`
const slabMetadata = await sharp(source).metadata(), maskMetadata = await sharp(mask).metadata()
assert.equal(slabMetadata.width, maskMetadata.width)
assert.equal(slabMetadata.height, maskMetadata.height)
assert.deepEqual([slabMetadata.width, slabMetadata.height], [80, 549])
assert.notDeepEqual(await readFile(source), await readFile(`public${sideliteSlabAsset(textured, 'ssl')}`))
console.log('Sidelite material assets passed: dedicated smooth SSL; other Smooth Steel bindings and option order unchanged; Textured Fiberglass/Signature Oak remain textured; existing glass mask dimensions match.')
