// Prerender (CLAUDE.md §4): dopo `vite build` e `vite build --ssr src/entry-server.tsx --outDir dist-ssr`
// scrive in dist/index.html l'HTML della pagina, titolo, descrizione, Open Graph, Twitter card, JSON-LD e il preload
// del font dei titoli. Così la pagina si legge tutta anche senza JavaScript e il titolo è già nel primo byte (LCP).
// Poi le pagine statiche (privacy, cookie, grazie, 404), robots.txt e sitemap.xml, e l'hash dello script dell'angolo
// nella Content-Security-Policy di netlify.toml (step 7): niente 'unsafe-inline'.

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const SSR = ['entry-server.js', 'entry-server.mjs'].map((f) => join(ROOT, 'dist-ssr', f)).find((f) => existsSync(f))
if (!SSR) throw new Error('Prerender: manca dist-ssr/entry-server.js. Esegui prima vite build --ssr.')

const { render, renderPagine } = await import(pathToFileURL(SSR).href)
const { html, titolo, descrizione, stile, canonico, nomeSito, immagineAlt, jsonLd } = render()

const attr = (testo) =>
  String(testo).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// JSON dentro <script type="application/ld+json">: «<» diventa <, così nessun testo può chiudere lo script
const jsonNelloScript = (valore) => JSON.stringify(valore).replace(/</g, '\\u003c')
const coloreTema = stile === 'grafite' || stile === 'misto' ? '#1a1c1e' : '#edece8'

// Preload solo del font dei titoli (§9): il file hashato che Vite ha copiato in dist/assets.
const fontTitoli = readdirSync(join(DIST, 'assets')).find((f) =>
  /^bricolage-grotesque-latin-wght-normal[-.][\w-]+\.woff2$/.test(f),
)
if (!fontTitoli) throw new Error('Prerender: font dei titoli non trovato in dist/assets')

