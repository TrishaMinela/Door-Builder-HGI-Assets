import { prepareAiHousePhoto, AiVisualizationError, imageDataDiagnostic } from './aiVisualization'
import type { EntranceDetection } from './entranceFitStrategy'
import { customerAiFailure } from './publicAiErrors'

export async function detectEntranceStructure(photoUrl: string, signal?: AbortSignal): Promise<EntranceDetection> {
  const startedAt = performance.now()
  const prepared = await prepareAiHousePhoto(photoUrl)
  if (import.meta.env.DEV) console.debug('[ai-entrance-detection:input]', { source_dimensions: [prepared.naturalWidth, prepared.naturalHeight], normalized_dimensions: [prepared.width, prepared.height], normalized_image: imageDataDiagnostic(prepared.photo), normalization_ms: Math.round(performance.now() - startedAt), customer_image_count: 1 })
  let response: Response
  try {
    response = await fetch('/api/detect-entrance-structure', {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo: prepared.photo }),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    if (import.meta.env.DEV) console.error('[ai-entrance-detection:network-failure]', { duration_ms: Math.round(performance.now() - startedAt), error: error instanceof Error ? error.message : String(error) })
    throw new AiVisualizationError('AI visualization is temporarily unavailable. Please try again later.', 'AI_TEMPORARILY_UNAVAILABLE', '', { cause: error })
  }
  const rawBody = await response.text()
  let body: { detection?: EntranceDetection; error_code?: string; user_message?: string; request_id?: string; workflow_completion_token?: string } | null = null
  try { body = JSON.parse(rawBody) } catch { body = null }
  const requestId = body?.request_id || response.headers.get('x-request-id') || ''
  const durationMs = Math.round(performance.now() - startedAt)
  if (!response.ok) {
    if (body?.error_code && body.user_message) {
      const failure = customerAiFailure(body.error_code, response.status)
      if (import.meta.env.DEV) console.error('[ai-entrance-detection:api-failure]', { status: response.status, duration_ms: durationMs, request_id: requestId, error_code: failure.errorCode })
      throw new AiVisualizationError(failure.userMessage, failure.errorCode, requestId)
    }
    const userMessage = 'AI visualization is temporarily unavailable. Please try again later.'
    const errorCode = 'AI_TEMPORARILY_UNAVAILABLE'
    if (import.meta.env.DEV) console.error('[ai-entrance-detection:invalid-response]', { status: response.status, content_type: response.headers.get('content-type'), duration_ms: durationMs, request_id: requestId, error_code: errorCode })
    throw new AiVisualizationError(userMessage, errorCode, requestId)
  }
  if (!body?.detection) {
    if (import.meta.env.DEV) console.error('[ai-entrance-detection:invalid-response]', { status: response.status, content_type: response.headers.get('content-type'), duration_ms: durationMs, request_id: requestId, error_code: 'INVALID_API_RESPONSE' })
    throw new AiVisualizationError('AI visualization is temporarily unavailable. Please try again later.', 'AI_TEMPORARILY_UNAVAILABLE', requestId)
  }
  if (import.meta.env.DEV) console.debug('[ai-entrance-detection:response]', { duration_ms: durationMs, request_id: requestId, detection: body.detection, outcome: body.detection.confidence < .65 || body.detection.doorStructure === 'unknown' || body.detection.sidelites === 'unknown' ? 'low-confidence' : 'confident' })
  return { ...body.detection, telemetryRequestId: requestId, telemetryCompletionToken: body.workflow_completion_token }
}

export async function recordVisualizerApplicationFailure(detection: EntranceDetection, failureCategory: string) {
  if (!detection.telemetryRequestId || !detection.telemetryCompletionToken) return false
  try {
    const response = await fetch('/api/fail-ai-visualization-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow_request_id: detection.telemetryRequestId,
        workflow_completion_token: detection.telemetryCompletionToken,
        // Preserve the existing authenticated application-failure RPC contract.
        // Provider categories are recorded by the server, never overwritten here.
        failure_category: ({ AI_TIMEOUT: 'VISUALIZATION_TIMEOUT', AI_TEMPORARILY_UNAVAILABLE: 'API_ROUTE_UNAVAILABLE', AI_BUSY: 'API_ROUTE_UNAVAILABLE', AI_GENERATION_FAILED: 'UNKNOWN_ERROR', ENTRANCE_PHOTO_UNSUITABLE: 'PHOTO_PREPARATION_FAILED' } as Record<string, string>)[failureCategory] ?? failureCategory,
      }),
    })
    return response.ok
  } catch {
    return false
  }
}
