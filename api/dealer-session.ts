import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

type Request = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> }
type Response = { status: (code: number) => Response; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }
const cookieName = '__Host-hgi-dealer'
const ttl = 24 * 60 * 60
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const header = (req: Request, name: string) => typeof req.headers?.[name] === 'string' ? req.headers[name] as string : ''
const attempts = new Map<string, { count: number; until: number }>()
// Defense in depth only: cold starts/other instances do not share these counters.
// Use a Vercel Firewall rate-limit rule for deployment-wide guessing protection.
function allowed(ip: string, now: number) {
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key)
  const key = hash(ip)
  const existing = attempts.get(key)
  if (!existing && attempts.size >= 5000) return false
  const value = existing ?? { count: 0, until: now + 900000 }
  value.count++
  attempts.set(key, value)
  return value.count <= 5
}

/** Stateless convenience session. No database or external authentication calls. */
export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Vary', 'Cookie')
  const clear = () => res.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`)
  const password = process.env.DEALER_MODE_PASSWORD
  const origin = process.env.DEALER_MODE_ORIGIN || 'https://www.hgidoorbuilder.com'
  const secret = process.env.DEALER_MODE_SESSION_SECRET
  // Require a separate randomly generated 256-bit hex signing secret.
  if (!password || !secret || !/^[a-fA-F0-9]{64}$/.test(secret) || secret === password) {
    res.status(503).json({ error: 'Dealer Mode is unavailable. Please try again later.' }); return
  }
  if (!['GET', 'POST', 'DELETE'].includes(req.method ?? '')) {
    res.setHeader('Allow', 'GET, POST, DELETE'); res.status(405).json({ error: 'Method not allowed.' }); return
  }
  if (req.method !== 'GET' && header(req, 'origin') !== origin) {
    res.status(403).json({ error: 'Request not permitted.' }); return
  }
  // Binding signatures to the current credential and origin invalidates sessions
  // on password/secret rotation, without putting either credential in the cookie.
  const signingKey = createHmac('sha256', Buffer.from(secret, 'hex')).update(JSON.stringify(['hgi-dealer-v1', origin, password])).digest()
  const sign = (value: string) => createHmac('sha256', signingKey).update(value).digest('hex')
  const session = header(req, 'cookie').split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) ?? ''
  try {
    if (req.method === 'DELETE') {
      // Clears this browser's cookie. Stateless tokens cannot be individually
      // revoked: a copied token remains valid until expiry or credential rotation.
      clear(); res.status(200).json({ authenticated: false }); return
    }
    if (req.method === 'GET') {
      const match = /^v1\.(\d{13})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(session)
      const expiresAt = match ? Number(match[1]) : 0
      const now = Date.now()
      if (!match || expiresAt <= now || expiresAt > now + ttl * 1000 || !timingSafeEqual(Buffer.from(match[3], 'hex'), Buffer.from(sign(session.slice(0, session.lastIndexOf('.'))), 'hex'))) {
        clear(); res.status(200).json({ authenticated: false }); return
      }
      res.status(200).json({ authenticated: true, expiresAt }); return
    }
    // Vercel overwrites this header; never trust a caller-supplied X-Forwarded-For.
    const ip = header(req, 'x-vercel-forwarded-for')
    if (!ip) throw new Error('Trusted client identity unavailable')
    if (!allowed(ip, Date.now())) { res.setHeader('Retry-After', '900'); res.status(429).json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }); return }
    const body = req.body
    const supplied = body && typeof body === 'object' && 'password' in body ? body.password : null
    if (typeof supplied !== 'string' || supplied.length > 256 || !timingSafeEqual(Buffer.from(hash(supplied), 'hex'), Buffer.from(hash(password), 'hex'))) {
      res.status(401).json({ error: 'Incorrect password. Please try again.' }); return
    }
    const expiresAt = Date.now() + ttl * 1000
    const payload = `v1.${expiresAt}.${randomBytes(16).toString('hex')}`
    const id = `${payload}.${sign(payload)}`
    // Browser-session cookie; absolute server expiry still bounds restored/copied tokens.
    res.setHeader('Set-Cookie', `${cookieName}=${id}; Path=/; HttpOnly; Secure; SameSite=Strict`)
    res.status(200).json({ authenticated: true, expiresAt })
  } catch {
    res.status(503).json({ error: 'Dealer Mode is unavailable. Please try again later.' })
  }
}
