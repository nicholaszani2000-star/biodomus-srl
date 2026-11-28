import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './styles/bd-app.css'
import App from './App.tsx'

const radice = document.getElementById('root')
if (!radice) throw new Error('Manca #root in index.html')

const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// Build di produzione: #root contiene già l'HTML prerenderizzato, quindi hydration.
// In sviluppo (npm run dev) #root è vuoto e si renderizza da zero.
if (radice.firstElementChild) {
  hydrateRoot(radice, app)
} else {
  createRoot(radice).render(app)
}
