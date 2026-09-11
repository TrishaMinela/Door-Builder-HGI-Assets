type ApiRequest = { method?: string; body?: unknown }
declare const process: { env: Record<string, string | undefined> }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

const SUBMISSION_FIELDS = [
  'submitted_at', 'first_name', 'last_name', 'full_name', 'email', 'phone', 'postal_code', 'notes',
  'door_configuration', 'door_line', 'door_style', 'sidelite_placement', 'sidelite_slab', 'sidelite_glass',
  'main_door_glass', 'door_finish_type', 'door_finish_color', 'jamb_type', 'jamb_finish_type',
  'jamb_finish_color', 'hardware', 'lock_setup', 'door_swing', 'hinge_option',
] as const

const MAX_CONFIGURATION_BYTES = 128 * 1024
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
type SubmissionField = typeof SUBMISSION_FIELDS[number]
type ZapierPayload = Record<SubmissionField, string>
type JsonObject = Record<string, unknown>

function parseBody(body: unknown): JsonObject {
  if (typeof body === 'string') {
    try { const parsed = JSON.parse(body); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonObject : {} } catch { return {} }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body as JsonObject : {}
}

function normalizePayload(source: JsonObject): ZapierPayload {
  return Object.fromEntries(SUBMISSION_FIELDS.map((field) => [field, typeof source[field] === 'string' ? source[field].trim() : ''])) as ZapierPayload
}

function configurationSnapshot(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null
}

function byteLength(value: unknown) {
  try { return new TextEncoder().encode(JSON.stringify(value)).byteLength } catch { return Number.POSITIVE_INFINITY }
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

function logDevelopmentSubmission(payload: ZapierPayload) {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') return
  console.info('HGI Door Builder submission', {
    Name: payload.full_name, Email: payload.email, 'Door Configuration': payload.door_configuration,
    'Door Line': payload.door_line, 'Door Style': payload.door_style, 'Sidelite Placement': payload.sidelite_placement,
    'Sidelite Slab': payload.sidelite_slab, 'Sidelite Glass': payload.sidelite_glass,
    'Main Door Glass': payload.main_door_glass, 'Door Finish Type': payload.door_finish_type,
    'Door Finish Color': payload.door_finish_color, 'Jamb Type': payload.jamb_type,
    'Jamb Finish Type': payload.jamb_finish_type, 'Jamb Finish Color': payload.jamb_finish_color,
    Hardware: payload.hardware, 'Lock Setup': payload.lock_setup, 'Door Swing': payload.door_swing,
    'Hinge Option': payload.hinge_option,
  })
}

async function submitToZapier(payload: ZapierPayload) {
  const webhookUrl = process.env.ZAPIER_DOOR_BUILDER_WEBHOOK_URL
  if (!webhookUrl) throw new Error('Zapier destination is not configured.')
  const result = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!result.ok) throw new Error(`Zapier returned HTTP ${result.status}.`)
}

async function submitToSupabase(submissionId: string, payload: ZapierPayload, doorConfiguration: JsonObject) {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase destination is not configured.')
  const { firstName, lastName } = splitName(payload.full_name)
  const result = await fetch(`${supabaseUrl}/rest/v1/leads?on_conflict=submission_id`, {
    method: 'POST',
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({
      submission_id: submissionId, dealer_id: null, first_name: firstName, last_name: lastName,
      email: payload.email, phone: payload.phone || null, zip: payload.postal_code || null,
      comments: payload.notes || null, status: 'new', source: 'door_builder', door_configuration: doorConfiguration,
    }),
  })
  if (!result.ok) throw new Error(`Supabase returned HTTP ${result.status}.`)
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Unknown destination error.'
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Content-Type', 'application/json')
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); response.status(405).json({ error: 'Method not allowed.' }); return }

  const source = parseBody(request.body)
  const payload = normalizePayload(source)
  if (!payload.full_name || !payload.email || !payload.phone || !payload.postal_code) {
    response.status(400).json({ error: 'Required customer information is missing.' }); return
  }
  const submissionId = typeof source.submissionId === 'string' ? source.submissionId.trim() : ''
  if (!UUID_PATTERN.test(submissionId)) { response.status(400).json({ error: 'Submission ID is invalid.' }); return }
  const doorConfiguration = configurationSnapshot(source.doorConfiguration)
  if (!doorConfiguration) { response.status(400).json({ error: 'Door configuration is invalid.' }); return }
  if (byteLength(doorConfiguration) > MAX_CONFIGURATION_BYTES) { response.status(413).json({ error: 'Door configuration is too large.' }); return }

  logDevelopmentSubmission(payload)

  try {
    await submitToSupabase(submissionId, payload, doorConfiguration)
  } catch (reason) {
    console.error('Door Builder supabase submission failed.', errorMessage(reason))
    response.status(502).json({
      error: 'Submission could not be completed. Please try again.',
      destinations: { supabase: 'failed', zapier: 'skipped' },
    })
    return
  }

  try {
    await submitToZapier(payload)
  } catch (reason) {
    console.error('Door Builder zapier submission failed.', errorMessage(reason))
    response.status(502).json({
      error: 'Submission could not be completed. Please try again.',
      destinations: { supabase: 'succeeded', zapier: 'failed' },
    })
    return
  }

  response.status(200).json({ ok: true, destinations: { supabase: 'succeeded', zapier: 'succeeded' } })
}
