import { createHash } from 'node:crypto'
import { completeAiVisualizationWorkflow } from '../server/aiUsage.js'

type ApiRequest = { method?: string; body?: unknown }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

const safeCategories = new Set([
  'ENTRANCE_INCOMPATIBLE',
  'VISUALIZATION_TIMEOUT',
  'COMPARISON_IMAGE_FAILED',
  'RESULT_IMAGE_FAILED',
  'ORIGINAL_IMAGE_FAILED',
  'REFERENCE_PREPARATION_TIMEOUT',
  'API_ROUTE_UNAVAILABLE',
  'PAYLOAD_TOO_LARGE',
  'PHOTO_PREPARATION_FAILED',
  'UNKNOWN_ERROR',
])

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ ok: false })
    return
  }
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
    ? request.body as Record<string, unknown>
    : null
  const workflowRequestId = typeof body?.workflow_request_id === 'string' ? body.workflow_request_id : ''
  const completionToken = typeof body?.workflow_completion_token === 'string' ? body.workflow_completion_token : ''
  const failureCategory = typeof body?.failure_category === 'string' ? body.failure_category : ''
  if (!/^[0-9a-f-]{36}$/i.test(workflowRequestId) || !/^[0-9a-f-]{36}$/i.test(completionToken) || !safeCategories.has(failureCategory)) {
    response.status(400).json({ ok: false })
    return
  }
  const changed = await completeAiVisualizationWorkflow({
    workflowRequestId,
    status: 'failed',
    failureStage: 'application_infrastructure',
    failureCategory,
    completionTokenHash: createHash('sha256').update(completionToken).digest('hex'),
  })
  response.status(changed ? 200 : 202).json({ ok: true })
}
