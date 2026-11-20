import { createDecipheriv, createHash } from 'node:crypto'

declare const process: { env: Record<string, string | undefined> }

export type StoredWebhookLookup =
  | { status: 'absent' }
  | { status: 'unavailable' }
  | { status: 'unreadable'; verified: boolean }
  | { status: 'configured'; url: string; verified: boolean; webhookId: string; fingerprint: string }

const ENV_BACKED_SLUGS = new Set(['americas-best-windows-and-doors', 'wdm', 'uhr'])

export type DealerCopyPlan =
  | { kind: 'legacy-env' }
  | { kind: 'saved'; url: string; webhookId: string; fingerprint: string }
  | { kind: 'master-only'; reason: 'unreadable' | 'same-as-master' }

export function resolveDealerCopyPlan(slug: string, lookup: StoredWebhookLookup, masterUrl: string): DealerCopyPlan {
  const envBacked = ENV_BACKED_SLUGS.has(slug)
  if (lookup.status === 'absent' || lookup.status === 'unavailable') return { kind: 'legacy-env' }
  if (lookup.status === 'unreadable') {
    return envBacked && !lookup.verified ? { kind: 'legacy-env' } : { kind: 'master-only', reason: 'unreadable' }
  }
  if (envBacked && !lookup.verified) return { kind: 'legacy-env' }
  if (sameWebhookDestination(lookup.url, masterUrl)) return { kind: 'master-only', reason: 'same-as-master' }
  return { kind: 'saved', url: lookup.url, webhookId: lookup.webhookId, fingerprint: lookup.fingerprint }
}

const CATCH_PATH = /^\/hooks\/catch\/(\d{1,12})\/([A-Za-z0-9]{6,80})\/?$/

export function validateZapierCatchHookUrl(input: unknown): string {
  if (typeof input !== 'string') throw new Error('INVALID_WEBHOOK')
  const trimmed = input.trim()
  if (!trimmed || trimmed.length > 200 || /[%\s@\\]|#|\?/.test(trimmed) || /^https:\/\/[^/?#]*:\d+/i.test(trimmed)) throw new Error('INVALID_WEBHOOK')
  let url: URL
  try { url = new URL(trimmed) } catch { throw new Error('INVALID_WEBHOOK') }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('INVALID_WEBHOOK')
  if (url.hostname !== 'hooks.zapier.com') throw new Error('INVALID_WEBHOOK')
  if (url.search || url.hash) throw new Error('INVALID_WEBHOOK')
  const match = CATCH_PATH.exec(url.pathname)
  if (!match) throw new Error('INVALID_WEBHOOK')
  const canonicalPath = `/hooks/catch/${match[1]}/${match[2]}/`
  if (url.pathname !== canonicalPath && url.pathname !== canonicalPath.slice(0, -1)) throw new Error('INVALID_WEBHOOK')
  return `https://hooks.zapier.com${canonicalPath}`
}

export function webhookDestinationFingerprint(webhookUrl: string) {
  return createHash('sha256').update(validateZapierCatchHookUrl(webhookUrl)).digest('hex')
}

export function sameWebhookDestination(left: string, right: string) {
  try {
    const a = new URL(left)
    const b = new URL(right)
    return a.protocol === b.protocol
      && a.hostname === b.hostname
      && a.port === b.port
      && a.pathname.replace(/\/+$/, '') === b.pathname.replace(/\/+$/, '')
      && a.search === b.search
  } catch {
    return false
  }
}

function encryptionKey() {
  const encoded = process.env.DOOR_BUILDER_WEBHOOK_ENCRYPTION_KEY
  if (!encoded) return null
  const key = Buffer.from(encoded, 'base64')
  return key.byteLength === 32 ? key : null
}

function decryptWebhook(row: Record<string, unknown>) {
  const key = encryptionKey()
  if (!key || Number(row.credential_key_version) !== 1) throw new Error('UNREADABLE')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(String(row.webhook_iv ?? ''), 'base64'))
  decipher.setAuthTag(Buffer.from(String(row.webhook_auth_tag ?? ''), 'base64'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(String(row.webhook_ciphertext ?? ''), 'base64')),
    decipher.final(),
  ]).toString('utf8')
  const parsed = JSON.parse(plaintext) as { webhookUrl?: unknown }
  return validateZapierCatchHookUrl(parsed.webhookUrl)
}

function credentials() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return { supabaseUrl, serviceRoleKey }
}

function serviceHeaders(serviceRoleKey: string, extra?: Record<string, string>) {
  return { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Accept: 'application/json', ...extra }
}

function missingTable(status: number, body: string) {
  return (status === 404 || status === 400) && /PGRST205|schema cache/i.test(body)
}

