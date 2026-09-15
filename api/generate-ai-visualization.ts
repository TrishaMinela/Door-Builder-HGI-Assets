type ApiRequest = { method?: string; body?: unknown }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }
type JsonObject = Record<string, unknown>

declare const process: { env: Record<string, string | undefined> }

const MAX_DATA_URL_BYTES = 12 * 1024 * 1024
const DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/

function objectValue(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null
}

function requestBody(value: unknown) {
  if (typeof value !== 'string') return objectValue(value)
  try { return objectValue(JSON.parse(value)) }
  catch { return null }
}

function imageBlob(value: unknown, label: string) {
  if (typeof value !== 'string') throw new Error(`${label} is missing.`)
  const match = value.match(DATA_URL_PATTERN)
  if (!match) throw new Error(`${label} is invalid.`)
  const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0))
  if (bytes.byteLength > MAX_DATA_URL_BYTES) throw new Error(`${label} is too large.`)
  return new Blob([bytes], { type: match[1] })
}

function safeConfiguration(value: unknown) {
  const configuration = objectValue(value)
  if (!configuration) throw new Error('Door configuration is missing.')
  const serialized = JSON.stringify(configuration)
  if (new TextEncoder().encode(serialized).byteLength > 128 * 1024) throw new Error('Door configuration is too large.')
  return configuration
}

function selectedCorners(value: unknown) {
  const corners = objectValue(value)
  const names = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const
  const result: Record<string, { x: number; y: number }> = {}
  for (const name of names) {
    const point = objectValue(corners?.[name])
    const x = point?.x
    const y = point?.y
    if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || x > 1 || y < 0 || y > 1) throw new Error('Doorway corners are invalid.')
    result[name] = { x, y }
  }
  return result
}

function promptFor(configuration: JsonObject, corners: Record<string, { x: number; y: number }>, referenceLabels: string[]) {
  return [
    'Edit the first image, which is the customer\'s real house photo.',
    'Replace only the doorway area indicated by the transparent mask with the configured Home Guard entrance.',
    'The remaining images are original product references in this exact order: ' + referenceLabels.join(', ') + '.',
    'Use those original assets as product references; do not paste or trace a pre-rendered composite.',
    'Apply the exact finish colors and configuration described in the JSON below to the door slab, sidelites, jamb, glass, grids, and hardware.',
    'Preserve the house, wall, trim, lighting, camera angle, and everything outside the selected doorway.',
    'Fit the entrance naturally to the four selected corners, preserve realistic perspective, scale, shadows, and material detail.',
    `Selected doorway corners (normalized to the house photo): ${JSON.stringify(corners)}`,
    'Do not add text, people, decorations, transoms, sidelites, or hardware that are not in the configuration.',
    `DoorConfiguration: ${JSON.stringify(configuration)}`,
  ].join('\n')
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Content-Type', 'application/json')
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    response.status(503).json({ error: 'AI visualization is not configured yet.' })
    return
  }

  try {
    const source = requestBody(request.body)
    if (!source) throw new Error('The visualization request is invalid.')
    const configuration = safeConfiguration(source.configuration)
    const corners = selectedCorners(source.corners)
    const references = Array.isArray(source.references) ? source.references.slice(0, 5) : []
    const form = new FormData()
    form.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5')
    form.append('image[]', imageBlob(source.photo, 'House photo'), 'house.jpg')
    form.append('mask', imageBlob(source.mask, 'Doorway mask'), 'doorway-mask.png')
    const labels: string[] = []
    references.forEach((reference, index) => {
      const item = objectValue(reference)
      if (!item || typeof item.label !== 'string') return
      labels.push(item.label.slice(0, 80))
      form.append('image[]', imageBlob(item.dataUrl, `Reference ${index + 1}`), `reference-${index + 1}.png`)
    })
    form.append('prompt', promptFor(configuration, corners, labels))
    form.append('size', 'auto')
    form.append('quality', 'high')
    form.append('output_format', 'jpeg')
    form.append('output_compression', '90')

    const openAiResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
    const result = await openAiResponse.json() as { data?: Array<{ b64_json?: string }>; error?: { message?: string } }
    const image = result.data?.[0]?.b64_json
    if (!openAiResponse.ok || !image) {
      console.error('[ai-visualizer:openai]', openAiResponse.status, result.error?.message ?? 'No image returned')
      response.status(502).json({ error: 'The AI visualization could not be created. Please try again.' })
      return
    }
    response.status(200).json({ image: `data:image/jpeg;base64,${image}` })
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'The visualization request is invalid.' })
  }
}
