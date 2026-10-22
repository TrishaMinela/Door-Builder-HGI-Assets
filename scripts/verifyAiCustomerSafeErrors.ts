import assert from 'node:assert/strict'
import { publicAiFailure, safeProviderFailureCategory } from '../server/aiPublicErrors'
import { customerAiFailure, CUSTOMER_AI_MESSAGES } from '../src/features/home-visualizer/publicAiErrors'

const cases = [
  ['credit_balance_exhausted', 'image_generation', 'AI_TEMPORARILY_UNAVAILABLE', 'AI visualization is temporarily unavailable. Please try again later.'],
  ['project_spend_limit_exceeded', 'image_generation', 'AI_TEMPORARILY_UNAVAILABLE', 'AI visualization is temporarily unavailable. Please try again later.'],
  ['invalid_api_key', 'image_generation', 'AI_TEMPORARILY_UNAVAILABLE', 'AI visualization is temporarily unavailable. Please try again later.'],
  ['rate_limit_exceeded', 'image_generation', 'AI_BUSY', 'AI visualization is busy right now. Please try again shortly.'],
  ['provider_timeout', 'image_generation', 'AI_TIMEOUT', 'Your visualization took too long to complete. Please try again.'],
  ['invalid_image', 'entrance_analysis', 'ENTRANCE_PHOTO_UNSUITABLE', 'We couldn’t confidently visualize this entrance. Try another photo with the full doorway clearly visible.'],
  ['provider_request_failed', 'image_generation', 'AI_GENERATION_FAILED', 'We couldn’t create your visualization right now. Please try again.'],
] as const

for (const [internalCategory, stage, expectedCode, expectedMessage] of cases) {
  const result = publicAiFailure(internalCategory, stage, 'safe-app-request-id')
  assert.deepEqual(result, { error_code: expectedCode, user_message: expectedMessage, request_id: 'safe-app-request-id' })
  assert.doesNotMatch(JSON.stringify(result), /credit_balance|spend_limit|invalid_api|token_invalidated|OpenAI|Supabase|provider|billing|credential/i)
}

assert.equal(safeProviderFailureCategory('project_spend_limit_exceeded'), 'project_spend_limit_exceeded')
assert.equal(safeProviderFailureCategory('raw-untrusted-provider-detail'), 'provider_request_failed')
for (const [status, expected] of [[401, 'invalid_api_key'], [403, 'permission_denied'], [429, 'rate_limit_exceeded'], [504, 'provider_timeout']] as const) assert.equal(safeProviderFailureCategory(undefined, status), expected)
assert.equal(safeProviderFailureCategory(undefined, 429, 'insufficient_quota'), 'insufficient_quota')
assert.equal(publicAiFailure('provider_request_failed', 'entrance_analysis', 'safe-id').error_code, 'AI_GENERATION_FAILED', 'Service errors must not blame the customer photo')
for (const [code, message] of Object.entries(CUSTOMER_AI_MESSAGES)) assert.deepEqual(customerAiFailure(code), { errorCode: code, userMessage: message })
for (const malicious of ['credit_balance_exhausted', 'token_invalidated', 'Supabase SECRET sk-secret', '__proto__']) assert.equal(customerAiFailure(malicious).errorCode, 'AI_GENERATION_FAILED')
console.log('AI customer errors: safe categories/messages and diagnostic separation passed.')
