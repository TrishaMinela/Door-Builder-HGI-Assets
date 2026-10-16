import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DoorPreview } from '../src/components/DoorPreview'
import { doorStyles, finishes, hardwareOptions, glassOptions } from '../src/data/options'
import { resolveDoorProduct } from '../src/data/productCatalog'
import type { DoorConfigurationType, DoorSwing, DoubleDoorLockPrepCode, HardwareView } from '../src/types'
import { sideliteSlabAsset, sideliteGlassMask } from '../src/data/sideliteAssets'
import { doorSwingDisplayName } from '../src/data/doorHanding'
import { renderPdfProduct } from '../src/utils/pdfProductRenderer'
import { captureFinalDoorPreview } from '../src/features/home-visualizer/captureDoorPreview'
import { ConfiguredDoorSource, type DoorSourceState } from '../src/features/home-visualizer/ConfiguredDoorSource'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import '../src/styles.css'

function Harness() {
  const [hardwareIndex, setHardwareIndex] = useState(0)
  const hardware = hardwareOptions[hardwareIndex]
  const [configurationType, setConfigurationType] = useState<DoorConfigurationType>('french')
  const [view, setView] = useState<HardwareView | 'Both'>('Exterior')
  const [aiSourceEnabled, setAiSourceEnabled] = useState(false)
  const [aiSource, setAiSource] = useState<DoorSourceState | null>(null)
  const [withSidelite, setWithSidelite] = useState(false)
  const [glazed, setGlazed] = useState(false)
  const [mode, setMode] = useState<DoubleDoorLockPrepCode>('DDLLBO')
  const [handing, setHanding] = useState<DoorSwing['id']>('LHI')
  const swing = { id: handing, name: doorSwingDisplayName('french', { id: handing, name: '', image: '' }), image: '' }
  const style = doorStyles.find(item => item.code === (glazed ? 'F' : '2PHD')) ?? doorStyles[0]
  const finish = finishes.find(item => item.id === (glazed ? 'paint-clay' : 'paint-white'))!
  const glass = glazed ? glassOptions.find(item => item.id === 'bay-point')! : null
  const key = `${glazed ? 'glazed:' : ''}${hardwareIndex ? `${hardwareIndex}:` : ''}${configurationType === 'french' ? '' : `${configurationType}:`}${mode}:${handing}`
  const previewProps = { style, finish, product: resolveDoorProduct(style, finish, undefined, '22-gauge-steel'), hardware, doorConfigurationType: configurationType, doubleDoorLockPrep: mode, doorSwing: swing, glass, sidelites: withSidelite ? 'lock-side' as const : 'none' as const, sideliteAssetSrc: sideliteSlabAsset('smooth-steel', 'ssl'), sideliteMaskSrc: sideliteGlassMask('smooth-steel', 'ssl'), sideliteClearGlassBase: true, showViewToggle: false }
  Object.assign(window, {
    selectHardwareIndex: setHardwareIndex,
    selectHanding: setHanding,
    selectGlazedFixture: () => setGlazed(true),
    hardwareConfiguration: () => JSON.stringify({ ...previewProps, grain: null, grid: null }),
    hardwareSubmission: () => buildDoorBuilderSubmissionPayload({ submittedAt: '2026-10-17T00:00:00Z', contact: { fullName: 'Test Fixture', email: 'fixture@example.com', phone: '5555555555', zip: '46741', notes: '' }, configuration: { ...previewProps, grain: null, grid: null } }),
    enableAiSource: () => setAiSourceEnabled(true),
    captureHardware: async () => {
      const result = await captureFinalDoorPreview(document.querySelector('.preview-scene')!, { frameMode: 'visible' })
      return { dataUrl: await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(result.blob) }) }
    },
    renderHardwarePdf: () => renderPdfProduct({ ...previewProps, grain: null, grid: null }, previewProps),
  })
  return <><nav><button onClick={() => setView('Exterior')}>Exterior</button><button onClick={() => setView('Interior')}>Interior</button><button onClick={() => setView('Both')}>Both</button><button onClick={() => setWithSidelite(true)}>Add Sidelite</button><button onClick={() => setConfigurationType('savannah')}>Savannah</button><button onClick={() => setConfigurationType('single')}>Single</button><button onClick={() => setConfigurationType('french')}>French</button>{(['DDLLBO', 'DDLLAC', 'DDLLKP'] as const).map(value => <button key={value} onClick={() => setMode(value)}>{value}</button>)}<button onClick={() => setHanding('LHI')}>Left Active</button><button onClick={() => setHanding('RHI')}>Right Active</button></nav><div id="hardware-live" style={{ height: 650, width: '100%', maxWidth: 900, display: 'flex' }}>{(view === 'Both' ? ['Exterior', 'Interior'] as const : [view]).map(viewpoint => <div key={viewpoint} data-viewpoint={viewpoint} style={{ flex: 1, minWidth: 0 }}><DoorPreview {...previewProps} view={viewpoint} sharedComparisonCanvas={view === 'Both'} renderConfigurationKey={key}/></div>)}</div>{aiSourceEnabled && <ConfiguredDoorSource configurationKey={`hardware-reference:${key}:${withSidelite}`} previewProps={previewProps} onStateChange={setAiSource}/>}<output data-ai-ready={aiSource?.ready ? 'true' : 'false'} data-ai-url={aiSource?.url} /></>
}
createRoot(document.getElementById('root')!).render(<Harness />)
