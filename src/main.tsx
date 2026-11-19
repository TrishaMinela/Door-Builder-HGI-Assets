import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
const FindMyDoorPage = lazy(() => import('./features/find-my-door/FindMyDoorPage').then((module) => ({ default: module.FindMyDoorPage })))
import './fonts.css'
import './styles.css'
import './typography.css'
import './components/DoorStyleCard.css'
import './home.css'
import './components/SiteFooter.css'
import './components/DoorConfigurationStep.css'
import './components/ButtonInteraction.css'
import { installStaleChunkRecovery } from './utils/staleChunkRecovery'

installStaleChunkRecovery()

const findMyDoor = window.location.pathname.replace(/\/+$/, '') === '/findmydoor'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {findMyDoor ? <Suspense fallback={<main className="find-my-door-main"><p className="find-door-lead">Loading Find My Door…</p></main>}><FindMyDoorPage /></Suspense> : <App />}
  </StrictMode>,
)
