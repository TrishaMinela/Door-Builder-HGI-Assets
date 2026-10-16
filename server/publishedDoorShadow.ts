/** DEV-only diagnostics. Not imported by api/catalog or production components. */
import type { PublishedDoorCatalog } from '../src/published-catalog/types'
import type { Snapshot, Choice } from '../src/inventory-shadow/types'
import { compareSnapshots } from '../src/inventory-shadow/compare'
import { hardcodedSnapshot } from './inventoryShadowSemantics'
import { catalogDoorStyles, productCatalog, doorLineChoices, glassDoorCodes } from '../src/data/productCatalog'

const choice = (id: string, metadata: Record<string, unknown>): Choice => ({ id, metadata })
export function comparePublishedDoorCatalog(catalog: PublishedDoorCatalog) {
  const expected: Snapshot = {}, actual: Snapshot = {}
  const remoteLine = new Map(catalog.lines.map(row => [row.id, row]))
  const remoteStyle = new Map(catalog.styles.map(row => [row.id, row]))
  const remoteGrain = new Map(catalog.grains.map(row => [row.id, row]))
  const remoteMaterial = new Map(catalog.materials.map(row => [row.id, row]))
  const remoteSeries = new Map(catalog.series.map(row => [row.id, row]))
  const remoteGroup = new Map(catalog.lineGroups.map(row => [row.id, row]))
  const remoteAsset = new Map(catalog.assets.map(row => [row.id, row]))
  const remoteVariant = new Map(catalog.variants.map(row => [row.id, row]))
  const facts = (rows: { legacyId: string; name: string; status: string; customerSelectable: boolean; displayOrder: number }[]) => rows.map(row => choice(row.legacyId, { name: row.name, status: row.status, customerSelectable: row.customerSelectable, displayOrder: row.displayOrder }))
  const active = (row: { status: string; customerSelectable: boolean }) => row.status === 'active' && row.customerSelectable
  const sourceFact = (legacyId: string, name: string, displayOrder: number) => ({ legacyId, name, status: 'active', customerSelectable: true, displayOrder })
  expected.styles = { choices: catalogDoorStyles.map((style, index) => choice(style.id, { ...facts([sourceFact(style.id, style.name, index)])[0].metadata, code: style.code, description: style.description })) }
  actual.styles = { choices: catalog.styles.map(style => choice(style.legacyId, { ...facts([style])[0].metadata, code: style.code, description: style.description })) }
  expected.materials = { choices: facts([sourceFact('steel', 'Steel', 0), sourceFact('fiberglass', 'Fiberglass', 1)]) }
  actual.materials = { choices: facts(catalog.materials) }
  const grains = [...new Set(productCatalog.flatMap(line => line.grains))]
  expected.grains = { choices: facts(grains.map((grain, index) => sourceFact(grain, grain, index))) }
  actual.grains = { choices: facts(catalog.grains) }
  expected.groups = { choices: facts(doorLineChoices.map((group, index) => sourceFact(group.id, group.name, index))) }
  actual.groups = { choices: facts(catalog.lineGroups) }
  expected.series = { choices: doorLineChoices.map((group, index) => choice(group.id, { ...facts([sourceFact(group.id, group.name, index)])[0].metadata, material: group.lineIds[0].includes('steel') ? 'steel' : 'fiberglass' })) }
  actual.series = { choices: catalog.series.map(series => choice(series.legacyId, { ...facts([series])[0].metadata, material: remoteMaterial.get(series.materialId)!.legacyId })) }
  expected.lines = { choices: productCatalog.map((line, index) => choice(line.id, { ...facts([sourceFact(line.id, line.name, index)])[0].metadata, material: line.id.includes('steel') ? 'steel' : 'fiberglass', series: doorLineChoices.find(group => group.lineIds.includes(line.id))!.id })) }
  actual.lines = { choices: catalog.lines.map(line => choice(line.legacyId, { ...facts([line])[0].metadata, material: remoteMaterial.get(line.materialId)!.legacyId, series: remoteSeries.get(line.seriesId)!.legacyId })) }
  expected.groupMembers = { choices: productCatalog.map((line, index) => choice(line.id, { group: doorLineChoices.find(group => group.lineIds.includes(line.id))!.id, displayOrder: index })) }
  actual.groupMembers = { choices: catalog.lineGroupMembers.map(member => choice(remoteLine.get(member.lineId)!.legacyId, { group: remoteGroup.get(member.groupId)!.legacyId, displayOrder: member.displayOrder })) }
  const expectedVariants: Choice[] = [], expectedAssets: Choice[] = []
  for (const style of catalogDoorStyles) for (const variant of style.variants) {
    const line = productCatalog.find(line => line.id === variant.lineId)!, group = doorLineChoices.find(group => group.lineIds.includes(line.id))!
    const id = `${style.id}:${line.id}`, grain = line.grains[0] ?? null
    expectedVariants.push(choice(id, { ...facts([sourceFact(id, style.name, expectedVariants.length)])[0].metadata, style: style.id, line: line.id, grain, code: variant.code, openingCode: variant.code, supportsGlass: glassDoorCodes.has(variant.code) }))
    const snapshot = hardcodedSnapshot({ styleId: style.id, lineId: group.id, grain })
    for (const asset of snapshot.assetBindings.choices.filter(row => String(row.metadata.role).startsWith('door:'))) {
      const { role, view, order, path } = asset.metadata
      expectedAssets.push(choice(`${id}|${role}|${view}|${order}|${path}`, { path, role: String(role).slice(5), view, order }))
    }
  }
  expected.variants = { choices: expectedVariants }
  actual.variants = { choices: catalog.variants.map(variant => choice(variant.legacyId, { ...facts([variant])[0].metadata, style: remoteStyle.get(variant.styleId)!.legacyId, line: remoteLine.get(variant.lineId)!.legacyId, grain: variant.grainId ? remoteGrain.get(variant.grainId)!.legacyId : null, code: variant.code, openingCode: variant.openingCode, supportsGlass: variant.supportsGlass })) }
  expected.assets = { choices: expectedAssets }
  actual.assets = { choices: catalog.bindings.map(binding => {
    const id = remoteVariant.get(binding.variantId)!.legacyId, path = remoteAsset.get(binding.assetId)!.localPath
    return choice(`${id}|door:${binding.role}|${binding.view}|${binding.displayOrder}|${path}`, { path, role: binding.role, view: binding.view, order: binding.displayOrder })
  }) }
  for (const style of catalogDoorStyles) {
    const key = `materialsForStyle:${style.id}`, publishedStyle = catalog.styles.find(row => row.legacyId === style.id)
    expected[key] = { choices: hardcodedSnapshot({ styleId: style.id }).doorLineChoices.choices.map(row => choice(row.id, { name: row.metadata.name, lineIds: row.metadata.lineIds })) }
    actual[key] = { choices: catalog.lineGroups.filter(group => active(group) && catalog.lineGroupMembers.some(member => member.groupId === group.id && catalog.variants.some(variant => variant.styleId === publishedStyle?.id && variant.lineId === member.lineId && active(variant)))).map(group => choice(group.legacyId, { name: group.name, lineIds: catalog.lineGroupMembers.filter(member => member.groupId === group.id).map(member => remoteLine.get(member.lineId)!.legacyId).sort() })) }
    const grainKey = `signatureGrainsForStyle:${style.id}`
    expected[grainKey] = { choices: [...new Set(style.variants.filter(variant => variant.lineId.startsWith('signature-')).flatMap(variant => variant.grains))].map(grain => choice(grain, {})) }
    actual[grainKey] = { choices: [...new Set(catalog.variants.filter(variant => variant.styleId === publishedStyle?.id && active(variant) && remoteLine.get(variant.lineId)!.legacyId.startsWith('signature-')).flatMap(variant => variant.grainId ? [remoteGrain.get(variant.grainId)!.legacyId] : []))].map(grain => choice(grain, {})) }
  }
  // Reuse Phase 4's semantic snapshots for availability. Initial browsing is a
  // separate global 42-style check above: later material/grain filters must not
  // become authority for that first screen.
  const contexts = [{ lineId: undefined as string | undefined, grain: null as string | null }, ...doorLineChoices.flatMap(group => group.id === 'signature-series'
    ? [...new Set(productCatalog.filter(line => group.lineIds.includes(line.id)).flatMap(line => line.grains))].map(grain => ({ lineId: group.id, grain }))
    : [{ lineId: group.id, grain: group.autoGrain ?? null }])]
  for (const context of contexts) {
    const key = `availability:${context.lineId ?? 'all'}/${context.grain ?? ''}`
    expected[key] = hardcodedSnapshot(context).stylesForMaterial
    const group = catalog.lineGroups.find(group => group.legacyId === context.lineId)
    const lines = new Set(catalog.lineGroupMembers.filter(member => member.groupId === group?.id).map(member => member.lineId))
    actual[key] = { choices: catalog.styles.filter(style => active(style) && catalog.variants.some(variant => variant.styleId === style.id && active(variant) && (!group || lines.has(variant.lineId) && (!context.grain || remoteGrain.get(variant.grainId ?? '')?.legacyId === context.grain || variant.grainId === null)))).map(style => choice(style.legacyId, { name: style.name, code: style.code })) }
  }
  const reports = compareSnapshots(expected, actual, {}, catalog.revision.id)
  const comparisons = reports.reduce((sum, report) => sum + report.hardcodedCount + report.extraIds.length, 0)
  const mismatches = reports.reduce((sum, report) => sum + report.missingIds.length + report.extraIds.length + report.changedMetadata.length + Number(report.defaultMismatch), 0)
  return { revisionId: catalog.revision.id, counts: { styles: catalog.styles.length, variants: catalog.variants.length, assets: catalog.assets.length, storageAssets: catalog.assets.filter(asset => asset.storage).length, bindings: catalog.bindings.length }, areas: reports.length, comparisons, matches: comparisons - mismatches, mismatches, reports }
}
