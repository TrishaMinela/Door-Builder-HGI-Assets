import { createHash } from 'node:crypto'
import { AI_MAX_REQUEST_BYTES, AI_MODEL, AI_QUALITY, AiInputError, aiPrompt, loadAiReference, objectValue, prepareHouseAndMask, resolveAiProduct, validateCorners } from '../server/aiDoorVisualization'

type ApiRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }
const inFlight = new Map<string, Promise<string>>()

async function generate(source: Record<string, unknown>, apiKey: string) {
  const corners = validateCorners(source.corners)
  const product = resolveAiProduct(source.configuration, source.jambFinishId, source.glassFrameFinishId)
  const prepared = await prepareHouseAndMask(source.photo, corners)
  const form = new FormData()
  form.append('model', AI_MODEL)
  // Photo and alpha mask are both PNG and have exactly matching dimensions.
  form.append('image[]', new Blob([new Uint8Array(prepared.photo)], { type: 'image/png' }), 'house.png')
  form.append('mask', new Blob([new Uint8Array(prepared.mask)], { type: 'image/png' }), 'doorway-mask.png')
  const labels: string[] = []
  for (const reference of product.references) {
    const bytes = await loadAiReference(reference.paths)
    labels.push(reference.label)
    form.append('image[]', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), `reference-${labels.length}.png`)
  }
  form.append('prompt', aiPrompt(product.snapshot, corners, labels))
  form.append('n', '1')
  form.append('size', 'auto')
  form.append('quality', AI_QUALITY)
  form.append('output_format', 'jpeg')
  form.append('output_compression', '90')
  const upstream = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form,
    signal: AbortSignal.timeout(140_000),
  })
  const result = await upstream.json().catch(() => null) as { data?: Array<{ b64_json?: string }>; error?: { code?: string; type?: string } } | null
  const image = result?.data?.[0]?.b64_json
  if (!upstream.ok || !image) {
    // Status and category are diagnostic; raw messages, configuration/photo and secrets are not logged.
    console.error('[ai-visualizer:openai]', { status: upstream.status, category: upstream.status === 401 || upstream.status === 403 ? 'authorization' : upstream.status === 429 ? 'billing-or-rate-limit' : 'model-or-api-error', code: result?.error?.code, type: result?.error?.type })
    throw new Error('openai-failure')
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length > 4 * 1024 * 1024) throw new Error('output-size-or-format')
  return `data:image/jpeg;base64,${image}`
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }
  try {
    if (Number(request.headers?.['content-length'] ?? 0) > AI_MAX_REQUEST_BYTES) throw new AiInputError('The AI request is too large. Please choose a smaller photo.')
    const serialized = typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? null)
    if (Buffer.byteLength(serialized) > AI_MAX_REQUEST_BYTES) throw new AiInputError('The AI request is too large. Please choose a smaller photo.')
    let source: Record<string, unknown> | null
    try { source = objectValue(JSON.parse(serialized)) } catch { source = null }
    if (!source) throw new AiInputError('The visualization request is invalid.')
    // Validate before starting any paid work. Browser references, URLs and paths are never consumed.
    validateCorners(source.corners)
    resolveAiProduct(source.configuration, source.jambFinishId, source.glassFrameFinishId)
    if (!source.photo) throw new AiInputError('Your house photo is missing.')
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('[ai-visualizer:configuration]', { category: 'missing-server-key' })
      response.status(503).json({ error: 'AI visualization is temporarily unavailable. Manual mode is still available.' })
      return
    }
    const key = createHash('sha256').update(serialized).digest('hex')
    let pending = inFlight.get(key)
    if (!pending) {
      pending = generate(source, apiKey)
      inFlight.set(key, pending)
      void pending.finally(() => { if (inFlight.get(key) === pending) inFlight.delete(key) }).catch(() => {})
    }
    const image = await pending
    response.status(200).json({ image })
  } catch (error) {
    if (error instanceof AiInputError) {
      console.warn('[ai-visualizer:validation]', { category: error.message })
      response.status(400).json({ error: error.message })
    } else {
      console.error('[ai-visualizer:generation]', { category: error instanceof Error && ['asset-resolution', 'openai-failure', 'output-size-or-format'].includes(error.message) ? error.message : 'preparation-or-network-failure' })
      response.status(502).json({ error: 'We could not create your AI visualization. Please try again, or use Manual mode.' })
    }
  }
}
