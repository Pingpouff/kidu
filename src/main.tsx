import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Listens for the browser's install event before React mounts (it can fire early)
import './services/install'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
