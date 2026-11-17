// Controlli automatici del progetto (CLAUDE.md §13).
// Node puro, nessuna dipendenza. Cresce a ogni step: aggiungi i controlli in fondo all'elenco.
// Ogni controllo stampa OK o KO con una riga di spiegazione; un solo KO fa uscire con codice 1.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { gzipSync } from 'node:zlib'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const leggi = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const esiste = (rel) => existsSync(join(ROOT, rel))

const risultati = []
function controllo(nome, fn) {
  try {
    const esito = fn()
    risultati.push({ nome, ok: esito.ok, nota: esito.nota })
  } catch (err) {
    risultati.push({ nome, ok: false, nota: `errore nel controllo: ${err.message}` })
  }
}

// ---------- STEP 0 ----------

controllo('CLAUDE.md presente e completo', () => {
  if (!esiste('CLAUDE.md')) return { ok: false, nota: 'CLAUDE.md manca nella radice' }
  const ok = leggi('CLAUDE.md').includes('§13')
  return { ok, nota: ok ? 'il brief arriva fino al §13' : 'CLAUDE.md non contiene «§13»: il brief è incompleto' }
})

controllo('netlify.toml pubblica dist', () => {
  if (!esiste('netlify.toml')) return { ok: false, nota: 'netlify.toml manca' }
  const ok = /^\s*publish\s*=\s*"dist"\s*$/m.test(leggi('netlify.toml'))
  return { ok, nota: ok ? 'publish = "dist"' : 'manca la riga publish = "dist"' }
})

const VARIABILI = [
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'BREVO_API_KEY',
  'BREVO_MITTENTE',
  'EMAIL_LEAD',
  'META_PIXEL_ID',
  'META_CAPI_TOKEN',
  'META_TEST_EVENT_CODE',
  'BD_MOCK',
]
controllo('.env.example con tutte le variabili', () => {
  if (!esiste('.env.example')) return { ok: false, nota: '.env.example manca' }
  const testo = leggi('.env.example')
  const mancanti = VARIABILI.filter((v) => !new RegExp(`^${v}=`, 'm').test(testo))
  const conValore = VARIABILI.filter((v) => new RegExp(`^${v}=\\S`, 'm').test(testo))
  if (mancanti.length) return { ok: false, nota: `mancano: ${mancanti.join(', ')}` }
  if (conValore.length) return { ok: false, nota: `hanno un valore (devono essere vuote): ${conValore.join(', ')}` }
  return { ok: true, nota: `${VARIABILI.length} variabili, tutte senza valore` }
})

// Le stringhe sono spezzate apposta, così questo file non trova sé stesso.
const SEGRETI = [
  { nome: 'chiave segreta Supabase', re: new RegExp(['sb', 'secret', ''].join('_')) },
  { nome: 'chiave service role Supabase', re: new RegExp(['service', 'role'].join('_')) },
  { nome: 'chiave API Brevo', re: new RegExp(['xkeysib', ''].join('-')) },
  { nome: 'token Meta', re: new RegExp('(?<![A-Za-z0-9+/=])' + 'E' + 'AA' + '[A-Za-z0-9]{20,}') },
  { nome: 'chiave 21st.dev', re: new RegExp(['21st', 'sk', ''].join('_')) },
]
const IGNORATI = new Set(['.env.example', 'CLAUDE.md'])
const BINARI = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.ico', '.heic', '.pdf', '.zip', '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.webm'])

controllo('nessun segreto nel repository', () => {
  // File tracciati più quelli nuovi non ignorati: cioè tutto ciò che può finire in un commit.
  const elenco = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
  const trovati = []
  let letti = 0
  for (const file of elenco) {
    if (IGNORATI.has(file) || BINARI.has(extname(file).toLowerCase())) continue
    const percorso = join(ROOT, file)
    if (!existsSync(percorso) || statSync(percorso).size > 2_000_000) continue
    const testo = readFileSync(percorso, 'utf8')
    letti++
    for (const s of SEGRETI) if (s.re.test(testo)) trovati.push(`${file} (${s.nome})`)
  }
  return trovati.length
    ? { ok: false, nota: `possibile segreto in: ${trovati.join('; ')}` }
    : { ok: true, nota: `${letti} file di testo controllati, nessun segreto` }
})

controllo('build presente', () => {
  const ok = esiste('dist/index.html')
  return { ok, nota: ok ? 'dist/index.html esiste' : 'dist/index.html manca: esegui npm run build prima dei controlli' }
})

