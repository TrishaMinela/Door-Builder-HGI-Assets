import { createHash } from 'node:crypto'

export const CLEANUP_VERSION = 'pre-phase5-v1'
export const GRID_TABLES = ['grid_locations', 'grid_combination_locations', 'grid_combination_coatings'] as const
type Row = { id: string; [key: string]: any }
const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item)
const uuid = (key: string) => {
  const h = createHash('md5').update(key).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
const notes = (row: Row) => JSON.parse(row.notes || '{}')
export const coatingMembers: Record<string, string[]> = {
  'Standard / No Low-E': ['Standard / No Low-E'], 'Low-E': ['Low-E'], 'Low-E Plus': ['Low-E Plus'], 'ODL Clear': ['ODL Clear'],
  'Standard / No Low-E or Low-E': ['Standard / No Low-E', 'Low-E'],
  'Low-E or Low-E Plus': ['Low-E', 'Low-E Plus'],
  'Standard / No Low-E, Low-E or Low-E Plus': ['Standard / No Low-E', 'Low-E', 'Low-E Plus'],
}

/** Pure, deterministic draft/manifest transformation. Never makes database requests. */
export function normalizeCleanupTables(input: Record<string, Record<string, unknown>[]>, revision: string) {
  const t = structuredClone(input) as Record<string, Row[]>
  const byId = new Map(Object.values(t).flat().map(r => [r.id, r]))
  const row = (table: string, key: string, fields: Record<string, unknown>): Row => ({ id: uuid(`${revision}:${table}:${key}`), catalog_revision_id: revision, ...fields })
  const paint = new Set(t.finishes.filter(r => r.finish_type === 'paint').map(r => r.id))
  const paintAssets = new Set(t.finish_assets.filter(r => paint.has(r.finish_id)).map(r => r.asset_id))
  t.finish_assets = t.finish_assets.filter(r => !paint.has(r.finish_id))
  const usedAssets = new Set(Object.entries(t).filter(([name]) => name.endsWith('_assets')).flatMap(([, rows]) => rows.map(r => r.asset_id)))
  t.assets = t.assets.filter(r => !paintAssets.has(r.id) || usedAssets.has(r.id))
  for (const finish of t.finishes.filter(r => paint.has(r.id))) {
    const meta = notes(finish)
    if (meta.source) meta.source.image = ''
    finish.notes = canonical(meta)
  }
  t.grid_locations = ['external', 'internal', 'sdl'].map((key, index) => row('grid_locations', key, { legacy_id: key, display_name: key === 'sdl' ? 'SDL Grids' : key === 'external' ? 'External Grids' : 'Internal Grids', display_order: index }))
  t.grid_combination_locations = []
  t.grid_combination_coatings = []
  for (const coating of t.glass_coatings) coating.coating_kind = ({ 'Standard / No Low-E': 'standard', 'Low-E': 'low_e', 'Low-E Plus': 'low_e_plus', 'ODL Clear': 'odl_clear' } as Record<string, string>)[coating.legacy_id] ?? null
  for (const pattern of t.grid_patterns) {
    const match = /^(\d+) Lite(?: (Horizontal))?$/.exec(pattern.legacy_id)
    pattern.lite_count = match ? Number(match[1]) : null
    pattern.orientation = match?.[2] ? 'horizontal' : null
    if (pattern.legacy_id === '__no_pattern_selection__') pattern.status = 'legacy_only'
  }
  for (const color of t.grid_colors) {
    color.primary_hex_color = color.legacy_id === 'Bronze/White' ? '#6f4b32' : color.hex_color
    color.secondary_hex_color = color.legacy_id === 'Bronze/White' ? '#f4f4ef' : null
  }
  for (const combo of t.allowed_grid_combinations) {
    const pattern = byId.get(combo.grid_pattern_id)
    const profile = byId.get(combo.grid_profile_id)
    const glass = byId.get(combo.glass_option_id)
    const meta = notes(combo)
    const priorContexts = meta.contexts ?? input.grid_combination_locations?.filter(r => r.grid_combination_id === combo.id).map(r => ({ location: input.grid_locations?.find(l => l.id === r.grid_location_id)?.legacy_id }))
    if (!priorContexts?.length) throw new Error(`Grid context missing: ${combo.id}`)
    combo.pattern_selection_mode = pattern?.legacy_id === '__no_pattern_selection__' || combo.grid_pattern_id === null ? 'none' : profile?.legacy_id === 'Prairie' && glass?.scope === 'sidelite' ? 'implicit' : 'selectable'
    if (combo.pattern_selection_mode === 'none') combo.grid_pattern_id = null
    if ((combo.width_selection_mode === 'none') !== (combo.grid_width_id === null)) throw new Error(`Invalid width semantics: ${combo.id}`)
    for (const context of priorContexts) {
      const location = t.grid_locations.find(r => r.legacy_id === context.location)
      if (!location) throw new Error(`Unknown grid location: ${context.location}`)
      t.grid_combination_locations.push(row('grid_combination_locations', `${combo.id}:${context.location}`, { grid_combination_id: combo.id, grid_location_id: location.id }))
    }
    const oldCoating = byId.get(combo.glass_coating_id)?.legacy_id
    if (!coatingMembers[oldCoating]) throw new Error(`Unknown coating eligibility: ${oldCoating}`)
    for (const name of coatingMembers[oldCoating]) {
      const coating = t.glass_coatings.find(r => r.legacy_id === name)
      if (!coating) throw new Error(`Missing atomic coating: ${name}`)
      t.grid_combination_coatings.push(row('grid_combination_coatings', `${combo.id}:${name}`, { grid_combination_id: combo.id, glass_coating_id: coating.id }))
    }
    delete meta.contexts
    combo.notes = canonical(meta)
  }
  for (const binding of t.grid_combination_assets) {
    const location = t.grid_locations.find(r => r.legacy_id === binding.view_key)
    if (!location) throw new Error(`Grid artwork context missing: ${binding.id}`)
    binding.grid_location_id = location.id
  }
  for (const rows of Object.values(t)) rows.sort((a, b) => a.id.localeCompare(b.id, 'en'))
  return t
}

/** Pin structured eligibility and finish bindings, excluding server timestamps/provenance. */
export const cleanupColumns: Record<string, string[]> = {
    finishes: ['id', 'legacy_id', 'display_name', 'finish_type', 'hex_color', 'status', 'customer_selectable', 'display_order', 'notes'],
    finish_assets: ['id', 'finish_id', 'asset_id', 'role', 'display_order'],
    grid_patterns: ['id', 'legacy_id', 'lite_count', 'orientation', 'status', 'customer_selectable'],
    grid_colors: ['id', 'legacy_id', 'primary_hex_color', 'secondary_hex_color'],
    glass_coatings: ['id', 'legacy_id', 'coating_kind'],
    allowed_grid_combinations: ['id', 'glass_option_id', 'grid_profile_id', 'grid_pattern_id', 'pattern_selection_mode', 'grid_color_id', 'grid_width_id', 'width_selection_mode', 'glass_coating_id', 'customer_selectable', 'display_order', 'notes'],
    grid_locations: ['id', 'legacy_id', 'display_name', 'display_order'],
    grid_combination_locations: ['id', 'grid_combination_id', 'grid_location_id'],
    grid_combination_coatings: ['id', 'grid_combination_id', 'glass_coating_id'],
    grid_combination_assets: ['id', 'grid_combination_id', 'asset_id', 'grid_location_id', 'role', 'view_key', 'display_order'],
}
export function cleanupDigest(t: Record<string, Row[]>) {
  return createHash('sha256').update(canonical(Object.fromEntries(Object.entries(cleanupColumns).map(([name, keys]) => [name, [...(t[name]??[])].sort((a, b) => a.id.localeCompare(b.id, 'en')).map(r => Object.fromEntries(keys.map(k => [k, k==='notes'?JSON.parse(r[k]||'{}'):r[k] ?? null])))])))).digest('hex')
}
