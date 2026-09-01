type ApiRequest = { method?: string; body?: unknown }
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }
declare const process: { env: Record<string, string | undefined> }

type JsonObject = Record<string, unknown>
const MAX_FEEDBACK_LENGTH = 5000

function object(value: unknown): JsonObject {
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonObject : {} } catch { return {} }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {}
}

function text(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : ''
}

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function normalizeRecord(value: unknown) {
  const source = object(value)
  return Object.fromEntries(Object.entries(source).slice(0, 30).map(([key, entry]) => [text(key, 80), text(entry, 300)]).filter(([key]) => key))
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Content-Type', 'application/json')
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); response.status(405).json({ error: 'Method not allowed.' }); return }

  const source = object(request.body)
  // Bots commonly fill hidden inputs. Return success without forwarding so the
  // honeypot does not reveal itself as a filtering mechanism.
  if (text(source.website, 200)) { response.status(200).json({ ok: true }); return }

  const rawFeedback = typeof source.feedback === 'string' ? source.feedback.trim() : ''
  if (rawFeedback.length > MAX_FEEDBACK_LENGTH) { response.status(400).json({ error: 'Feedback is too long.' }); return }
  const feedback = text(rawFeedback, MAX_FEEDBACK_LENGTH)
  if (!feedback) { response.status(400).json({ error: 'Feedback is required.' }); return }
  const email = text(source.email, 254)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { response.status(400).json({ error: 'Email is invalid.' }); return }
  const context = object(source.context)
  const payload = {
    name: text(source.name, 120),
    email,
    phone: text(source.phone, 40),
    feedback,
    context: {
      pageUrl: text(context.pageUrl, 2000),
      step: text(context.step, 160),
      timestamp: text(context.timestamp, 80) || new Date().toISOString(),
      screenWidth: finiteNumber(context.screenWidth),
      screenHeight: finiteNumber(context.screenHeight),
      deviceType: text(context.deviceType, 20),
      userAgent: text(context.userAgent, 1000),
    },
    configuration: normalizeRecord(source.configuration),
  }

  const webhookUrl = process.env.ZAPIER_FEEDBACK_WEBHOOK_URL
  if (!webhookUrl) { console.error('Feedback submission failed: ZAPIER_FEEDBACK_WEBHOOK_URL is not configured.'); response.status(500).json({ error: 'Feedback service is not configured.' }); return }
  try {
    const zapierResponse = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!zapierResponse.ok) { console.error('Feedback Zapier forwarding failed.', { status: zapierResponse.status, statusText: zapierResponse.statusText }); response.status(502).json({ error: 'Feedback forwarding failed.' }); return }
    response.status(200).json({ ok: true })
  } catch (error) {
    console.error('Feedback Zapier forwarding failed.', error instanceof Error ? error.message : error)
    response.status(502).json({ error: 'Feedback forwarding failed.' })
  }
}
