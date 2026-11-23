// Prerender (CLAUDE.md §4): dopo `vite build` e `vite build --ssr src/entry-server.tsx --outDir dist-ssr`
// scrive in dist/index.html l'HTML della pagina, titolo, descrizione, Open Graph e il preload del font dei titoli.
// Così la pagina si legge tutta anche senza JavaScript e il titolo è già nel primo byte (LCP).

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const SSR = ['entry-server.js', 'entry-server.mjs'].map((f) => join(ROOT, 'dist-ssr', f)).find((f) => existsSync(f))
if (!SSR) throw new Error('Prerender: manca dist-ssr/entry-server.js. Esegui prima vite build --ssr.')

const { render, renderGrazie } = await import(pathToFileURL(SSR).href)
const { html, titolo, descrizione, stile, canonico, immagineAlt } = render()

const attr = (testo) =>
  String(testo).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Preload solo del font dei titoli (§9): il file hashato che Vite ha copiato in dist/assets.
const fontTitoli = readdirSync(join(DIST, 'assets')).find((f) =>
  /^bricolage-grotesque-latin-wght-normal[-.][\w-]+\.woff2$/.test(f),
)
if (!fontTitoli) throw new Error('Prerender: font dei titoli non trovato in dist/assets')

const testa = [
  `<meta name="description" content="${attr(descrizione)}" />`,
  `<link rel="canonical" href="${attr(canonico)}" />`,
  `<meta property="og:type" content="website" />`,
  `<meta property="og:locale" content="it_IT" />`,
  `<meta property="og:title" content="${attr(titolo)}" />`,
  `<meta property="og:description" content="${attr(descrizione)}" />`,
  `<meta property="og:url" content="${attr(canonico)}" />`,
  // Immagine di condivisione (public/og-image.jpg, 1200 × 630): URL assoluto, come vuole Open Graph.
  `<meta property="og:image" content="${attr(new URL('og-image.jpg', canonico).href)}" />`,
  `<meta property="og:image:width" content="1200" />`,
  `<meta property="og:image:height" content="630" />`,
  `<meta property="og:image:alt" content="${attr(immagineAlt)}" />`,
  `<meta name="twitter:card" content="summary_large_image" />`,
  // Il colore della barra del browser segue il primo schermo: scuro con «Grafite» e con «Misto».
  `<meta name="theme-color" content="${stile === 'grafite' || stile === 'misto' ? '#1a1c1e' : '#edece8'}" />`,
  `<link rel="preload" href="/assets/${fontTitoli}" as="font" type="font/woff2" crossorigin />`,
].join('\n    ')

const percorso = join(DIST, 'index.html')
let pagina = readFileSync(percorso, 'utf8')
const modello = pagina

const sostituzioni = [
  ['<title>Biodomus</title>', `<title>${attr(titolo)}</title>`],
  ['<!--bd-head-->', testa],
  ['<!--bd-app-->', html],
]
for (const [segnaposto, valore] of sostituzioni) {
  if (!pagina.includes(segnaposto)) throw new Error(`Prerender: segnaposto ${segnaposto} non trovato in dist/index.html`)
  pagina = pagina.replace(segnaposto, () => valore)
}
if (stile === 'grafite') pagina = pagina.replace('<html lang="it"', '<html lang="it" data-stile="grafite"')

writeFileSync(percorso, pagina)
console.log(`Prerender: dist/index.html scritto (${(Buffer.byteLength(pagina) / 1024).toFixed(1)} kB, font ${fontTitoli})`)

// /grazie.html: dove bd-lead manda (303) chi invia il modulo senza JavaScript.
// Stesso CSS della landing, nessun JavaScript, fuori dall'indice dei motori di ricerca.
const grazie = renderGrazie()
let paginaGrazie = modello
  .replace(/\s*<script type="module"[^>]*><\/script>/g, '')
  .replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
  .replace('<title>Biodomus</title>', () => `<title>${attr(grazie.titolo)}</title>`)
  .replace('<!--bd-head-->', () =>
    [`<meta name="robots" content="noindex" />`, `<meta name="theme-color" content="${stile === 'grafite' ? '#1a1c1e' : '#edece8'}" />`].join('\n    '),
  )
  .replace('<!--bd-app-->', () => grazie.html)
if (stile === 'grafite') paginaGrazie = paginaGrazie.replace('<html lang="it"', '<html lang="it" data-stile="grafite"')
if (/<script type="module"|<!--bd-/.test(paginaGrazie)) throw new Error('Prerender: grazie.html incompleta')
writeFileSync(join(DIST, 'grazie.html'), paginaGrazie)
console.log(`Prerender: dist/grazie.html scritto (${(Buffer.byteLength(paginaGrazie) / 1024).toFixed(1)} kB)`)
