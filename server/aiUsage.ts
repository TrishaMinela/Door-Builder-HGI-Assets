export type OpenAiImageUsage = {
  input_tokens?: number
  input_tokens_details?: {
    text_tokens?: number
    image_tokens?: number
  }
  output_tokens?: number
  output_tokens_details?: {
    text_tokens?: number
    image_tokens?: number
  }
  total_tokens?: number
}

export type OpenAiResponseUsage = {
  input_tokens?: number
  input_tokens_details?: { cached_tokens?: number }
  output_tokens?: number
  output_tokens_details?: { reasoning_tokens?: number }
  total_tokens?: number
}

export const AI_IMAGE_PRICING_USD_PER_MILLION = {
  'gpt-image-2.5-sunburst': {
    textInput: 5,
    imageInput: 8,
    imageOutput: 30,
  },
} as const

export const AI_RESPONSE_PRICING_USD_PER_MILLION = {
  'gpt-5.4-mini': { input: .75, cachedInput: .075, output: 4.5 },
} as const

function tokenCount(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

export function normalizeImageUsage(value: unknown) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as OpenAiImageUsage : null
  return {
    inputTokens: tokenCount(source?.input_tokens),
    textInputTokens: tokenCount(source?.input_tokens_details?.text_tokens),
    imageInputTokens: tokenCount(source?.input_tokens_details?.image_tokens),
    outputTokens: tokenCount(source?.output_tokens),
    imageOutputTokens: tokenCount(source?.output_tokens_details?.image_tokens),
    totalTokens: tokenCount(source?.total_tokens),
  }
}

export function normalizeResponseUsage(value: unknown) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as OpenAiResponseUsage : null
  return {
    inputTokens: tokenCount(source?.input_tokens),
    cachedInputTokens: tokenCount(source?.input_tokens_details?.cached_tokens),
    outputTokens: tokenCount(source?.output_tokens),
    reasoningTokens: tokenCount(source?.output_tokens_details?.reasoning_tokens),
    totalTokens: tokenCount(source?.total_tokens),
  }
}

export function estimateImageGenerationCost(model: string, usage: ReturnType<typeof normalizeImageUsage>) {
  const pricing = AI_IMAGE_PRICING_USD_PER_MILLION[model as keyof typeof AI_IMAGE_PRICING_USD_PER_MILLION]
  if (!pricing || usage.textInputTokens === null || usage.imageInputTokens === null || usage.imageOutputTokens === null) return null
  return (
    usage.textInputTokens * pricing.textInput
    + usage.imageInputTokens * pricing.imageInput
    + usage.imageOutputTokens * pricing.imageOutput
  ) / 1_000_000
}

export function estimateEntranceDetectionCost(model: string, usage: ReturnType<typeof normalizeResponseUsage>) {
  const pricing = AI_RESPONSE_PRICING_USD_PER_MILLION[model as keyof typeof AI_RESPONSE_PRICING_USD_PER_MILLION]
  if (!pricing || usage.inputTokens === null || usage.cachedInputTokens === null || usage.outputTokens === null || usage.cachedInputTokens > usage.inputTokens) return null
  return (
    (usage.inputTokens - usage.cachedInputTokens) * pricing.input
    + usage.cachedInputTokens * pricing.cachedInput
    + usage.outputTokens * pricing.output
  ) / 1_000_000
}

type AiUsageRecord = {
  completedAt: string
  status: 'succeeded' | 'failed'
  model: string
  quality: string
  outputSize: string
  outputFormat: string
  usage: ReturnType<typeof normalizeImageUsage>
  estimatedCostUsd: number | null
  openAiGenerationDurationMs: number
  totalApiDurationMs: number
  requestId: string
  errorCode: string | null
  environment: AiUsageEnvironment
  completionTokenHash: string | null
}

export type AiUsageEnvironment = 'production' | 'preview' | 'development'

export function aiUsageEnvironment(value = process.env.VERCEL_ENV): AiUsageEnvironment {
  if (value === 'production') return 'production'
  if (value === 'preview') return 'preview'
  return 'development'
}

export async function recordAiGenerationUsage(record: AiUsageRecord) {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[ai-usage:write-failed]', { request_id: record.requestId, reason: 'supabase_not_configured' })
    return false
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/ai_generation_usage`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        completed_at: record.completedAt,
        status: record.status,
        model: record.model,
        quality: record.quality,
        output_size: record.outputSize,
        output_format: record.outputFormat,
        input_tokens: record.usage.inputTokens,
        text_input_tokens: record.usage.textInputTokens,
        image_input_tokens: record.usage.imageInputTokens,
        output_tokens: record.usage.outputTokens,
        image_output_tokens: record.usage.imageOutputTokens,
        total_tokens: record.usage.totalTokens,
        estimated_cost_usd: record.estimatedCostUsd,
        openai_generation_duration_ms: record.openAiGenerationDurationMs,
        total_api_duration_ms: record.totalApiDurationMs,
        request_id: record.requestId,
        error_code: record.errorCode,
        environment: record.environment,
        completion_token_hash: record.completionTokenHash,
      }),
    })
    if (!response.ok) {
      console.error('[ai-usage:write-failed]', { request_id: record.requestId, status: response.status })
      return false
    }
    return true
  } catch (error) {
    console.error('[ai-usage:write-failed]', {
      request_id: record.requestId,
      reason: error instanceof Error ? error.name : 'unknown_error',
    })
    return false
  }
}

type EntranceDetectionUsageRecord = {
  completedAt: string
  status: 'succeeded' | 'failed'
  environment: AiUsageEnvironment
  model: string
  passType: 'primary' | 'verification'
  usage: ReturnType<typeof normalizeResponseUsage>
  estimatedCostUsd: number | null
  detectionDurationMs: number
  requestId: string
  workflowRequestId: string
  errorCode: string | null
}

export async function recordAiEntranceDetectionUsage(record: EntranceDetectionUsageRecord) {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[ai-entrance-usage:write-failed]', { request_id: record.requestId, reason: 'supabase_not_configured' })
    return false
  }
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/ai_entrance_detection_usage`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        completed_at: record.completedAt,
        status: record.status,
        environment: record.environment,
        model: record.model,
        pass_type: record.passType,
        input_tokens: record.usage.inputTokens,
        cached_input_tokens: record.usage.cachedInputTokens,
        output_tokens: record.usage.outputTokens,
        reasoning_tokens: record.usage.reasoningTokens,
        total_tokens: record.usage.totalTokens,
        estimated_cost_usd: record.estimatedCostUsd,
        detection_duration_ms: record.detectionDurationMs,
        request_id: record.requestId,
        workflow_request_id: record.workflowRequestId,
        error_code: record.errorCode,
      }),
    })
    if (!response.ok) {
      console.error('[ai-entrance-usage:write-failed]', { request_id: record.requestId, status: response.status })
      return false
    }
    return true
  } catch (error) {
    console.error('[ai-entrance-usage:write-failed]', { request_id: record.requestId, reason: error instanceof Error ? error.name : 'unknown_error' })
    return false
  }
}