// ---------- STEP 1 ----------

const HTML = esiste('dist/index.html') ? leggi('dist/index.html') : ''

function testoVisibile(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
const TITOLO = (HTML.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? ''
const DESCRIZIONE = (HTML.match(/<meta name="description" content="([^"]*)"/) ?? [])[1] ?? ''
const TESTO = `${TITOLO} ${DESCRIZIONE} ${testoVisibile(HTML)}`

controllo('html in italiano con viewport, titolo e descrizione', () => {
  const mancano = []
  if (!/<html[^>]*\blang="it"/.test(HTML)) mancano.push('lang="it"')
  if (!/<meta name="viewport"/.test(HTML)) mancano.push('meta viewport')
  if (!TITOLO.trim()) mancano.push('title')
  if (!DESCRIZIONE.trim()) mancano.push('meta description')
  return mancano.length
    ? { ok: false, nota: `mancano: ${mancano.join(', ')}` }
    : { ok: true, nota: `«${TITOLO}» · descrizione di ${DESCRIZIONE.length} caratteri` }
})

controllo('un solo h1 nell\'HTML prerenderizzato', () => {
  const n = (HTML.match(/<h1[\s>]/g) ?? []).length
  return { ok: n === 1, nota: `${n} h1 trovati` }
})

controllo('header e footer già nell\'HTML (prerender)', () => {
  const radice = HTML.slice(HTML.indexOf('<div id="root">'))
  const ok = radice.includes('bd-header') && radice.includes('bd-footer')
  return { ok, nota: ok ? 'header e footer sono dentro #root prima del JavaScript' : 'il prerender non ha scritto header o footer in #root' }
})

controllo('nessun segnaposto o valore vuoto nel testo', () => {
  const vietati = [
    ['⟪', /⟪/],
    ['DA COMPILARE', /DA COMPILARE/],
    ['undefined', /\bundefined\b/],
    ['null', /\bnull\b/],
    ['{SEGNAPOSTO}', /\{[A-Z][A-Z0-9_]*\}/],
  ]
  const trovati = vietati.filter(([, re]) => re.test(TESTO)).map(([nome]) => nome)
  return trovati.length ? { ok: false, nota: `nel testo compare: ${trovati.join(', ')}` } : { ok: true, nota: 'testo pulito' }
})

controllo('nessuna asserzione ambientale generica (§3.13)', () => {
  const re = /\b(eco|ecologic[oaie]?|green|sostenibil\w*|bio)\b|impatto zero|amica dell'ambiente/gi
  const trovati = [...new Set((TESTO.match(re) ?? []).map((p) => p.toLowerCase()))]
  return trovati.length
    ? { ok: false, nota: `parole vietate: ${trovati.join(', ')}` }
    : { ok: true, nota: 'nessuna parola vietata (Biodomus ammesso)' }
})

const ASSETS = esiste('dist/assets') ? readdirSync(join(ROOT, 'dist/assets')) : []
const kbGzip = (file) => gzipSync(readFileSync(join(ROOT, 'dist/assets', file))).length / 1024

controllo('JavaScript e CSS entro i pesi di §9', () => {
  const js = ASSETS.filter((f) => f.endsWith('.js')).reduce((somma, f) => somma + kbGzip(f), 0)
  const css = ASSETS.filter((f) => f.endsWith('.css')).reduce((somma, f) => somma + kbGzip(f), 0)
  const ok = js <= 160 && css <= 30
  return { ok, nota: `JS ${js.toFixed(1)} kB gzip (max 160), CSS ${css.toFixed(1)} kB gzip (max 30)` }
})

controllo('font solo latin ed entro 120 kB', () => {
  const font = ASSETS.filter((f) => /\.(woff2?|ttf|otf)$/.test(f))
  const nonLatin = font.filter((f) => !/-latin-/.test(f) || /-latin-ext-/.test(f))
  const kb = font.reduce((somma, f) => somma + statSync(join(ROOT, 'dist/assets', f)).size / 1024, 0)
  if (nonLatin.length) return { ok: false, nota: `font fuori dal sottoinsieme latin: ${nonLatin.join(', ')}` }
  return { ok: kb <= 120, nota: `${font.length} file, ${kb.toFixed(1)} kB` }
})

controllo('nessuna risorsa esterna caricata da HTML o CSS', () => {
  const esterne = []
  const tag = /<(script|link|img|source|iframe)\b[^>]*>/gi
  for (const [intero, nome] of HTML.matchAll(tag)) {
    if (nome.toLowerCase() === 'link' && /rel="canonical"/.test(intero)) continue
    for (const [, valore] of intero.matchAll(/\b(?:src|href|srcset)="([^"]+)"/g)) {
      if (/^(https?:)?\/\//i.test(valore)) esterne.push(valore)
    }
  }
  for (const css of ASSETS.filter((f) => f.endsWith('.css'))) {
    for (const [, valore] of readFileSync(join(ROOT, 'dist/assets', css), 'utf8').matchAll(/url\(\s*['"]?([^'")]+)/g)) {
      if (/^(https?:)?\/\//i.test(valore)) esterne.push(`${css}: ${valore}`)
    }
  }
  return esterne.length ? { ok: false, nota: `risorse esterne: ${esterne.join(', ')}` } : { ok: true, nota: 'solo percorsi del sito' }
})

controllo('tre varianti dell\'angolo nel titolo (§7)', () => {
  const h1 = (HTML.match(/<h1[\s\S]*?<\/h1>/) ?? [''])[0]
  const mancanti = ['famiglia', 'terreno', 'investo'].filter((a) => !h1.includes(`bd-v-${a}`))
  return mancanti.length ? { ok: false, nota: `mancano nel h1: ${mancanti.join(', ')}` } : { ok: true, nota: 'famiglia, terreno e investo nel h1' }
})

controllo('script dell\'angolo nel head prima del CSS', () => {
  const script = HTML.indexOf('dataset.angolo')
  const css = HTML.indexOf('rel="stylesheet"')
  const ok = script > 0 && css > 0 && script < css && script < HTML.indexOf('</head>')
  return { ok, nota: ok ? 'lo script imposta data-angolo prima di caricare il CSS' : 'script assente o dopo il CSS' }
})

controllo('accento uguale a COLORE_ACCENTO di §2', () => {
  const daDati = (leggi('src/content/dati.ts').match(/COLORE_ACCENTO:\s*'(#[0-9a-fA-F]{6})'/) ?? [])[1]
  const daToken = (leggi('src/styles/bd-tokens.css').match(/:root\s*\{[\s\S]*?--bd-accento:\s*(#[0-9a-fA-F]{6})/) ?? [])[1]
  const ok = !!daDati && !!daToken && daDati.toLowerCase() === daToken.toLowerCase()
  return { ok, nota: `dati.ts ${daDati ?? '?'} · bd-tokens.css ${daToken ?? '?'}` }
})

controllo('CTA dell\'header secondaria (§5: una sola primaria per schermata)', () => {
  const header = (HTML.match(/<header[\s\S]*?<\/header>/) ?? [''])[0]
  if (!header) return { ok: false, nota: 'header non trovato nell\'HTML' }
  const ok = !header.includes('bd-cta--primaria')
  return { ok, nota: ok ? 'la CTA dell\'header ha il bordo, la primaria resta alla sezione' : 'nell\'header c\'è una CTA primaria piena' }
})

controllo('niente plurali sui partner (§2: oggi una sola impresa di costruzioni)', () => {
  const re = /\b(imprese|aziende)\s+(partner|selezionate)\b/gi
  const trovati = [...new Set((TESTO.match(re) ?? []).map((p) => p.toLowerCase()))]
  return trovati.length
    ? { ok: false, nota: `plurale da correggere: ${trovati.join(', ')} (scrivi «l'impresa partner» o «l'impresa adatta»)` }
    : { ok: true, nota: 'sempre «l\'impresa partner» al singolare' }
})

controllo('file di esempio dello scaffold eliminati', () => {
  const restano = ['src/App.css', 'src/index.css', 'src/assets/react.svg', 'src/assets/vite.svg', 'src/assets/hero.png', 'public/icons.svg'].filter(esiste)
  return restano.length ? { ok: false, nota: `restano: ${restano.join(', ')}` } : { ok: true, nota: 'nessun file di esempio' }
})

// ---------- esito ----------

let ko = 0
for (const r of risultati) {
  if (!r.ok) ko++
  console.log(`${r.ok ? 'OK' : 'KO'}  ${r.nome} — ${r.nota}`)
}
console.log(`\n${risultati.length - ko} OK, ${ko} KO`)
process.exit(ko ? 1 : 0)
