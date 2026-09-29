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

export const AI_IMAGE_PRICING_USD_PER_MILLION = {
  'gpt-image-2.5-sunburst': {
    textInput: 5,
    imageInput: 8,
    imageOutput: 30,
  },
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

export function estimateImageGenerationCost(model: string, usage: ReturnType<typeof normalizeImageUsage>) {
  const pricing = AI_IMAGE_PRICING_USD_PER_MILLION[model as keyof typeof AI_IMAGE_PRICING_USD_PER_MILLION]
  if (!pricing || usage.textInputTokens === null || usage.imageInputTokens === null || usage.imageOutputTokens === null) return null
  return (
    usage.textInputTokens * pricing.textInput
    + usage.imageInputTokens * pricing.imageInput
    + usage.imageOutputTokens * pricing.imageOutput
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
