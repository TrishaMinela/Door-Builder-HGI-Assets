export const EXPECTED_REVISION = '1af5506c-c723-5d6d-a341-93815d0205e2'
export const EXPECTED_COMMIT = 'e06efe7ea936e20a38fa85c674c2e73697f67dc7'
export const EXPECTED_DIGEST = '70afcba51f115e28e8da96e06c8ab7142bb70355d8835abd1a820aafbecaf30c'
export type ShadowContext = { styleId?: string; lineId?: string; grain?: string | null; finishType?: string; glassId?: string; sideliteStyle?: string; hardwareId?: string }
export type Choice = { id: string; metadata: Record<string, unknown> }
export type Area = { choices: Choice[]; defaultId?: string }
export type Snapshot = Record<string, Area>
export type ShadowReport = { area: string; context: ShadowContext; hardcodedCount: number; supabaseCount: number; missingIds: string[]; extraIds: string[]; changedMetadata: string[]; changedFields: Record<string,string[]>; defaultMismatch: boolean; revisionId: string; timestamp: string; matches: boolean }
export type CatalogRow = { id: string; catalog_revision_id?: string; legacy_id?: string; display_name?: string; notes?: string | null; display_order?: number; customer_selectable?: boolean; status?: string; [key: string]: unknown }
export type DevCatalog = { revision: CatalogRow; tables: Record<string, CatalogRow[]> }
export const contextKeys = ['styleId','lineId','grain','finishType','glassId','sideliteStyle','hardwareId'] as const
export function safeContext(input: unknown): ShadowContext {
  const result: ShadowContext = {}
  if (!input || typeof input !== 'object') return result
  for (const key of contextKeys) { const value = (input as Record<string,unknown>)[key]; if (typeof value === 'string' && value.length <= 160) result[key] = value }
  return result
}
