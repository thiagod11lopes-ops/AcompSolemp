import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { syncPlanilhaFontZoom } from '@/hooks/usePlanilhaFontZoom'
import { registerPwa } from '@/pwa/registerPwa'

syncPlanilhaFontZoom()
registerPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
