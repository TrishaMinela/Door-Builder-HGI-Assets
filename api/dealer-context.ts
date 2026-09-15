import { DealerResolutionError, resolveDealerId } from '../server/dealerResolution'

type ApiRequest = { method?: string; query?: Record<string, string | string[] | undefined> }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Content-Type', 'application/json')
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const slug = Array.isArray(request.query?.slug) ? request.query?.slug[0] : request.query?.slug
  try {
    await resolveDealerId(slug)
    response.status(200).json({ available: true })
  } catch (error) {
    const status = error instanceof DealerResolutionError ? error.status : 502
    response.status(status).json({ error: status === 502 ? 'Dealer lookup is unavailable.' : 'This dealer link is unavailable.' })
  }
}
