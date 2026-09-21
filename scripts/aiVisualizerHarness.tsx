import React from 'react'
import { createRoot } from 'react-dom/client'
import { HomeVisualizer } from '../src/features/home-visualizer/HomeVisualizer'
import { aiTestConfiguration as configuration } from './aiVisualizerFixture'
import '../src/styles.css'

createRoot(document.getElementById('root')!).render(<div className="app visualizer-app"><HomeVisualizer
  onBack={() => {}} configurationKey={JSON.stringify(configuration)} doorConfiguration={configuration}
  configuredDoorPreview={{ ...configuration, applyFinish: true, tintColor: configuration.finish.color, jambFinish: configuration.finish }}
/></div>)
