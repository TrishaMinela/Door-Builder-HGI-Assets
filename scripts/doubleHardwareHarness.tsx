import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DoorPreview } from '../src/components/DoorPreview'
import { doorStyles, finishes, hardwareOptions } from '../src/data/options'
import { resolveDoorProduct } from '../src/data/productCatalog'
import type { DoubleDoorLockPrepCode } from '../src/types'
import { renderPdfProduct } from '../src/utils/pdfProductRenderer'
import { captureFinalDoorPreview } from '../src/features/home-visualizer/captureDoorPreview'
import '../src/styles.css'

function Harness() {
  const [mode, setMode] = useState<DoubleDoorLockPrepCode>('DDLLBO')
  const style = doorStyles.find(item => item.code === '2PHD') ?? doorStyles[0]
  const finish = finishes.find(item => item.id === 'paint-white')!
  Object.assign(window, {
    captureHardware: async () => {
      const result = await captureFinalDoorPreview(document.querySelector('.preview-scene')!, { frameMode: 'visible' })
      return { dataUrl: await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(result.blob) }) }
    },
    renderHardwarePdf: () => renderPdfProduct({ style, finish, product: resolveDoorProduct(style, finish, undefined, '22-gauge-steel'), grain: null, glass: null, grid: null, hardware: hardwareOptions[0], doorSwing: { id: 'LHI', name: 'Left Hand Inswing', image: '' }, sidelites: 'none', doorConfigurationType: 'french', doubleDoorLockPrep: mode }, { glass: null }),
  })
  return <><nav>{(['DDLLBO', 'DDLLAC', 'DDLLKP'] as const).map(value => <button key={value} onClick={() => setMode(value)}>{value}</button>)}</nav><div style={{ height: 650, width: '100%', maxWidth: 900 }}><DoorPreview style={style} finish={finish} product={resolveDoorProduct(style, finish, undefined, '22-gauge-steel')} hardware={hardwareOptions[0]} doorConfigurationType="french" doubleDoorLockPrep={mode} doorSwing={{ id: 'LHI', name: 'Left Hand Inswing', image: '' }} glass={null} view="Exterior" showViewToggle={false} renderConfigurationKey={mode}/></div></>
}
createRoot(document.getElementById('root')!).render(<Harness />)
