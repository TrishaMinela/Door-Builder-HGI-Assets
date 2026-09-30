import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HomeVisualizer } from '../src/features/home-visualizer/HomeVisualizer'
import { aiTestConfiguration as configuration } from './aiVisualizerFixture'
import '../src/styles.css'

function Harness() {
  const [showVisualizer, setShowVisualizer] = useState(true)
  return <div className="app visualizer-app">{showVisualizer ? <HomeVisualizer
    onBack={() => {}} onReturnToReview={() => setShowVisualizer(false)} configurationKey={JSON.stringify(configuration)} doorConfiguration={configuration}
    configuredDoorPreview={{ ...configuration, applyFinish: true, tintColor: configuration.finish.color, jambFinish: configuration.finish }}
  /> : <button type="button" onClick={() => setShowVisualizer(true)}>Reopen Visualizer</button>}</div>
}

createRoot(document.getElementById('root')!).render(<Harness />)
