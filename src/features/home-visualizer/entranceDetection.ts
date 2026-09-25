import { prepareAiHousePhoto, AiVisualizationError } from './aiVisualization'
import type { EntranceDetection } from './entranceFitStrategy'

export async function detectEntranceStructure(photoUrl: string, signal?: AbortSignal): Promise<EntranceDetection> {
  const startedAt = performance.now()
  const prepared = await prepareAiHousePhoto(photoUrl)
  let response: Response
  try {
    response = await fetch('/api/detect-entrance-structure', {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo: prepared.photo }),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    if (import.meta.env.DEV) console.error('[ai-entrance-detection:network-failure]', { duration_ms: Math.round(performance.now() - startedAt), error: error instanceof Error ? error.message : String(error) })
    throw new AiVisualizationError('Entrance analysis could not reach the server. Check the local API runtime or your connection, then retry.', 'ENTRANCE_DETECTION_NETWORK_ERROR', '', { cause: error })
  }
  const rawBody = await response.text()
  let body: { detection?: EntranceDetection; error_code?: string; user_message?: string; request_id?: string } | null = null
  try { body = JSON.parse(rawBody) } catch { body = null }
  const requestId = body?.request_id || response.headers.get('x-request-id') || ''
  const durationMs = Math.round(performance.now() - startedAt)
  if (!response.ok) {
    if (body?.error_code && body.user_message) {
      if (import.meta.env.DEV) console.error('[ai-entrance-detection:api-failure]', { status: response.status, duration_ms: durationMs, request_id: requestId, error_code: body.error_code })
      throw new AiVisualizationError(body.user_message, body.error_code, requestId)
    }
    const missingRoute = response.status === 404
    const userMessage = import.meta.env.DEV
      ? missingRoute
        ? 'Entrance detection API route is unavailable. Run the app with the Vercel development runtime, then retry.'
        : `Entrance detection returned an invalid response (HTTP ${response.status}). Check the local API runtime and retry.`
      : 'Entrance analysis is temporarily unavailable. Please try again or identify the entrance manually.'
    const errorCode = missingRoute ? 'API_ROUTE_UNAVAILABLE' : 'INVALID_API_RESPONSE'
    if (import.meta.env.DEV) console.error('[ai-entrance-detection:invalid-response]', { status: response.status, content_type: response.headers.get('content-type'), duration_ms: durationMs, request_id: requestId, error_code: errorCode })
    throw new AiVisualizationError(userMessage, errorCode, requestId)
  }
  if (!body?.detection) {
    if (import.meta.env.DEV) console.error('[ai-entrance-detection:invalid-response]', { status: response.status, content_type: response.headers.get('content-type'), duration_ms: durationMs, request_id: requestId, error_code: 'INVALID_API_RESPONSE' })
    throw new AiVisualizationError(import.meta.env.DEV ? 'Entrance detection returned invalid JSON or omitted its detection result.' : 'Entrance analysis returned an unusable response. Please retry or identify the entrance manually.', 'INVALID_API_RESPONSE', requestId)
  }
  if (import.meta.env.DEV) console.debug('[ai-entrance-detection:response]', { duration_ms: durationMs, request_id: requestId, detection: body.detection, outcome: body.detection.confidence < .65 || body.detection.doorStructure === 'unknown' || body.detection.sidelites === 'unknown' ? 'low-confidence' : 'confident' })
  return body.detection
}
