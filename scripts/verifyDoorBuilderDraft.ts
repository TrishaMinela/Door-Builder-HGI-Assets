import assert from 'node:assert/strict'
import {
  DOOR_BUILDER_DRAFT_KEY,
  clearDoorBuilderDraft,
  isDoorBuilderDraftVisualizerReady,
  loadDoorBuilderDraft,
  saveDoorBuilderDraft,
  type DoorBuilderDraftConfiguration,
} from '../src/utils/doorBuilderDraft'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

const storage = new MemoryStorage()
const configuration: DoorBuilderDraftConfiguration = {
  selectedDoorConfigurationType: 'french', styleId: 'style-1', doorLineId: 'line-1', grainId: 'smooth',
  sidelites: 'both-sides', sideliteStyleId: 'fsl', sideliteGlassCategory: 'clear', sideliteGlassId: 'clear-low-e',
  sideliteGlassGroupKey: 'clear', sideliteGlassVariantConfirmed: true, sideliteGridLocation: 'internal',
  sideliteGridStyle: 'standard', sideliteGridPattern: 'colonial', sideliteGridColor: 'white', sideliteGridWidth: 'wide',
  selectedFinishType: 'paint', selectedPaint: 'paint-black', selectedStain: '', jambType: 'clad',
  jambFinishType: 'clad', jambFinishColor: 'paint-black', jambFinishOverridden: true,
  selectedGlassCategory: 'clear', glassId: 'clear-low-e', selectedGlassGroupKey: 'clear', glassVariantConfirmed: true,
  glassFrameColorMode: 'match-door', glassFrameFinishId: '', glassFrameFinishType: 'paint', gridPathId: 'internal',
  gridStyle: 'standard', gridPattern: 'colonial', gridColor: 'white', gridWidth: 'wide', hardwareId: 'hardware-1',
  doubleDoorLockPrep: 'DDLLBO', doorSwingId: 'left-inswing',
}

saveDoorBuilderDraft(configuration, storage)
assert.deepEqual(loadDoorBuilderDraft(storage), configuration, 'saved configuration should restore exactly')
assert.deepEqual(loadDoorBuilderDraft(storage), configuration, 'the same storage should restore after a simulated reopen')
assert.equal(isDoorBuilderDraftVisualizerReady(configuration, true), true, 'a complete, runtime-valid restored configuration should be visualizer-ready')
assert.equal(isDoorBuilderDraftVisualizerReady({ ...configuration, hardwareId: '' }, true), false, 'an incomplete restored configuration must not expose the visualizer shortcut')
assert.equal(isDoorBuilderDraftVisualizerReady(configuration, false), false, 'a draft referencing unavailable runtime catalog options must not be visualizer-ready')

const savedEnvelope = JSON.parse(storage.getItem(DOOR_BUILDER_DRAFT_KEY) ?? '{}')
savedEnvelope.configuration.contact = { email: 'should-not-restore@example.com' }
savedEnvelope.configuration.uploadedPhoto = 'data:image/jpeg;base64,secret'
storage.setItem(DOOR_BUILDER_DRAFT_KEY, JSON.stringify(savedEnvelope))
const restored = loadDoorBuilderDraft(storage) as unknown as Record<string, unknown>
assert.equal('contact' in restored, false, 'unrecognized personal fields must be discarded')
assert.equal('uploadedPhoto' in restored, false, 'unrecognized photo fields must be discarded')

clearDoorBuilderDraft(storage)
assert.equal(storage.getItem(DOOR_BUILDER_DRAFT_KEY), null, 'reset should remove the saved draft')

storage.setItem(DOOR_BUILDER_DRAFT_KEY, '{not-json')
assert.equal(loadDoorBuilderDraft(storage), null, 'malformed JSON should safely fall back')
assert.equal(isDoorBuilderDraftVisualizerReady(loadDoorBuilderDraft(storage), true), false, 'corrupt storage must not be visualizer-ready')
storage.setItem(DOOR_BUILDER_DRAFT_KEY, JSON.stringify({ version: 999, configuration }))
assert.equal(loadDoorBuilderDraft(storage), null, 'incompatible versions should safely fall back')
assert.equal(isDoorBuilderDraftVisualizerReady(loadDoorBuilderDraft(storage), true), false, 'outdated drafts must not be visualizer-ready')

console.log('Door Builder draft persistence checks passed.')