export async function lookupStoredDealerWebhook(dealerId: string): Promise<StoredWebhookLookup> {
  const access = credentials()
  if (!access) return { status: 'unavailable' }
  const query = new URLSearchParams({
    select: 'id,verified,webhook_ciphertext,webhook_iv,webhook_auth_tag,credential_key_version',
    dealer_id: `eq.${dealerId}`,
    limit: '2',
  })
  let response: Response
  try {
    response = await fetch(`${access.supabaseUrl}/rest/v1/dealer_door_builder_webhooks?${query}`, {
      headers: serviceHeaders(access.serviceRoleKey),
    })
  } catch {
    console.error('Door Builder dealer webhook lookup failed. Existing environment webhook mapping will be used.')
    return { status: 'unavailable' }
  }
  const body = await response.text()
  if (missingTable(response.status, body)) return { status: 'absent' }
  if (!response.ok) {
    console.error('Door Builder dealer webhook lookup failed. Existing environment webhook mapping will be used.')
    return { status: 'unavailable' }
  }
  let rows: unknown
  try { rows = JSON.parse(body) } catch { return { status: 'unavailable' } }
  if (!Array.isArray(rows) || rows.length === 0) return { status: 'absent' }
  if (rows.length !== 1) return { status: 'unreadable', verified: false }
  const row = rows[0] as Record<string, unknown>
  const verified = row.verified === true
  try {
    const url = decryptWebhook(row)
    return { status: 'configured', url, verified, webhookId: String(row.id), fingerprint: webhookDestinationFingerprint(url) }
  } catch {
    return { status: 'unreadable', verified }
  }
}

async function patchWebhook(dealerId: string, values: Record<string, unknown>) {
  const access = credentials()
  if (!access) return
  const query = new URLSearchParams({ dealer_id: `eq.${dealerId}` })
  await fetch(`${access.supabaseUrl}/rest/v1/dealer_door_builder_webhooks?${query}`, {
    method: 'PATCH',
    headers: serviceHeaders(access.serviceRoleKey, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(values),
  }).catch(() => undefined)
}

export async function recordDealerWebhookFailure(dealerId: string, httpStatus: number | null) {
  await patchWebhook(dealerId, {
    last_failure_at: new Date().toISOString(),
    last_failure_http_status: httpStatus,
  })
}

async function claimDelivery(input: { dealerId: string; submissionId: string; webhookId: string; fingerprint: string; payload: unknown }) {
  const access = credentials()
  if (!access) return 'unrecorded' as const
  const response = await fetch(`${access.supabaseUrl}/rest/v1/dealer_door_builder_webhook_deliveries`, {
    method: 'POST',
    headers: serviceHeaders(access.serviceRoleKey, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({
      dealer_id: input.dealerId,
      submission_id: input.submissionId,
      webhook_id: input.webhookId,
      destination_fingerprint: input.fingerprint,
      payload: input.payload,
      delivery_status: 'attempting',
      attempt_number: 1,
      lease_expires_at: new Date(Date.now() + 120_000).toISOString(),
    }),
  })
  if (response.status === 201) return 'claimed' as const
  if (response.status === 409) return 'duplicate' as const
  return 'unrecorded' as const
}

async function finishDelivery(dealerId: string, submissionId: string, status: 'succeeded' | 'failed', httpStatus: number | null) {
  const access = credentials()
  if (!access) return
  const query = new URLSearchParams({ dealer_id: `eq.${dealerId}`, submission_id: `eq.${submissionId}` })
  await fetch(`${access.supabaseUrl}/rest/v1/dealer_door_builder_webhook_deliveries?${query}`, {
    method: 'PATCH',
    headers: serviceHeaders(access.serviceRoleKey, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({ delivery_status: status, http_status: httpStatus, updated_at: new Date().toISOString() }),
  }).catch(() => undefined)
  await patchWebhook(dealerId, status === 'succeeded'
    ? { last_success_at: new Date().toISOString(), last_success_http_status: httpStatus, verified: true }
    : { last_failure_at: new Date().toISOString(), last_failure_http_status: httpStatus })
}

export async function deliverDealerWebhookCopy(input: {
  dealerId: string
  submissionId: string
  webhookId: string
  webhookUrl: string
  fingerprint: string
  payload: unknown
}): Promise<'succeeded' | 'failed' | 'duplicate'> {
  let destination: string
  try { destination = validateZapierCatchHookUrl(input.webhookUrl) } catch { return 'failed' }
  let claim: 'claimed' | 'duplicate' | 'unrecorded'
  try { claim = await claimDelivery(input) } catch { return 'failed' }
  if (claim === 'duplicate') return 'duplicate'
  if (claim !== 'claimed') return 'failed'
  let response: Response
  try {
    response = await fetch(destination, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input.payload),
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    await finishDelivery(input.dealerId, input.submissionId, 'failed', null)
    return 'failed'
  }
  const redirected = response.status >= 300 && response.status < 400
  await response.arrayBuffer().catch(() => undefined)
  if (redirected || !response.ok) {
    await finishDelivery(input.dealerId, input.submissionId, 'failed', response.status || null)
    return 'failed'
  }
  await finishDelivery(input.dealerId, input.submissionId, 'succeeded', response.status)
  return 'succeeded'
}
