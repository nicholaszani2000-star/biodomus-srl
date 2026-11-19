import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'
import { dati } from './content/dati.ts'
import { tt } from './content/bd-testi.ts'

export interface Prerender {
  html: string
  titolo: string
  descrizione: string
  stile: string
  canonico: string
  /** Descrizione di public/og-image.jpg: logo e titolo dell'angolo famiglia, come nell'immagine. */
  immagineAlt: string
}

// Usato solo da scripts/prerender.mjs dopo `vite build --ssr`: non è un componente.
export function render(): Prerender {
  const dominio: string | null = dati.DOMINIO
  return {
    html: renderToString(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
    titolo: tt('meta.titolo'),
    descrizione: tt('meta.descrizione'),
    stile: dati.STILE,
    canonico: dominio ? `https://${dominio}/` : `https://${dati.NETLIFY_SITO}.netlify.app/`,
    immagineAlt: `${dati.BRAND}: ${tt('hero.angoli.famiglia.titolo')}`,
  }
}
