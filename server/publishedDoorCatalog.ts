import type { CatalogOption, PublishedDoorCatalog } from '../src/published-catalog/types.js'

export const PUBLISHED_CATALOG_DEV_ORIGIN = 'https://udbcnpjtwhmjzpjjhoph.supabase.co'
export const PUBLISHED_CATALOG_BUCKET = 'door-catalog-assets'
export class PublishedCatalogUnavailable extends Error {}
type Row = Record<string, unknown>
type Environment = Record<string, string | undefined>
export type CatalogReaderOptions = { env?: Environment; fetcher?: typeof fetch; timeoutMs?: number }
const factFields = 'id,catalog_revision_id,legacy_id,display_name,status,customer_selectable,display_order'
const columns: Record<string, string> = {
  materials: factFields, series: `${factFields},material_id`, grains: factFields,
  door_lines: `${factFields},material_id,series_id`, door_line_groups: factFields,
  door_line_group_members: 'id,catalog_revision_id,door_line_group_id,door_line_id,display_order',
  door_styles: `${factFields},product_code,description`,
  door_variants: `${factFields},door_style_id,door_line_id,grain_id,product_code,opening_code,supports_glass`,
  door_variant_assets: 'id,catalog_revision_id,door_variant_id,asset_id,role,view_key,display_order',
  assets: 'id,catalog_revision_id,current_path,checksum,byte_size,mime_type,storage_bucket,storage_object_path',
}
function string(row: Row, field: string): string {
  if (typeof row[field] !== 'string' || !(row[field] as string).length) throw new PublishedCatalogUnavailable('Invalid published catalog field')
  return row[field] as string
}
function order(row: Row): number {
  if (!Number.isInteger(row.display_order)) throw new PublishedCatalogUnavailable('Invalid published order')
  return row.display_order as number
}
function option(row: Row): CatalogOption {
  if (typeof row.customer_selectable !== 'boolean') throw new PublishedCatalogUnavailable('Invalid published visibility')
  return { id: string(row, 'id'), legacyId: string(row, 'legacy_id'), name: string(row, 'display_name'), status: string(row, 'status'), customerSelectable: row.customer_selectable, displayOrder: order(row) }
}
function requireIds(rows: { id: string }[]) {
  const ids = new Set(rows.map(row => row.id))
  if (ids.size !== rows.length) throw new PublishedCatalogUnavailable('Duplicate published identifiers')
  return (id: string) => { if (!ids.has(id)) throw new PublishedCatalogUnavailable('Broken published relationship'); return id }
}

