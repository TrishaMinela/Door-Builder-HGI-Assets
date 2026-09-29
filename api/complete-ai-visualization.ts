import { createHash } from 'node:crypto'

type ApiRequest = { method?: string; body?: unknown }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_VISUALIZATION_DURATION_MS = 10 * 60 * 1000

function objectValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ ok: false })
    return
  }

  const source = objectValue(request.body)
  const requestId = typeof source?.request_id === 'string' ? source.request_id : ''
  const completionToken = typeof source?.completion_token === 'string' ? source.completion_token : ''
  const duration = source?.total_visualization_duration_ms
  if (!UUID_PATTERN.test(requestId) || !UUID_PATTERN.test(completionToken) || !Number.isSafeInteger(duration) || (duration as number) < 1 || (duration as number) > MAX_VISUALIZATION_DURATION_MS) {
    response.status(400).json({ ok: false })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[ai-usage:completion-failed]', { request_id: requestId, reason: 'supabase_not_configured' })
    response.status(503).json({ ok: false })
    return
  }

  const tokenHash = createHash('sha256').update(completionToken).digest('hex')
  const query = new URLSearchParams({
    request_id: `eq.${requestId}`,
    completion_token_hash: `eq.${tokenHash}`,
    status: 'eq.succeeded',
    total_visualization_duration_ms: 'is.null',
  })
  try {
    const update = await fetch(`${supabaseUrl}/rest/v1/ai_generation_usage?${query}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ total_visualization_duration_ms: duration, completion_token_hash: null }),
    })
    const updated = update.ok ? await update.json().catch(() => []) as unknown[] : []
    if (!update.ok || updated.length !== 1) {
      console.error('[ai-usage:completion-failed]', { request_id: requestId, status: update.status, matched: updated.length })
      response.status(update.ok ? 409 : 502).json({ ok: false })
      return
    }
    response.status(200).json({ ok: true })
  } catch (error) {
    console.error('[ai-usage:completion-failed]', { request_id: requestId, reason: error instanceof Error ? error.name : 'unknown_error' })
    response.status(502).json({ ok: false })
  }
}
