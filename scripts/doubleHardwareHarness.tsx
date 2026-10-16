import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DoorPreview } from '../src/components/DoorPreview'
import { doorStyles, finishes, hardwareOptions } from '../src/data/options'
import { resolveDoorProduct } from '../src/data/productCatalog'
import type { DoorConfigurationType, DoorSwing, DoubleDoorLockPrepCode, HardwareView } from '../src/types'
import { sideliteSlabAsset, sideliteGlassMask } from '../src/data/sideliteAssets'
import { doorSwingDisplayName } from '../src/data/doorHanding'
import { renderPdfProduct } from '../src/utils/pdfProductRenderer'
import { captureFinalDoorPreview } from '../src/features/home-visualizer/captureDoorPreview'
import { ConfiguredDoorSource, type DoorSourceState } from '../src/features/home-visualizer/ConfiguredDoorSource'
import '../src/styles.css'

function Harness() {
  const [hardwareIndex, setHardwareIndex] = useState(0)
  const hardware = hardwareOptions[hardwareIndex]
  const [configurationType, setConfigurationType] = useState<DoorConfigurationType>('french')
  const [view, setView] = useState<HardwareView | 'Both'>('Exterior')
  const [aiSourceEnabled, setAiSourceEnabled] = useState(false)
  const [aiSource, setAiSource] = useState<DoorSourceState | null>(null)
  const [withSidelite, setWithSidelite] = useState(false)
  const [mode, setMode] = useState<DoubleDoorLockPrepCode>('DDLLBO')
  const [handing, setHanding] = useState<DoorSwing['id']>('LHI')
  const swing = { id: handing, name: doorSwingDisplayName('french', { id: handing, name: '', image: '' }), image: '' }
  const style = doorStyles.find(item => item.code === '2PHD') ?? doorStyles[0]
  const finish = finishes.find(item => item.id === 'paint-white')!
  const key = `${hardwareIndex ? `${hardwareIndex}:` : ''}${configurationType === 'french' ? '' : `${configurationType}:`}${mode}:${handing}`
  const previewProps = { style, finish, product: resolveDoorProduct(style, finish, undefined, '22-gauge-steel'), hardware, doorConfigurationType: configurationType, doubleDoorLockPrep: mode, doorSwing: swing, glass: null, sidelites: withSidelite ? 'lock-side' as const : 'none' as const, sideliteAssetSrc: sideliteSlabAsset('smooth-steel', 'ssl'), sideliteMaskSrc: sideliteGlassMask('smooth-steel', 'ssl'), sideliteClearGlassBase: true, showViewToggle: false }
  Object.assign(window, {
    selectHardwareIndex: setHardwareIndex,
    enableAiSource: () => setAiSourceEnabled(true),
    captureHardware: async () => {
      const result = await captureFinalDoorPreview(document.querySelector('.preview-scene')!, { frameMode: 'visible' })
      return { dataUrl: await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(result.blob) }) }
    },
    renderHardwarePdf: () => renderPdfProduct({ style, finish, product: resolveDoorProduct(style, finish, undefined, '22-gauge-steel'), grain: null, glass: null, grid: null, hardware, doorSwing: swing, sidelites: 'none', doorConfigurationType: configurationType, doubleDoorLockPrep: mode }, { glass: null }),
  })
  return <><nav><button onClick={() => setView('Exterior')}>Exterior</button><button onClick={() => setView('Interior')}>Interior</button><button onClick={() => setView('Both')}>Both</button><button onClick={() => setWithSidelite(true)}>Add Sidelite</button><button onClick={() => setConfigurationType('savannah')}>Savannah</button><button onClick={() => setConfigurationType('single')}>Single</button><button onClick={() => setConfigurationType('french')}>French</button>{(['DDLLBO', 'DDLLAC', 'DDLLKP'] as const).map(value => <button key={value} onClick={() => setMode(value)}>{value}</button>)}<button onClick={() => setHanding('LHI')}>Left Active</button><button onClick={() => setHanding('RHI')}>Right Active</button></nav><div id="hardware-live" style={{ height: 650, width: '100%', maxWidth: 900, display: 'flex' }}>{(view === 'Both' ? ['Exterior', 'Interior'] as const : [view]).map(viewpoint => <div key={viewpoint} data-viewpoint={viewpoint} style={{ flex: 1, minWidth: 0 }}><DoorPreview {...previewProps} view={viewpoint} sharedComparisonCanvas={view === 'Both'} renderConfigurationKey={key}/></div>)}</div>{aiSourceEnabled && <ConfiguredDoorSource configurationKey={`hardware-reference:${key}:${withSidelite}`} previewProps={previewProps} onStateChange={setAiSource}/>}<output data-ai-ready={aiSource?.ready ? 'true' : 'false'} data-ai-url={aiSource?.url} /></>
}
createRoot(document.getElementById('root')!).render(<Harness />)
