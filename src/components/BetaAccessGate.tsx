import { useState, type FormEvent, type ReactNode } from 'react'
import { LockKeyhole } from 'lucide-react'

const SESSION_KEY = 'hgi-door-builder-beta-access'
const BETA_PASSWORD = 'beta'

function hasSessionAccess() {
  try { return window.sessionStorage.getItem(SESSION_KEY) === 'granted' } catch { return false }
}

type Props = { children: ReactNode }

export function BetaAccessGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState(hasSessionAccess)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (password !== BETA_PASSWORD) {
      setError('Incorrect password. Please try again.')
      setPassword('')
      return
    }
    try { window.sessionStorage.setItem(SESSION_KEY, 'granted') } catch { /* Continue for this page load when storage is unavailable. */ }
    setUnlocked(true)
  }

  if (unlocked) return children

  return <main className="beta-access-page">
    <section className="beta-access-card" aria-labelledby="beta-access-title">
      <span className="beta-access-icon"><LockKeyhole size={27}/></span>
      <span className="beta-access-eyebrow">Private beta</span>
      <h1 id="beta-access-title">Door Builder Access</h1>
      <p>Enter the beta password to continue.</p>
      <form onSubmit={submit}>
        <label htmlFor="beta-access-password">Password</label>
        <input id="beta-access-password" type="password" autoComplete="current-password" autoFocus value={password} onChange={(event) => { setPassword(event.target.value); setError('') }}/>
        {error && <p className="beta-access-error" role="alert">{error}</p>}
        <button type="submit">Enter Door Builder</button>
      </form>
    </section>
  </main>
}
