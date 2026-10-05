import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DoorPreview } from '../src/components/DoorPreview'
import { ConfiguredDoorSource, type DoorSourceState } from '../src/features/home-visualizer/ConfiguredDoorSource'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { finishes } from '../src/data/options'
import { prepareAiConfiguredProductReference } from '../src/features/home-visualizer/aiVisualization'
import '../src/styles.css'
Object.assign(window, { prepareJambReference: prepareAiConfiguredProductReference })

function Harness() {
  const [color, setColor] = useState('paint-white')
  const [source, setSource] = useState<DoorSourceState | null>(null)
  const jambFinish = finishes.find(item => item.id === color)!
  const props = { ...aiTestConfiguration, applyFinish: true, jambFinish }
  return <>{['paint-white', 'paint-brown', 'paint-black', 'stain-midnight-blue'].map(id => <button key={id} onClick={() => setColor(id)}>{id} jamb</button>)}<div style={{ height: 650 }}><DoorPreview {...props} renderConfigurationKey={color}/></div><ConfiguredDoorSource configurationKey={color} previewProps={props} onStateChange={setSource} includeConfiguredFrame/>{source?.ready && <img data-reference={color} src={source.url} alt="Configured reference"/>}</>
}
createRoot(document.getElementById('root')!).render(<Harness />)
