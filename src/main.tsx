import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './fonts.css'
import './styles.css'
import './typography.css'
import './components/DoorStyleCard.css'
import './home.css'
import './components/SiteFooter.css'
import './components/DoorConfigurationStep.css'
import { installStaleChunkRecovery } from './utils/staleChunkRecovery'

installStaleChunkRecovery()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
