import type { ContactForm, DoorStyle, Finish, GlassOption, HardwareOption, ResolvedDoorProduct } from '../types'

export type QuotePayload = {
  configuration: { product: ResolvedDoorProduct; style: DoorStyle; finish: Finish; glass: GlassOption | null; hardware: HardwareOption }
  contact: ContactForm
  attachment: {
    fileName: string
    mimeType: 'application/pdf'
    encoding: 'base64'
    data: string
  }
  submittedAt: string
}

export type SubmissionResult = { mode: 'demo' | 'live'; message: string }

export async function submitQuote(payload: QuotePayload): Promise<SubmissionResult> {
  const webhook = import.meta.env.VITE_QUOTE_WEBHOOK_URL
  if (!webhook) {
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    return { mode: 'demo', message: 'Demo request and PDF attachment prepared. No webhook is configured, so no information was sent.' }
  }
  const response = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!response.ok) throw new Error('We could not send your request. Please try again or contact Home Guard directly.')
  return { mode: 'live', message: 'Your contact information and door configuration PDF were sent successfully.' }
}
