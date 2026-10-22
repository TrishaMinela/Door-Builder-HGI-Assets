export const CUSTOMER_AI_MESSAGES = {
  AI_TEMPORARILY_UNAVAILABLE: 'AI visualization is temporarily unavailable. Please try again later.',
  AI_BUSY: 'AI visualization is busy right now. Please try again shortly.',
  AI_TIMEOUT: 'Your visualization took too long to complete. Please try again.',
  ENTRANCE_PHOTO_UNSUITABLE: 'We couldn’t confidently visualize this entrance. Try another photo with the full doorway clearly visible.',
  AI_GENERATION_FAILED: 'We couldn’t create your visualization right now. Please try again.',
} as const

export type PublicAiErrorCode = keyof typeof CUSTOMER_AI_MESSAGES

// Never display free text from a failed API response, even on an older deployment.
export function customerAiFailure(code: unknown, status = 500) {
  const errorCode: PublicAiErrorCode = typeof code === 'string' && Object.prototype.hasOwnProperty.call(CUSTOMER_AI_MESSAGES, code)
    ? code as PublicAiErrorCode
    : status === 429 ? 'AI_BUSY'
      : status === 408 || status === 504 ? 'AI_TIMEOUT'
        : status === 401 || status === 403 || status === 503 ? 'AI_TEMPORARILY_UNAVAILABLE'
          : 'AI_GENERATION_FAILED'
  return { errorCode, userMessage: CUSTOMER_AI_MESSAGES[errorCode] }
}
