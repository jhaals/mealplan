import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './locales' // Initialize i18n
import { initializeLanguage } from './locales'
import './styles/globals.css'
import App from './App.tsx'

// Initialize language from backend, then render app
initializeLanguage().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})
