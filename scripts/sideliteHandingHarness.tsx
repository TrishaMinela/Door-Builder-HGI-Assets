import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DoorPreview } from '../src/components/DoorPreview'
import { ConfiguredDoorSource, type DoorSourceState } from '../src/features/home-visualizer/ConfiguredDoorSource'
import { renderPdfProduct } from '../src/utils/pdfProductRenderer'
import { resolveDoorProduct } from '../src/data/productCatalog'
import { sideliteSlabAsset, sideliteGlassMask } from '../src/data/sideliteAssets'
import { doorStyles, finishes, hardwareOptions } from '../src/data/options'
import type { DoorConfiguration, DoorSwing, SideliteConfiguration } from '../src/types'
import '../src/styles.css'

function Harness() {
  const [relationship, setRelationship] = useState<SideliteConfiguration>('hinge-side')
  const [handing, setHanding] = useState<DoorSwing['id'] | null>(null)
  const [source, setSource] = useState<DoorSourceState | null>(null)
  const style = doorStyles.find(item => item.code === 'F1')!
  const finish = finishes.find(item => item.id === 'paint-black')!
  const hardware = hardwareOptions.find(item => item.style === 'Georgian Knob with Deadbolt' && item.finish === 'Matte Black')!
  const configuration: DoorConfiguration = { style, finish, product: resolveDoorProduct(style, finish, undefined, '20-gauge-smooth-steel'), grain: null, hardware, glass: null, grid: null, doorSwing: { id: handing ?? 'LHI', name: handing ?? 'LHI', image: '' }, sidelites: relationship, sideliteSlab: 'ssl', doorConfigurationType: 'single', jambType: 'timber', jambFinishType: 'paint', jambFinishColor: 'White' }
  const props = { ...configuration, doorSwing: handing ? configuration.doorSwing : null, jambFinish: finishes.find(item => item.id === 'paint-white')!, applyFinish: true, showViewToggle: false, sideliteAssetSrc: sideliteSlabAsset('smooth-steel', 'ssl'), sideliteMaskSrc: sideliteGlassMask('smooth-steel', 'ssl') }
  const key = `${relationship}:${handing}`
  Object.assign(window, { renderHandingPdf: () => renderPdfProduct(configuration, props) })
  return <><nav>{(['none', 'both-sides', 'hinge-side', 'lock-side'] as const).map(value => <button key={value} onClick={() => setRelationship(value)}>{value}</button>)}{(['LHI', 'LHO', 'RHI', 'RHO'] as const).map(value => <button key={value} onClick={() => setHanding(value)}>{value}</button>)}</nav><div style={{ display: 'flex', height: 650 }}><div data-test-view="Exterior" style={{ flex: 1 }}><DoorPreview {...props} view="Exterior" renderConfigurationKey={key}/></div><div data-test-view="Interior" style={{ flex: 1 }}><DoorPreview {...props} view="Interior" renderConfigurationKey={key}/></div></div><ConfiguredDoorSource configurationKey={key} previewProps={props} onStateChange={setSource}/>{source?.ready && <img data-capture={key} src={source.url} alt="Captured configured entrance"/>}</>
}
createRoot(document.getElementById('root')!).render(<Harness />)
