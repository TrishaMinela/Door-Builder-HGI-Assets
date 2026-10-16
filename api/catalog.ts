import { readPublishedDoorCatalog, type CatalogReaderOptions } from '../server/publishedDoorCatalog.js'

type Request = { method?: string; url?: string }
type Response = { status: (code: number) => Response; json: (value: unknown) => void; setHeader: (name: string, value: string) => void }
export function createCatalogHandler(options: CatalogReaderOptions = {}) {
  return async (request: Request, response: Response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    // Explicit server opt-in. Customer runtime never depends on this route.
    if ((options.env ?? process.env).PUBLISHED_CATALOG_READ_ENABLED !== 'true') { response.status(404).json({ error: 'Catalog read unavailable' }); return }
    if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); response.status(405).json({ error: 'Method not allowed' }); return }
    if (request.url?.includes('?')) { response.status(400).json({ error: 'Only the current publication can be requested' }); return }
    try { response.status(200).json(await readPublishedDoorCatalog(options)) }
    catch { response.status(503).json({ error: 'Published catalog temporarily unavailable' }) }
  }
}
export default createCatalogHandler()
