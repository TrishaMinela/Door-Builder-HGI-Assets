type ApiRequest = {
  method?: string
  body?: unknown
}

declare const process: { env: Record<string, string | undefined> }

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

const SUBMISSION_FIELDS = [
  'submitted_at',
  'first_name',
  'last_name',
  'full_name',
  'email',
  'phone',
  'postal_code',
  'notes',
  'door_configuration',
  'door_line',
  'door_style',
  'sidelite_placement',
  'sidelite_slab',
  'sidelite_glass',
  'main_door_glass',
  'door_finish_type',
  'door_finish_color',
  'jamb_type',
  'jamb_finish_type',
  'jamb_finish_color',
  'hardware',
  'lock_setup',
  'door_swing',
  'hinge_option',
] as const

type SubmissionField = typeof SUBMISSION_FIELDS[number]
type ZapierPayload = Record<SubmissionField, string>

function parseBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
    } catch {
      return {}
    }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
}

function normalizePayload(body: unknown): ZapierPayload {
  const source = parseBody(body)
  return Object.fromEntries(SUBMISSION_FIELDS.map((field) => [field, typeof source[field] === 'string' ? source[field].trim() : ''])) as ZapierPayload
}

function logDevelopmentSubmission(payload: ZapierPayload) {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') return
  console.info('HGI Door Builder submission', {
    Name: payload.full_name,
    Email: payload.email,
    'Door Configuration': payload.door_configuration,
    'Door Line': payload.door_line,
    'Door Style': payload.door_style,
    'Sidelite Placement': payload.sidelite_placement,
    'Sidelite Slab': payload.sidelite_slab,
    'Sidelite Glass': payload.sidelite_glass,
    'Main Door Glass': payload.main_door_glass,
    'Door Finish Type': payload.door_finish_type,
    'Door Finish Color': payload.door_finish_color,
    'Jamb Type': payload.jamb_type,
    'Jamb Finish Type': payload.jamb_finish_type,
    'Jamb Finish Color': payload.jamb_finish_color,
    Hardware: payload.hardware,
    'Lock Setup': payload.lock_setup,
    'Door Swing': payload.door_swing,
    'Hinge Option': payload.hinge_option,
  })
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Content-Type', 'application/json')
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const webhookUrl = process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('Door Builder submission failed: ZAPIER_DOOR_BUILDER_WEBHOOK_URL is not configured.')
    response.status(500).json({ error: 'Submission service is not configured.' })
    return
  }

  const payload = normalizePayload(request.body)
  if (!payload.full_name || !payload.email || !payload.phone || !payload.postal_code) {
    response.status(400).json({ error: 'Required customer information is missing.' })
    return
  }

  logDevelopmentSubmission(payload)

  try {
    const zapierResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!zapierResponse.ok) {
      console.error('Door Builder Zapier forwarding failed.', { status: zapierResponse.status, statusText: zapierResponse.statusText })
      response.status(502).json({ error: 'Submission forwarding failed.' })
      return
    }
    response.status(200).json({ ok: true })
  } catch (error) {
    console.error('Door Builder Zapier forwarding failed.', error instanceof Error ? error.message : error)
    response.status(502).json({ error: 'Submission forwarding failed.' })
  }
}
