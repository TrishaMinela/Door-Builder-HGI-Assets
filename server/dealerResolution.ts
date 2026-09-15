import { isValidDealerSlug, normalizeDealerSlug } from '../src/utils/dealerSlug'

declare const process: { env: Record<string, string | undefined> }

type DealerRow = { id: string; is_active: boolean }

export class DealerResolutionError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 502, message: string) {
    super(message)
  }
}

function supabaseCredentials() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new DealerResolutionError(502, 'Dealer lookup is unavailable.')
  return { supabaseUrl, serviceRoleKey }
}

export async function resolveDealerId(dealerSlug: unknown): Promise<string | null> {
  if (dealerSlug === undefined || dealerSlug === null || dealerSlug === '') return null
  if (typeof dealerSlug !== 'string') throw new DealerResolutionError(400, 'This dealer link is unavailable.')

  const slug = normalizeDealerSlug(dealerSlug)
  if (!isValidDealerSlug(slug)) throw new DealerResolutionError(400, 'This dealer link is unavailable.')

  const { supabaseUrl, serviceRoleKey } = supabaseCredentials()
  const query = new URLSearchParams({ select: 'id,is_active', slug: `eq.${slug}`, limit: '2' })
  const result = await fetch(`${supabaseUrl}/rest/v1/dealers?${query}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  })
  if (!result.ok) throw new DealerResolutionError(502, 'Dealer lookup is unavailable.')

  const dealers = await result.json() as DealerRow[]
  if (dealers.length !== 1) throw new DealerResolutionError(404, 'This dealer link is unavailable.')
  if (!dealers[0].is_active) throw new DealerResolutionError(403, 'This dealer link is unavailable.')
  return dealers[0].id
}
