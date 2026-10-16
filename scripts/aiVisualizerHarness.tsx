import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HomeVisualizer } from '../src/features/home-visualizer/HomeVisualizer'
import { aiTestConfiguration as configuration } from './aiVisualizerFixture'
import { finishes } from '../src/data/options'
import '../src/styles.css'

function Harness() {
  const [current, setCurrent] = useState(configuration)
  const [active, setActive] = useState(true)
  return <div className="app visualizer-app"><button onClick={() => setActive(value => !value)}>Toggle test visualizer</button><button onClick={() => setCurrent({ ...configuration, finish: finishes.find(item => item.id === 'paint-white')! })}>Change test configuration</button><HomeVisualizer active={active}
    onBack={() => {}} configurationKey={JSON.stringify(current)} doorConfiguration={current}
    configuredDoorPreview={{ ...current, applyFinish: true, tintColor: current.finish.color, jambFinish: current.finish }}
  /></div>
}
createRoot(document.getElementById('root')!).render(<Harness />)
