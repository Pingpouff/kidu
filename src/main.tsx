import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted font (latin, weights used by the app): no Google request, works offline
import '@fontsource/outfit/latin-400.css'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-600.css'
import '@fontsource/outfit/latin-700.css'
import '@fontsource/outfit/latin-800.css'
import './index.css'
// Listens for the browser's install event before React mounts (it can fire early)
import './services/install'
import { restoreDisplayStyle } from './services/displayStyle'
import App from './App.tsx'

// Paper style remembered from the last run, before the first frame
restoreDisplayStyle()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
