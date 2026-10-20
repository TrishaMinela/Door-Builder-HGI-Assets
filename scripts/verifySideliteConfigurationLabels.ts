import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { sideliteConfigurationDisplayName, sideliteStyleDisplayName } from '../src/data/productDisplayNames'
import { sidelitePlacement, sideliteProductCode, sideliteProductLabel } from '../src/data/sideliteConfigurations'
import { buildDoorBuilderSubmissionPayload } from '../src/utils/submission'
import { aiTestConfiguration } from './aiVisualizerFixture'

assert.equal(sideliteStyleDisplayName('FSL'), 'Full Sidelite')
assert.equal(sideliteConfigurationDisplayName('right', 'LHI', 'single', 'ssl'), 'Right - Half Sidelite')
assert.equal(sideliteConfigurationDisplayName('left', 'LHI', 'single', 'fsl'), 'Left - Full Sidelite')
assert.equal(sideliteConfigurationDisplayName('both-sides', 'LHI', 'single', 'ssl'), 'Both sides - Half Sidelite')
assert.equal(sideliteConfigurationDisplayName('none', 'LHI', 'single', 'ssl'), 'None', 'Ignore retained style when no sidelites are enabled')
assert.equal(sideliteConfigurationDisplayName('right', 'LHI', 'single', 'Future readable style'), 'Right - Future readable style', 'Use the selected name, not a fixed style')
assert.equal(sideliteConfigurationDisplayName('left', 'LHI', 'single'), 'Left', 'Do not invent a missing selection')

let checked = 0
for (const type of ['single', 'french', 'savannah'] as const) for (const swing of ['LHI', 'RHI', 'LHO', 'RHO'] as const) {
  for (const side of ['left', 'right', 'both-sides', 'none', 'hinge-side', 'lock-side'] as const) {
    for (const style of ['ssl', 'fsl', 'f48sl', 's2sl', 'cr14sl'] as const) {
      const position = sidelitePlacement(side, swing, type)
      const prefix = position === 'both' ? 'Both sides' : position === 'none' ? 'None' : position === 'left' ? 'Left' : 'Right'
      assert.equal(sideliteConfigurationDisplayName(side, swing, type, style), position === 'none' ? 'None' : `${prefix} - ${sideliteStyleDisplayName(style)}`)
      const configuration = { ...aiTestConfiguration, doorConfigurationType: type, doorSwing: { ...aiTestConfiguration.doorSwing, id: swing }, sidelites: side, sideliteSlab: style, sideliteStyle: style.toUpperCase() }
      const input = { contact: { fullName: 'Label Test', email: '', phone: '', zip: '', notes: '' }, configuration, submittedAt: '2026-10-20T00:00:00.000Z' }
      const before = buildDoorBuilderSubmissionPayload(input)
      const after = buildDoorBuilderSubmissionPayload({ ...input, configuration: { ...configuration, sideliteConfigurationLabel: sideliteConfigurationDisplayName(side, swing, type, style) } })
      assert.deepEqual(after, before, 'Customer label must not change any submission field')
      if (type === 'single' && (position === 'left' || position === 'right')) {
        assert.equal(after.sidelite_placement, sideliteProductLabel(side, swing, type))
        assert.ok(after.sidelite_placement.startsWith(sideliteProductCode(side, swing, type)))
      }
      checked++
    }
  }
}
const app = readFileSync('src/App.tsx', 'utf8')
const pdf = readFileSync('src/utils/pdf.ts', 'utf8')
assert.equal((app.match(/sideliteConfigurationDisplayName\([^\n]+selectedSideliteStyle\?\.id\)/g) ?? []).length, 2, 'Summary and configuration use the shared formatter with the selected style')
assert.equal((pdf.match(/sideliteConfigurationDisplayName\(sidelites, doorSwing.id, doorConfigurationType, sideliteStyle\)/g) ?? []).length, 2, 'Both PDF paths use the same selected style formatter')
console.log(`PASS: ${checked} sidelite labels and unchanged submission payloads; left/right/both/none, all swings/entry types, aliases, selected names, summary and both PDF call paths.`)
