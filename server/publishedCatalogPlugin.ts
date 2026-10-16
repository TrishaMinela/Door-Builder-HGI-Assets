import type { ViteDevServer } from 'vite'
import { createCatalogHandler } from '../api/catalog'
import { readPublishedDoorCatalog } from './publishedDoorCatalog'
import { comparePublishedDoorCatalog } from './publishedDoorShadow'

export function registerPublishedCatalogShadow(server: ViteDevServer, env: Record<string, string | undefined>) {
  const options = { env: { ...env, PUBLISHED_CATALOG_READ_ENABLED: 'true' } }
  const handler = createCatalogHandler(options)
  const respond = (res: import('node:http').ServerResponse) => {
    const wrapper = { status(code: number) { res.statusCode = code; return wrapper }, json(value: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)) }, setHeader(name: string, value: string) { res.setHeader(name, value) } }
    return wrapper
  }
  server.middlewares.use(async (req, res, next) => {
    if (req.url !== '/api/catalog' && !req.url?.startsWith('/api/catalog?') && req.url !== '/__dev/published-catalog-shadow/compare') return next()
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) { res.statusCode = 403; res.end('{}'); return }
    if (req.url.startsWith('/api/catalog')) { await handler(req, respond(res)); return }
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET') { res.statusCode = 405; res.end('{}'); return }
    try { respond(res).json({ status: 'ok', ...comparePublishedDoorCatalog(await readPublishedDoorCatalog(options)) }) }
    catch { respond(res).json({ status: 'unavailable', reason: 'Published DEV shadow read unavailable; hardcoded catalog unchanged' }) }
  })
}
