import React from 'react'
import { createRoot } from 'react-dom/client'
import { DoorPreview } from '../src/components/DoorPreview'
import { doorStyles, finishes, glassOptions, hardwareOptions } from '../src/data/options'
import { resolveDoorProduct } from '../src/data/productCatalog'
import { sideliteAssetFamilyForSlab, sideliteSlabAsset, sideliteGlassMask } from '../src/data/sideliteAssets'
import { fslGlassOptions } from '../src/data/fslGlass'
import '../src/styles.css'

const brown = finishes.find(item => item.id === 'paint-brown')!
const white = finishes.find(item => item.id === 'paint-white')!
const fixtures = [['F', 'f-clear-no-grids'], ['F48', 'f48-clear-no-grids'], ['S', 's-clear-no-grids'], ['HRT', 'hrt-clear-s11rt'], ['SAT', 'sat-clear-nonstock']]
createRoot(document.getElementById('root')!).render(<div style={{ width: '100%', maxWidth: 1000, margin: 'auto' }}>{fixtures.map(([code, glassId]) => {
  const style = doorStyles.find(item => item.code === code)!
  const family = sideliteAssetFamilyForSlab({ doorLineId: '22-gauge-steel', doorStyleCode: code, grain: null })
  const glass = fslGlassOptions.find(item => item.asset)!
  return <section key={code} data-fixture={code} style={{ width: '100%', height: 650, position: 'relative', overflow: 'hidden', background: '#eee' }}>
    <DoorPreview style={style} finish={brown} hardware={hardwareOptions[0]} product={resolveDoorProduct(style, brown, undefined, '22-gauge-steel')} glass={glassOptions.find(item => item.id === glassId) ?? null} glassFrameFinish={white} jambFinish={white} sidelites={code === 'F' ? 'both-sides' : 'none'} sideliteAssetSrc={sideliteSlabAsset(family, 'fsl')} sideliteMaskSrc={sideliteGlassMask(family, 'fsl')} sideliteGlassSrc={glass.asset} sideliteClearGlassBase view="Exterior" showViewToggle={false} renderConfigurationKey={code} />
  </section>
})}</div>)
