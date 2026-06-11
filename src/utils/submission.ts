import type { ContactForm, DoorStyle, Finish, GlassOption, HardwareOption } from '../types'

export type QuotePayload = {
  configuration: { style: DoorStyle; finish: Finish; glass: GlassOption; hardware: HardwareOption }
  contact: ContactForm
  submittedAt: string
}

export type SubmissionResult = { mode: 'demo' | 'live'; message: string }

export async function submitQuote(payload: QuotePayload): Promise<SubmissionResult> {
  const webhook = import.meta.env.VITE_QUOTE_WEBHOOK_URL
  if (!webhook) {
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    return { mode: 'demo', message: 'Demo request prepared. No webhook is configured, so no information was sent.' }
  }
  const response = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!response.ok) throw new Error('We could not send your request. Please try again or contact Home Guard directly.')
  return { mode: 'live', message: 'Your quote request was sent successfully.' }
}
