import { useCallback, useEffect, useRef, useState } from 'react'
import './DealerMode.css'

export function useDealerSession() {
  const [expiresAt, setExpiresAt] = useState(0)
  const epoch = useRef(0)
  const mutating = useRef(false)
  const signedOut = useRef(false)
  const request = useCallback(async (method = 'GET', password?: string) => {
    if (method === 'GET' && (mutating.current || signedOut.current)) return false
    if (method !== 'GET') mutating.current = true
    const version = ++epoch.current
    if (method === 'DELETE') { signedOut.current = true; setExpiresAt(0) }
    try {
      const response = await fetch('/api/dealer-session', { method, credentials: 'same-origin', cache: 'no-store', headers: password === undefined ? undefined : { 'Content-Type': 'application/json' }, body: password === undefined ? undefined : JSON.stringify({ password }), signal: AbortSignal.timeout(8000) })
      const data: unknown = await response.json()
      if (!response.ok) throw new Error(response.status === 401 ? 'Incorrect password. Please try again.' : response.status === 429 ? 'Too many attempts. Please wait 15 minutes and try again.' : 'Dealer Mode is unavailable. Please try again later.')
      const expiry = data && typeof data === 'object' && 'authenticated' in data && data.authenticated === true && 'expiresAt' in data && typeof data.expiresAt === 'number' && data.expiresAt > Date.now() ? data.expiresAt : 0
      if (version !== epoch.current) return false
      if (method === 'POST' && expiry) signedOut.current = false
      setExpiresAt(expiry)
      return expiry > 0
    } catch (error) {
      if (version === epoch.current) setExpiresAt(0)
      if (method === 'GET') return false
      throw error instanceof Error && /^(Incorrect password|Too many attempts|Dealer Mode is unavailable)/.test(error.message) ? error : new Error('Dealer Mode is unavailable. Please try again later.')
    } finally { if (method !== 'GET') mutating.current = false }
  }, [])
  useEffect(() => { void request() }, [request])
  useEffect(() => {
    if (!expiresAt) return
    const timer = window.setTimeout(() => { ++epoch.current; setExpiresAt(0) }, Math.max(0, expiresAt - Date.now()))
    return () => clearTimeout(timer)
  }, [expiresAt])
  useEffect(() => {
    const check = () => { if (document.visibilityState === 'visible') void request() }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => { ++epoch.current; window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check) }
  }, [request])
  return { active: expiresAt > Date.now(), verify: () => request(), login: (password: string) => request('POST', password), logout: () => request('DELETE') }
}

type Props = { session: ReturnType<typeof useDealerSession>; onExit: () => void }
export function DealerMode({ session, onExit }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [logoutFailed, setLogoutFailed] = useState(false)
  const pending = useRef(false)
  const close = () => { dialog.current?.close(); setPassword(''); trigger.current?.focus() }
  return <div className="dealer-mode-access">
    <button ref={trigger} type="button" disabled={busy} onClick={async () => {
      setError('')
      if (session.active) {
        setBusy(true); onExit()
        try { await session.logout(); setLogoutFailed(false) } catch { setLogoutFailed(true); setError('Dealer access is disabled here, but sign-out could not be confirmed. Please retry sign-out.'); dialog.current?.showModal() }
        finally { setBusy(false) }
      } else { setPassword(''); dialog.current?.showModal() }
    }}>{session.active ? 'Exit Dealer Mode' : 'Dealer Mode'}</button>
    <dialog ref={dialog} className="dealer-mode-dialog" aria-labelledby="dealer-mode-title" aria-describedby="dealer-mode-description" onKeyDown={event => {
      if (event.key !== 'Tab') return
      const items = [...event.currentTarget.querySelectorAll<HTMLElement>('input:not(:disabled),button:not(:disabled)')]
      const first = items[0], last = items[items.length - 1]
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }} onCancel={event => { event.preventDefault(); if (!busy) close() }} onClick={event => { if (event.target === event.currentTarget && !busy) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close() } }}>
      <form onSubmit={async event => {
        event.preventDefault(); if (pending.current) return
        pending.current = true; setBusy(true); setError('')
        try { if (logoutFailed) { await session.logout(); setLogoutFailed(false); close() } else if (await session.login(password)) close() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Dealer Mode is unavailable. Please try again later.') }
        finally { setPassword(''); pending.current = false; setBusy(false) }
      }}>
        <h2 id="dealer-mode-title">Dealer Mode</h2>
        <p id="dealer-mode-description">Enter the dealer password to access Dealer Mode.</p>
        {!logoutFailed && <label>Dealer password<input autoFocus type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/></label>}
        {error && <p role="alert">{error}</p>}
        <div className="dealer-mode-actions"><button type="button" disabled={busy} onClick={close}>Cancel</button><button type="submit" disabled={busy}>{busy ? 'Checking…' : logoutFailed ? 'Retry sign-out' : 'Continue'}</button></div>
      </form>
    </dialog>
  </div>
}
