import assert from 'node:assert/strict'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { detectionForManualStructure, detectedEntranceStructure, evaluateEntranceCompatibility, getDetectedVisualizerOpeningFamily, getSelectedVisualizerOpeningFamily, type DetectedSidelites } from '../src/features/home-visualizer/entranceFitStrategy'
import type { DoorConfiguration } from '../src/types'

// A–E compatibility only; generation and analysis retain the restored baseline.
let checked = 0
const sidelites: DetectedSidelites[] = ['none', 'left', 'right', 'both']
for (const existingDoor of ['single', 'double'] as const) {
  for (const existingSides of sidelites) {
    for (const selectedDoor of ['single', 'french'] as const) {
      for (const selectedSides of sidelites) {
        const configuration = { ...aiTestConfiguration, doorConfigurationType: selectedDoor, sidelites: selectedSides === 'none' ? 'none' : selectedSides === 'both' ? 'both-sides' : selectedSides === 'left' ? 'hinge-side' : 'lock-side' } as DoorConfiguration
        const detection = { ...detectionForManualStructure(existingDoor), sidelites: existingSides }
        const result = evaluateEntranceCompatibility(detection, configuration)!
        const doorMismatch = existingDoor !== (selectedDoor === 'single' ? 'single' : 'double')
        const sideliteMismatch = existingSides !== selectedSides
        const compatible = getDetectedVisualizerOpeningFamily(detection) === getSelectedVisualizerOpeningFamily(configuration)
        assert.equal(result.status, compatible ? 'good-fit' : doorMismatch && sideliteMismatch ? 'not-recommended' : 'caution')
        checked++
      }
    }
  }
}
const detected = detectionForManualStructure('single')
assert.equal(detectedEntranceStructure({ ...detected, confidence: .64 }), 'unknown')
assert.equal(evaluateEntranceCompatibility({ ...detected, confidence: .64 }, aiTestConfiguration), null)
assert.equal(detectedEntranceStructure({ ...detected, confidence: .65 }), 'single')
assert.equal(evaluateEntranceCompatibility({ ...detected, transom: true }, aiTestConfiguration)!.status, 'good-fit')
console.log(`A–E compatibility: ${checked} structure combinations and confidence/transom safeguards passed.`)
