import assert from 'node:assert/strict'
import { aiTestConfiguration } from './aiVisualizerFixture'
import { evaluateEntranceCompatibility, getDetectedVisualizerOpeningFamily, getSelectedVisualizerOpeningFamily, type DetectedDoorStructure, type DetectedSidelites, type EntranceDetection, type VisualizerOpeningFamily } from '../src/features/home-visualizer/entranceFitStrategy'

const sideForConfiguration = { none: 'none', left: 'hinge-side', right: 'lock-side', both: 'both-sides' } as const

function detection(doorStructure: DetectedDoorStructure, sidelites: DetectedSidelites, overrides: Partial<EntranceDetection> = {}): EntranceDetection {
  const left = sidelites === 'left' || sidelites === 'both'
  const right = sidelites === 'right' || sidelites === 'both'
  return {
    doorStructure,
    leftSidelitePresent: left,
    rightSidelitePresent: right,
    leftSidelite: { present: left, confidence: .96, evidence: '', region: null },
    rightSidelite: { present: right, confidence: .96, evidence: '', region: null },
    sidelites,
    transom: false,
    mainDoorRegion: null,
    transomRegion: null,
    widthClass: 'standard',
    approximateWidthRatio: null,
    structurallyWide: doorStructure === 'double' || sidelites !== 'none',
    confidence: .96,
    summary: '',
    ...overrides,
  }
}

function configuration(door: 'single' | 'french' | 'savannah', sidelites: keyof typeof sideForConfiguration) {
  return { ...aiTestConfiguration, doorConfigurationType: door, sidelites: sideForConfiguration[sidelites] }
}

const familyCases: Array<[DetectedDoorStructure, DetectedSidelites, VisualizerOpeningFamily]> = [
  ['single', 'none', 'A'],
  ['single', 'left', 'B'],
  ['single', 'right', 'B'],
  ['single', 'both', 'C'],
  ['double', 'none', 'C'],
  ['double', 'left', 'D'],
  ['double', 'right', 'D'],
  ['double', 'both', 'E'],
]

for (const [door, sidelites, family] of familyCases) assert.equal(getDetectedVisualizerOpeningFamily(detection(door, sidelites)), family)
assert.equal(getSelectedVisualizerOpeningFamily(configuration('single', 'none')), 'A')
assert.equal(getSelectedVisualizerOpeningFamily(configuration('single', 'left')), 'B')
assert.equal(getSelectedVisualizerOpeningFamily(configuration('single', 'right')), 'B')
assert.equal(getSelectedVisualizerOpeningFamily(configuration('single', 'both')), 'C')
assert.equal(getSelectedVisualizerOpeningFamily(configuration('french', 'none')), 'C')
assert.equal(getSelectedVisualizerOpeningFamily(configuration('savannah', 'left')), 'D')
assert.equal(getSelectedVisualizerOpeningFamily(configuration('french', 'right')), 'D')
assert.equal(getSelectedVisualizerOpeningFamily(configuration('savannah', 'both')), 'E')

const cases: Array<[string, EntranceDetection, ReturnType<typeof configuration>, 'good-fit' | 'incompatible']> = [
  ['A1', detection('single', 'none'), configuration('single', 'none'), 'good-fit'],
  ['A2', detection('single', 'none'), configuration('single', 'left'), 'incompatible'],
  ['A3', detection('single', 'none'), configuration('french', 'none'), 'incompatible'],
  ['B1', detection('single', 'left'), configuration('single', 'right'), 'good-fit'],
  ['B2', detection('single', 'right'), configuration('single', 'left'), 'good-fit'],
  ['B3', detection('single', 'left'), configuration('single', 'none'), 'incompatible'],
  ['B4', detection('single', 'right'), configuration('single', 'both'), 'incompatible'],
  ['B5', detection('single', 'left'), configuration('french', 'none'), 'incompatible'],
  ['C1', detection('single', 'both'), configuration('french', 'none'), 'good-fit'],
  ['C2', detection('double', 'none'), configuration('single', 'both'), 'good-fit'],
  ['C3', detection('single', 'both'), configuration('single', 'both'), 'good-fit'],
  ['C4', detection('double', 'none'), configuration('savannah', 'none'), 'good-fit'],
  ['C5', detection('double', 'none'), configuration('single', 'none'), 'incompatible'],
  ['D1', detection('double', 'left'), configuration('french', 'right'), 'good-fit'],
  ['D2', detection('double', 'right'), configuration('savannah', 'left'), 'good-fit'],
  ['D3', detection('double', 'left'), configuration('french', 'none'), 'incompatible'],
  ['D4', detection('double', 'right'), configuration('french', 'both'), 'incompatible'],
  ['E1', detection('double', 'both'), configuration('savannah', 'both'), 'good-fit'],
  ['E2', detection('double', 'both'), configuration('french', 'left'), 'incompatible'],
  ['E3', detection('double', 'both'), configuration('french', 'none'), 'incompatible'],
]

for (const [name, detected, selected, expected] of cases) assert.equal(evaluateEntranceCompatibility(detected, selected)?.status, expected, name)
assert.equal(evaluateEntranceCompatibility(detection('single', 'right', { transom: true }), configuration('single', 'left'))?.status, 'good-fit', 'transoms do not affect family')
assert.equal(evaluateEntranceCompatibility(detection('single', 'none', { confidence: .4 }), configuration('single', 'none')), null, 'low-confidence detection remains unknown')
assert.equal(evaluateEntranceCompatibility(detection('single', 'both', { sideliteConfidenceLow: true }), configuration('french', 'none')), null, 'uncertain sidelites do not force a family')

console.info(`Entrance compatibility checks passed (${cases.length} explicit matrix cases).`)