// Immagine di condivisione (public/og-image.jpg, 1200 × 630): URL assoluto, come vogliono Open Graph e Twitter.
const immagine = new URL('og-image.jpg', canonico).href
const testa = [
  `<meta name="description" content="${attr(descrizione)}" />`,
  `<link rel="canonical" href="${attr(canonico)}" />`,
  `<meta property="og:type" content="website" />`,
  `<meta property="og:locale" content="it_IT" />`,
  `<meta property="og:site_name" content="${attr(nomeSito)}" />`,
  `<meta property="og:title" content="${attr(titolo)}" />`,
  `<meta property="og:description" content="${attr(descrizione)}" />`,
  `<meta property="og:url" content="${attr(canonico)}" />`,
  `<meta property="og:image" content="${attr(immagine)}" />`,
  `<meta property="og:image:width" content="1200" />`,
  `<meta property="og:image:height" content="630" />`,
  `<meta property="og:image:alt" content="${attr(immagineAlt)}" />`,
  `<meta name="twitter:card" content="summary_large_image" />`,
  `<meta name="twitter:title" content="${attr(titolo)}" />`,
  `<meta name="twitter:description" content="${attr(descrizione)}" />`,
  `<meta name="twitter:image" content="${attr(immagine)}" />`,
  `<meta name="twitter:image:alt" content="${attr(immagineAlt)}" />`,
  // Il colore della barra del browser segue il primo schermo: scuro con «Grafite» e con «Misto».
  `<meta name="theme-color" content="${coloreTema}" />`,
  `<link rel="preload" href="/assets/${fontTitoli}" as="font" type="font/woff2" crossorigin />`,
  // Dati strutturati: un blocco di dati, non uno script eseguibile (la CSP non lo riguarda)
  `<script type="application/ld+json">${jsonNelloScript(jsonLd)}</script>`,
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

// ---------- pagine statiche: privacy, cookie, grazie, 404 ----------
// Stesso CSS della landing (il link che Vite ha messo nel modello), niente JavaScript, niente <style> né script inline:
// passano la CSP senza hash. Il 404 lo serve Netlify per ogni indirizzo che non esiste.
const baseStatica = modello
  .replace(/\s*<!-- Angolo della campagna[\s\S]*?-->/, '')
  .replace(/\s*<script>[\s\S]*?<\/script>/, '')
  .replace(/\s*<script type="module"[^>]*><\/script>/g, '')
  .replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
const pagineStatiche = renderPagine()
for (const statica of pagineStatiche) {
  const testaStatica = [
    statica.descrizione ? `<meta name="description" content="${attr(statica.descrizione)}" />` : null,
    statica.indicizza
      ? `<link rel="canonical" href="${attr(new URL(statica.file, canonico).href)}" />`
      : `<meta name="robots" content="noindex" />`,
    `<meta name="theme-color" content="${stile === 'grafite' ? '#1a1c1e' : '#edece8'}" />`,
  ]
    .filter(Boolean)
    .join('\n    ')
  let contenuto = baseStatica
    .replace('<title>Biodomus</title>', () => `<title>${attr(statica.titolo)}</title>`)
    .replace('<!--bd-head-->', () => testaStatica)
    .replace('<div id="root"><!--bd-app--></div>', () => statica.html)
  if (stile === 'grafite') contenuto = contenuto.replace('<html lang="it"', '<html lang="it" data-stile="grafite"')
  if (/<script\b|<style\b|\sstyle="|<!--bd-/.test(contenuto)) {
    throw new Error(`Prerender: ${statica.file} contiene script, stili inline o segnaposti non risolti`)
  }
  writeFileSync(join(DIST, statica.file), contenuto)
  console.log(`Prerender: dist/${statica.file} scritto (${(Buffer.byteLength(contenuto) / 1024).toFixed(1)} kB)`)
}

// ---------- robots.txt e sitemap.xml: la home e le pagine legali ----------
const indirizzi = [canonico, ...pagineStatiche.filter((p) => p.indicizza).map((p) => new URL(p.file, canonico).href)]
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', canonico).href}\n`)
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indirizzi
    .map((indirizzo) => `  <url><loc>${attr(indirizzo)}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
)
console.log(`Prerender: robots.txt e sitemap.xml (${indirizzi.length} indirizzi) verso ${canonico}`)

// ---------- CSP: hash di script e stili inline di dist/index.html ----------
// Lo script dell'angolo (§7) deve girare prima del CSS: resta inline e passa con il suo hash sha256. Lo stesso per i tre
// <style> dei disegni della parete (prefissi bdsh, bdss, bdsc): la prova dello step 7 (zero violazioni a 390 e 1440 px,
// con e senza movimento) dice che gli hash bastano, quindi niente 'unsafe-inline' né in script-src né in style-src.
// Gli hash si calcolano qui e si scrivono nella Content-Security-Policy di netlify.toml. Netlify legge gli header dopo
// il build; in locale il file aggiornato va nel commit (controlli.mjs verifica che gli hash siano quelli di dist).
const sha256 = (testo) => `'sha256-${createHash('sha256').update(testo, 'utf8').digest('base64')}'`
const hashScript = [...pagina.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => sha256(m[1]))
const hashStili = [...new Set([...pagina.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => sha256(m[1])))]
const percorsoToml = join(ROOT, 'netlify.toml')
const toml = readFileSync(percorsoToml, 'utf8')
let tomlAggiornato = toml
for (const [direttiva, hash] of [
  ['script-src', hashScript],
  ['style-src', hashStili],
]) {
  const cerca = new RegExp(`(Content-Security-Policy\\s*=\\s*"[^"]*?${direttiva})([^;"]*)`)
  if (!cerca.test(tomlAggiornato)) throw new Error(`Prerender: in netlify.toml manca ${direttiva} nella Content-Security-Policy`)
  tomlAggiornato = tomlAggiornato.replace(cerca, (_, prima, sorgenti) => {
    const altre = sorgenti.trim().split(/\s+/).filter((s) => s && !s.startsWith("'sha256-"))
    return `${prima} ${[...altre.filter((s) => s === "'self'"), ...hash, ...altre.filter((s) => s !== "'self'")].join(' ')}`
  })
}
if (tomlAggiornato !== toml) {
  writeFileSync(percorsoToml, tomlAggiornato)
  console.log(`Prerender: aggiornati gli hash in netlify.toml (script ${hashScript.length}, stili ${hashStili.length})`)
  if (process.env.NETLIFY === 'true') console.warn('Prerender: netlify.toml era indietro rispetto a dist: fai il commit del file aggiornato')
} else {
  console.log(`Prerender: netlify.toml ha già gli hash di dist (script ${hashScript.length}, stili ${hashStili.length})`)
}
