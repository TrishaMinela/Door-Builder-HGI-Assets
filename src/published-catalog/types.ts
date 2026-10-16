/** Customer-safe Door-only contract. No admin notes, credentials or audit rows. */
export type CatalogOption = { id: string; legacyId: string; name: string; status: string; customerSelectable: boolean; displayOrder: number }
export type PublishedDoorCatalog = {
  schemaVersion: 1
  revision: { id: string; status: 'published'; publishedAt: string }
  materials: CatalogOption[]
  series: (CatalogOption & { materialId: string })[]
  grains: CatalogOption[]
  lines: (CatalogOption & { materialId: string; seriesId: string })[]
  lineGroups: CatalogOption[]
  lineGroupMembers: { groupId: string; lineId: string; displayOrder: number }[]
  styles: (CatalogOption & { code: string; description: string | null })[]
  variants: (CatalogOption & { code: string; openingCode: string; styleId: string; lineId: string; grainId: string | null; supportsGlass: boolean })[]
  bindings: { variantId: string; assetId: string; role: string; view: string; displayOrder: number }[]
  assets: { id: string; localPath: string; checksum: string | null; byteSize: number | null; mimeType: string | null; storage: { bucket: string; objectPath: string; url: string; access: 'authenticated' } | null }[]
}
