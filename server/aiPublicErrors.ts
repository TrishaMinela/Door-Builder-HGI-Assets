import { CUSTOMER_AI_MESSAGES, type PublicAiErrorCode } from '../src/features/home-visualizer/publicAiErrors.js'
export { CUSTOMER_AI_MESSAGES, type PublicAiErrorCode }

const temporarilyUnavailable = new Set([
  'SERVER_CONFIGURATION_ERROR',
  'invalid_api_key',
  'token_invalidated',
  'account_deactivated',
  'organization_deactivated',
  'permission_denied',
  'insufficient_quota',
  'billing_hard_limit_reached',
  'credit_balance_exhausted',
  'project_spend_limit_exceeded',
  'invalid_project',
  'project_not_found',
  'model_not_found',
])
const busy = new Set(['OPENAI_RATE_LIMITED', 'rate_limit_exceeded', 'rate_limit_error'])
const timedOut = new Set(['AI_GENERATION_TIMEOUT', 'SERVERLESS_TIMEOUT', 'VISUALIZATION_TIMEOUT', 'provider_timeout'])
const unsuitablePhoto = new Set([
  'INVALID_IMAGE_INPUT',
  'IMAGE_DECODE_FAILED',
  'PAYLOAD_TOO_LARGE',
  'ENTRANCE_INCOMPATIBLE',
  'ENTRANCE_LOW_CONFIDENCE',
  'PHOTO_PREPARATION_FAILED',
])

export function publicAiErrorCode(internalCategory: string, stage: 'entrance_analysis' | 'image_generation' | 'application_infrastructure'): PublicAiErrorCode {
  if (temporarilyUnavailable.has(internalCategory)) return 'AI_TEMPORARILY_UNAVAILABLE'
  if (busy.has(internalCategory)) return 'AI_BUSY'
  if (timedOut.has(internalCategory)) return 'AI_TIMEOUT'
  if (unsuitablePhoto.has(internalCategory) || (internalCategory === 'invalid_image' && stage === 'entrance_analysis')) return 'ENTRANCE_PHOTO_UNSUITABLE'
  return 'AI_GENERATION_FAILED'
}

export function publicAiFailure(internalCategory: string, stage: 'entrance_analysis' | 'image_generation' | 'application_infrastructure', requestId: string) {
  const errorCode = publicAiErrorCode(internalCategory, stage)
  return { error_code: errorCode, user_message: CUSTOMER_AI_MESSAGES[errorCode], request_id: requestId }
}

const knownProviderCategories = new Set([
  'invalid_api_key',
  'token_invalidated',
  'account_deactivated',
  'organization_deactivated',
  'permission_denied',
  'insufficient_quota',
  'billing_hard_limit_reached',
  'credit_balance_exhausted',
  'project_spend_limit_exceeded',
  'rate_limit_exceeded',
  'rate_limit_error',
  'invalid_project',
  'project_not_found',
  'model_not_found',
  'invalid_image',
])

export function safeProviderFailureCategory(value: unknown, status?: number, type?: unknown) {
  if (typeof value === 'string' && knownProviderCategories.has(value)) return value
  if (status === 401) return 'invalid_api_key'
  if (status === 403) return 'permission_denied'
  if (status === 429) return type === 'insufficient_quota' ? 'insufficient_quota' : 'rate_limit_exceeded'
  if (status === 408 || status === 504) return 'provider_timeout'
  return 'provider_request_failed'
}
