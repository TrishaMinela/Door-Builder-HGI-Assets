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
import '../src/styles.css'

function Harness() {
  const [configurationType, setConfigurationType] = useState<DoorConfigurationType>('french')
  const [view, setView] = useState<HardwareView>('Exterior')
  const [withSidelite, setWithSidelite] = useState(false)
  const [mode, setMode] = useState<DoubleDoorLockPrepCode>('DDLLBO')
  const [handing, setHanding] = useState<DoorSwing['id']>('LHI')
  const swing = { id: handing, name: doorSwingDisplayName('french', { id: handing, name: '', image: '' }), image: '' }
  const style = doorStyles.find(item => item.code === '2PHD') ?? doorStyles[0]
  const finish = finishes.find(item => item.id === 'paint-white')!
  Object.assign(window, {
    captureHardware: async () => {
      const result = await captureFinalDoorPreview(document.querySelector('.preview-scene')!, { frameMode: 'visible' })
      return { dataUrl: await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(result.blob) }) }
    },
    renderHardwarePdf: () => renderPdfProduct({ style, finish, product: resolveDoorProduct(style, finish, undefined, '22-gauge-steel'), grain: null, glass: null, grid: null, hardware: hardwareOptions[0], doorSwing: swing, sidelites: 'none', doorConfigurationType: configurationType, doubleDoorLockPrep: mode }, { glass: null }),
  })
  return <><nav><button onClick={() => setView('Exterior')}>Exterior</button><button onClick={() => setView('Interior')}>Interior</button><button onClick={() => setWithSidelite(true)}>Add Sidelite</button><button onClick={() => setConfigurationType('savannah')}>Savannah</button><button onClick={() => setConfigurationType('single')}>Single</button>{(['DDLLBO', 'DDLLAC', 'DDLLKP'] as const).map(value => <button key={value} onClick={() => setMode(value)}>{value}</button>)}<button onClick={() => setHanding('LHI')}>Left Active</button><button onClick={() => setHanding('RHI')}>Right Active</button></nav><div style={{ height: 650, width: '100%', maxWidth: 900 }}><DoorPreview style={style} finish={finish} product={resolveDoorProduct(style, finish, undefined, '22-gauge-steel')} hardware={hardwareOptions[0]} doorConfigurationType={configurationType} doubleDoorLockPrep={mode} doorSwing={swing} glass={null} view={view} sidelites={withSidelite ? 'lock-side' : 'none'} sideliteAssetSrc={sideliteSlabAsset('smooth-steel', 'ssl')} sideliteMaskSrc={sideliteGlassMask('smooth-steel', 'ssl')} sideliteClearGlassBase={true} showViewToggle={false} renderConfigurationKey={`${configurationType === 'french' ? '' : `${configurationType}:`}${mode}:${handing}`}/></div></>
}
createRoot(document.getElementById('root')!).render(<Harness />)
