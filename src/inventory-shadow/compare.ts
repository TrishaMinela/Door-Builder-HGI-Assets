import { EXPECTED_REVISION, type Snapshot, type ShadowContext, type ShadowReport } from './types'
export function stable(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b,'en'))) : item)
}
export function compareSnapshots(hardcoded: Snapshot, database: Snapshot, context: ShadowContext, revisionId = EXPECTED_REVISION): ShadowReport[] {
  return [...new Set([...Object.keys(hardcoded),...Object.keys(database)])].sort().map(area=>{
    const h=hardcoded[area]||{choices:[]},d=database[area]||{choices:[]}
    const hm=new Map(h.choices.map(choice=>[choice.id,choice.metadata])),dm=new Map(d.choices.map(choice=>[choice.id,choice.metadata]))
    const missingIds=[...hm.keys()].filter(id=>!dm.has(id)).sort(),extraIds=[...dm.keys()].filter(id=>!hm.has(id)).sort()
    const changedMetadata=[...hm.keys()].filter(id=>dm.has(id)&&stable(hm.get(id))!==stable(dm.get(id))).sort()
    const changedFields=Object.fromEntries(changedMetadata.map(id=>[id,[...new Set([...Object.keys(hm.get(id)!),...Object.keys(dm.get(id)!)])].filter(key=>stable(hm.get(id)![key])!==stable(dm.get(id)![key])).sort()]))
    const defaultMismatch=h.defaultId!==d.defaultId
    return {area,context,hardcodedCount:hm.size,supabaseCount:dm.size,missingIds,extraIds,changedMetadata,changedFields,defaultMismatch,revisionId,timestamp:new Date().toISOString(),matches:!missingIds.length&&!extraIds.length&&!changedMetadata.length&&!defaultMismatch}
  })
}
