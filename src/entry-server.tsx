import { StrictMode, type ReactNode } from 'react'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import App from './App.tsx'
import BdDocumento from './components/BdDocumento.tsx'
import BdGrazie from './components/BdGrazie.tsx'
import BdNonTrovata from './components/BdNonTrovata.tsx'
import BdPagina from './components/BdPagina.tsx'
import { dati, emailPubblica } from './content/dati.ts'
import { tt } from './content/bd-testi.ts'

export interface Prerender {
  html: string
  titolo: string
  descrizione: string
  stile: string
  canonico: string
  nomeSito: string
  /** Descrizione di public/og-image.jpg: logo e titolo dell'angolo famiglia, come nell'immagine. */
  immagineAlt: string
  /** Dati strutturati Organization e WebSite (§6 dello step 7): nome, url, logo, email pubblica. Niente recensioni né prezzi. */
  jsonLd: Record<string, unknown>
}

export interface PaginaStatica {
  file: string
  titolo: string
  descrizione: string | null
  /** true: canonical e sitemap; false: noindex (grazie, 404) */
  indicizza: boolean
  html: string
}

// Canonical verso DOMINIO di §2; se è vuoto, verso il sito Netlify (https://NETLIFY_SITO.netlify.app/)
function origine(): string {
  const dominio: string | null = dati.DOMINIO
  return dominio ? `https://${dominio}/` : `https://${dati.NETLIFY_SITO}.netlify.app/`
}

// Usato solo da scripts/prerender.mjs dopo `vite build --ssr`: non è un componente.
export function render(): Prerender {
  const canonico = origine()
  const organizzazione = `${canonico}#organizzazione`
  return {
    html: renderToString(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
    titolo: tt('meta.titolo'),
    descrizione: tt('meta.descrizione'),
    stile: dati.STILE,
    canonico,
    nomeSito: dati.BRAND,
    immagineAlt: `${dati.BRAND}: ${tt('hero.angoli.famiglia.titolo')}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': organizzazione,
          name: dati.BRAND,
          url: canonico,
          logo: new URL('icona-512.png', canonico).href,
          email: emailPubblica(),
        },
        {
          '@type': 'WebSite',
          '@id': `${canonico}#sito`,
          name: dati.BRAND,
          url: canonico,
          inLanguage: 'it-IT',
          publisher: { '@id': organizzazione },
        },
      ],
    },
  }
}

/**
 * Le pagine statiche (§4): HTML senza hydration e senza JavaScript, dentro lo scheletro BdPagina.
 * prerender.mjs le scrive in dist/ con il CSS della landing.
 */
export function renderPagine(): PaginaStatica[] {
  const pagina = (contenuto: ReactNode) => renderToStaticMarkup(<BdPagina>{contenuto}</BdPagina>)
  return [
    { file: 'privacy.html', titolo: tt('privacy.metaTitolo'), descrizione: tt('privacy.metaDescrizione'), indicizza: true, html: pagina(<BdDocumento pagina="privacy" />) },
    { file: 'cookie.html', titolo: tt('cookie.metaTitolo'), descrizione: tt('cookie.metaDescrizione'), indicizza: true, html: pagina(<BdDocumento pagina="cookie" />) },
    { file: 'grazie.html', titolo: tt('grazie.metaTitolo'), descrizione: null, indicizza: false, html: pagina(<BdGrazie />) },
    { file: '404.html', titolo: tt('pagina404.metaTitolo'), descrizione: null, indicizza: false, html: pagina(<BdNonTrovata />) },
  ]
}