/** GET-only, allowlisted DEV connection. No filesystem, importer or admin RPCs. */
export async function readPublishedDoorCatalog({ env = process.env, fetcher = fetch, timeoutMs = 15000 }: CatalogReaderOptions = {}): Promise<PublishedDoorCatalog> {
  if (env.SUPABASE_URL?.replace(/\/$/, '') !== PUBLISHED_CATALOG_DEV_ORIGIN) throw new PublishedCatalogUnavailable('Published catalog DEV target unavailable')
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new PublishedCatalogUnavailable('Published catalog server credential unavailable')
  // JWT project/role checks catch misconfigured local credentials before reads.
  if (key.split('.').length === 3) {
    let claims: Row
    try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()) } catch { throw new PublishedCatalogUnavailable('Invalid catalog credential') }
    if (claims.ref !== 'udbcnpjtwhmjzpjjhoph' || claims.role !== 'service_role' || typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) throw new PublishedCatalogUnavailable('Invalid catalog credential')
  }
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs)
  async function get(table: string, query: Record<string, string>): Promise<Row[]> {
    const response = await fetcher(`${PUBLISHED_CATALOG_DEV_ORIGIN}/rest/v1/${table}?${new URLSearchParams(query)}`, {
      method: 'GET', redirect: 'error', headers: { apikey: key!, Authorization: `Bearer ${key}` }, signal: controller.signal,
    })
    if (!response.ok) throw new PublishedCatalogUnavailable('Published catalog read unavailable')
    const rows: unknown = await response.json()
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object')) throw new PublishedCatalogUnavailable('Invalid published catalog response')
    return rows as Row[]
  }
  const publication = () => get('catalog_revisions', { select: 'id,status,published_at', status: 'eq.published', limit: '2' })
  try {
    const revisions = await publication()
    if (revisions.length !== 1 || revisions[0].status !== 'published' || !revisions[0].published_at) throw new PublishedCatalogUnavailable('Current publication unavailable or ambiguous')
    const revision = revisions[0], revisionId = string(revision, 'id')
    if (!/^[0-9a-f-]{36}$/.test(revisionId)) throw new PublishedCatalogUnavailable('Invalid published revision')
    const tables: Record<string, Row[]> = {}
    // Explicit table/column allowlist. Every data page is pinned to publication.
    async function readTable(table: string) {
      const rows: Row[] = []
      for (let offset = 0; ; offset += 500) {
        if (offset >= 10000) throw new PublishedCatalogUnavailable('Published catalog limit exceeded')
        const page = await get(table, { select: columns[table], catalog_revision_id: `eq.${revisionId}`, order: 'id', limit: '500', offset: String(offset) })
        if (page.some(row => row.catalog_revision_id !== revisionId)) throw new PublishedCatalogUnavailable('Cross-revision published data refused')
        rows.push(...page)
        if (page.length < 500) break
      }
      tables[table] = rows
    }
    const tableNames = Object.keys(columns)
    for (let index = 0; index < tableNames.length; index += 4) await Promise.all(tableNames.slice(index, index + 4).map(readTable))
    const facts = (table: string) => tables[table].map(option).sort((a, b) => a.displayOrder - b.displayOrder || a.legacyId.localeCompare(b.legacyId))
    const materials = facts('materials'), grains = facts('grains'), lineGroups = facts('door_line_groups')
    const materialId = requireIds(materials), grainId = requireIds(grains), groupId = requireIds(lineGroups)
    const series = tables.series.map(row => ({ ...option(row), materialId: materialId(string(row, 'material_id')) }))
    const seriesId = requireIds(series)
    const lines = tables.door_lines.map(row => ({ ...option(row), materialId: materialId(string(row, 'material_id')), seriesId: seriesId(string(row, 'series_id')) }))
    const lineId = requireIds(lines)
    const styles = tables.door_styles.map(row => ({ ...option(row), code: string(row, 'product_code'), description: typeof row.description === 'string' ? row.description : null }))
    const styleId = requireIds(styles)
    const variants = tables.door_variants.map(row => ({ ...option(row), code: string(row, 'product_code'), openingCode: string(row, 'opening_code'), styleId: styleId(string(row, 'door_style_id')), lineId: lineId(string(row, 'door_line_id')), grainId: row.grain_id === null ? null : grainId(string(row, 'grain_id')), supportsGlass: row.supports_glass === true }))
    const variantId = requireIds(variants)
    const referenced = new Set(tables.door_variant_assets.map(row => string(row, 'asset_id')))
    const assets = tables.assets.filter(row => referenced.has(string(row, 'id'))).map(row => {
      const bucket = row.storage_bucket, objectPath = row.storage_object_path
      if ((bucket === null) !== (objectPath === null)) throw new PublishedCatalogUnavailable('Incomplete published Storage mapping')
      if (bucket !== null && (bucket !== PUBLISHED_CATALOG_BUCKET || typeof objectPath !== 'string' || !/^revisions\/[0-9a-f-]{36}\//.test(objectPath) || objectPath.includes('\\') || objectPath.split('/').some(segment => !segment || segment === '.' || segment === '..'))) throw new PublishedCatalogUnavailable('Invalid published Storage mapping')
      return { id: string(row, 'id'), localPath: string(row, 'current_path'), checksum: typeof row.checksum === 'string' ? row.checksum : null, byteSize: typeof row.byte_size === 'number' ? row.byte_size : null, mimeType: typeof row.mime_type === 'string' ? row.mime_type : null, storage: bucket === null ? null : { bucket: bucket as string, objectPath: objectPath as string, url: `${PUBLISHED_CATALOG_DEV_ORIGIN}/storage/v1/object/authenticated/${bucket}/${(objectPath as string).split('/').map(encodeURIComponent).join('/')}`, access: 'authenticated' as const } }
    })
    // Published revisions can share immutable older objects. Never leak an
    // object located under a draft revision, even if a binding were malformed.
    const externalScopes = [...new Set(assets.flatMap(asset => asset.storage ? [asset.storage.objectPath.split('/')[1]] : []))].filter(id => id !== revisionId)
    if (externalScopes.length) {
      const sources = await get('catalog_revisions', { select: 'id,status', id: `in.(${externalScopes.join(',')})`, status: 'in.(published,retired)' })
      if (externalScopes.some(id => !sources.some(row => row.id === id && ['published', 'retired'].includes(String(row.status))))) throw new PublishedCatalogUnavailable('Unpublished Storage source refused')
    }
    const assetId = requireIds(assets)
    const bindings = tables.door_variant_assets.map(row => ({ variantId: variantId(string(row, 'door_variant_id')), assetId: assetId(string(row, 'asset_id')), role: string(row, 'role'), view: typeof row.view_key === 'string' ? row.view_key : '', displayOrder: order(row) }))
    const lineGroupMembers = tables.door_line_group_members.map(row => ({ groupId: groupId(string(row, 'door_line_group_id')), lineId: lineId(string(row, 'door_line_id')), displayOrder: order(row) }))
    const after = await publication()
    if (after.length !== 1 || after[0].id !== revisionId || after[0].status !== 'published' || after[0].published_at !== revision.published_at) throw new PublishedCatalogUnavailable('Publication changed during read')
    const sorted = <T extends { displayOrder: number }>(rows: T[]) => rows.sort((a, b) => a.displayOrder - b.displayOrder)
    return { schemaVersion: 1, revision: { id: revisionId, status: 'published', publishedAt: string(revision, 'published_at') }, materials, series: sorted(series), grains, lines: sorted(lines), lineGroups, lineGroupMembers: sorted(lineGroupMembers), styles: sorted(styles), variants: sorted(variants), assets, bindings: sorted(bindings) }
  } finally { clearTimeout(timer) }
}
