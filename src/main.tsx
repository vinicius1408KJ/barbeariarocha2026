import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PanelApp from './PanelApp.tsx'

// VITE_APP_MODE=panel is set only on the admin Vercel project's build env,
// so the very same source deploys as either the booking site or the panel.
const Root = import.meta.env.VITE_APP_MODE === 'panel' ? PanelApp : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

// Register the service worker (needed for web push + PWA install).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
