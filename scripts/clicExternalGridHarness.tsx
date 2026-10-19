import React from 'react'
import { createRoot } from 'react-dom/client'
import { DoorPreview } from '../src/components/DoorPreview'
import { ConfiguredDoorSource, type DoorSourceState } from '../src/features/home-visualizer/ConfiguredDoorSource'
import { doorStyles, finishes, glassOptions, hardwareOptions } from '../src/data/options'
import { resolveDoorProduct } from '../src/data/productCatalog'
import { externalGridArtwork } from '../src/data/externalGridArtwork'
import { renderPdfProduct } from '../src/utils/pdfProductRenderer'
import type { DoorConfiguration, GridPattern } from '../src/types'
import '../src/styles.css'

const root = createRoot(document.getElementById('root')!)
const blobData = (blob: Blob) => new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob) })
async function renderCase(code: string, lites: number, kind: 'clic' | 'clear' | 'approved-contoured', finishId: string) {
  const style = doorStyles.find(item => item.code === code)!
  const finish = finishes.find(item => item.id === finishId)!
  const variant = finish.finishType === 'stain' ? style.variants.find(item => item.lineId.startsWith('signature-'))! : style.variants.find(item => item.lineId === '20-gauge-smooth-steel')!
  const grain = finish.finishType === 'stain' ? variant.grains[0] : null
  const product = resolveDoorProduct(style, finish, grain ?? undefined, variant.lineId)
  const family = code === 'F482' || code === 'F48' ? 'f48' : code.toLowerCase()
  const pattern = `${lites} Lite` as GridPattern
  const ordinary = glassOptions.find(item => item.id === `${family}-clear-grids`)!
  const referenceOverlay = kind === 'approved-contoured' ? '/assets/hgi-assets/Glass/F48/CLEAR STOCK/F48F1248WH.webp' : externalGridArtwork(code, pattern)!
  const glass = kind === 'clic' ? glassOptions.find(item => item.id === `${family}-clic-ext-${lites}l`)!
    : { ...ordinary, overlaysByDoorStyle: { ...ordinary.overlaysByDoorStyle, [code]: referenceOverlay } }
  const expectedOverlay = glass.overlaysByDoorStyle[code]
  const key = `${code}-${lites}-${kind}-${finishId}`
  const configuration: DoorConfiguration = { doorConfigurationType: 'single', product, style, grain, finish, glass, mainDoorGlass: glass, grid: kind === 'clear' ? { gridLocation: 'External', gridPattern: pattern, glassCoating: 'Low-E' } : null, hardware: hardwareOptions[0], doorSwing: { id: 'LHI', name: 'Left Hand Inswing', image: '' }, sidelites: 'none' }
  const props = { style, finish, glass, product, grain, hardware: hardwareOptions[0], doorSwing: configuration.doorSwing, gridMatchesFinish: false, glassFrameFinish: finishes.find(item => item.id === 'paint-white')!, jambFinish: finish }
  let source: DoorSourceState | undefined
  let ready = false
  root.render(<React.Fragment key={key}><div className="pair-preview" style={{ width: 320, height: 650, position: 'relative', background: '#fff', margin: 'auto' }}><DoorPreview {...props} view="Exterior" showViewToggle={false} renderConfigurationKey={key} onRenderReadinessChange={state => { ready = state.ready }} /></div><ConfiguredDoorSource configurationKey={key} previewProps={props} onStateChange={state => { source = state }} /></React.Fragment>)
  const end = Date.now() + 40000
  while ((!ready || !source?.ready) && Date.now() < end) { if (source?.error) throw new Error(`${source.error} ${key}; scenes=${[...document.querySelectorAll('.preview-scene')].map(element => element.getAttribute('data-render-semantically-ready'))}; failed=${[...document.images].filter(image => !image.naturalWidth).map(image => image.src)}`); await new Promise(resolve => setTimeout(resolve, 40)) }
  if (!ready || !source?.ready) throw new Error(`Capture readiness timed out: ${key}`)
  const ai = await blobData(await (await fetch(source.url)).blob())
  const pdf = await renderPdfProduct(configuration, props)
  return { ai, pdf: pdf.dataUrl, assets: pdf.assets, expectedOverlay, orderingCodes: glass.orderingCodes }
}
Object.assign(window, { renderExternalGridCase: renderCase })
