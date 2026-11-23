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
// Dallo step 3 si cercano le chiavi vere (prefisso più una coda lunga), non le parole: il codice delle funzioni
// e la migrazione citano «sb_secret_…» e «service_role» nei commenti, e i test usano chiavi finte corte.
const SEGRETI = [
  { nome: 'chiave segreta Supabase', re: new RegExp(['sb', 'secret', ''].join('_') + '[A-Za-z0-9_-]{20,}') },
  { nome: 'chiave legacy Supabase (JWT)', re: new RegExp('e' + 'yJ' + '[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}') },
  { nome: 'chiave API Brevo', re: new RegExp(['xkeysib', ''].join('-') + '[A-Za-z0-9]{20,}') },
  { nome: 'token Meta', re: new RegExp('(?<![A-Za-z0-9+/=])' + 'E' + 'AA' + '[A-Za-z0-9]{20,}') },
  { nome: 'chiave 21st.dev', re: new RegExp(['21st', 'sk', ''].join('_') + '[A-Za-z0-9]{10,}') },
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

// ---------- STEP 2 ----------

const { createHash } = await import('node:crypto')
const sharp = (await import('sharp')).default

async function controlloAsync(nome, fn) {
  try {
    const esito = await fn()
    risultati.push({ nome, ok: esito.ok, nota: esito.nota })
  } catch (err) {
    risultati.push({ nome, ok: false, nota: `errore nel controllo: ${err.message}` })
  }
}

/** Tutti i file sotto una cartella (relativi alla radice), con filtro sul nome. */
function fileSotto(rel, filtro = () => true) {
  const dir = join(ROOT, rel)
  if (!existsSync(dir)) return []
  const fuori = []
  for (const voce of readdirSync(dir, { withFileTypes: true })) {
    const percorso = `${rel}/${voce.name}`
    if (voce.isDirectory()) fuori.push(...fileSotto(percorso, filtro))
    else if (filtro(voce.name)) fuori.push(percorso)
  }
  return fuori
}
const impronta = (rel) => createHash('sha1').update(readFileSync(join(ROOT, rel))).digest('hex')
const DATI_TS = leggi('src/content/dati.ts')
const autorizzato = (chiave) => new RegExp(`\\b${chiave}:\\s*true`).test(DATI_TS)
const nomeDato = (chiave) => (DATI_TS.match(new RegExp(`\\b${chiave}:\\s*'([^']+)'`)) ?? [])[1]

// §2: il verde del positivo (#4F8F17) resta nel logo; il lime (#8DC21E) esce dal logo solo come colore dei dettagli
// grafici delle sezioni scure, cioè come valore dei token --bd-dettaglio e --bd-tondino del tema scuro. Mai su testi né pulsanti.
controllo('verde del logo: il positivo solo nel logo, il lime solo nei dettagli delle sezioni scure (§2, §5)', () => {
  const VERDE = /#4F8F17\b/i
  const LIME = /#8DC21E\b/i
  const TOKEN_LIME = /--bd-(dettaglio|tondino)\s*:\s*#8DC21E\b/gi
  const loghi = new Set([
    'src/assets/svg/bd-logo.svg',
    'src/assets/svg/bd-logo-orizzontale.svg',
    'src/assets/svg/bd-logo-negativo.svg',
    'src/assets/svg/bd-logo-orizzontale-negativo.svg',
    'public/favicon.svg',
  ])
  const testo = (n) => /\.(css|ts|tsx|json|svg|html|webmanifest)$/.test(n)
  const daControllare = [
    ...fileSotto('src', testo),
    ...fileSotto('public', testo),
    'index.html',
    ...ASSETS.filter((f) => f.endsWith('.css')).map((f) => `dist/assets/${f}`),
  ].filter((f) => !loghi.has(f) && !/^dist\/assets\/bd-logo/.test(f))
  const problemi = []
  for (const f of daControllare) {
    const contenuto = leggi(f)
    if (VERDE.test(contenuto)) problemi.push(`${f}: verde del logo positivo`)
    if (LIME.test(contenuto.replace(TOKEN_LIME, ''))) problemi.push(`${f}: lime fuori dai token dei dettagli`)
  }
  const token = leggi('src/styles/bd-tokens.css')
  const chiaro = (token.match(/:root\s*\{[\s\S]*?\}/) ?? [''])[0]
  const scuro = (token.match(/\.bd-tema-scuro\s*\{[\s\S]*?\}/) ?? [''])[0]
  if (LIME.test(chiaro)) problemi.push('bd-tokens.css: lime nella palette chiara')
  if (!/--bd-dettaglio:\s*#8DC21E/i.test(scuro)) problemi.push('bd-tokens.css: nel tema scuro --bd-dettaglio non è il lime del logo')
  if (/--bd-(accento|testo|testo-2)\s*:\s*#8DC21E/i.test(token)) problemi.push('bd-tokens.css: lime usato per testi o pulsanti')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `${daControllare.length} file: verde #4F8F17 solo nel logo, lime solo in --bd-dettaglio e --bd-tondino del tema scuro` }
})

controllo('illustrazioni AI del kit fuori da src/ e dist/ (§2)', () => {
  const regola = leggi('CLAUDE.md').includes('Illustrazioni generate con l\'AI (studio/originali/biodomus-asset/illustrazioni/): fuori dalla pagina')
  if (!regola) return { ok: true, nota: 'CLAUDE.md non le esclude più: controllo sospeso' }
  const kit = fileSotto('studio/originali/biodomus-asset/illustrazioni')
  const impronteKit = new Set(kit.map(impronta))
  const nomiKit = /villa-tramonto|villa-dal-disegno|percorso-\d/i
  const sito = [...fileSotto('src'), ...fileSotto('public'), ...(esiste('dist') ? fileSotto('dist') : [])]
  const trovati = sito.filter((f) => nomiKit.test(f) || impronteKit.has(impronta(f)))
  return trovati.length
    ? { ok: false, nota: `illustrazioni AI nel sito: ${trovati.join(', ')}` }
    : { ok: true, nota: `${kit.length} file del kit, nessuno in src/, public/ o dist/` }
})

const MANIFESTO = esiste('src/content/immagini.json') ? JSON.parse(leggi('src/content/immagini.json')) : null

controllo('immagini.json completo: alt, credito, misure, file esistenti', () => {
  if (!MANIFESTO) return { ok: false, nota: 'src/content/immagini.json manca: esegui npm run immagini' }
  const problemi = []
  for (const v of MANIFESTO.immagini) {
    if (!v.alt?.trim()) problemi.push(`${v.id}: alt vuoto`)
    if (!v.credito?.trim()) problemi.push(`${v.id}: credito vuoto`)
    if (!(v.width > 0 && v.height > 0)) problemi.push(`${v.id}: width/height mancanti`)
    if (!v.dove?.trim()) problemi.push(`${v.id}: «dove» vuoto`)
    const file =
      v.formati[0] === 'svg' ? [v.file] : v.formati.flatMap((f) => v.larghezze.map((l) => `${v.file}-${l}.${f}`))
    for (const f of file) if (!esiste(f)) problemi.push(`${v.id}: manca ${f}`)
  }
  for (const [chiave, l] of Object.entries(MANIFESTO.logo ?? {})) if (!esiste(l.file)) problemi.push(`logo ${chiave}: manca ${l.file}`)
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `${MANIFESTO.immagini.length} immagini e ${Object.keys(MANIFESTO.logo ?? {}).length} logo, tutti con alt, credito e misure` }
})

controllo('pesi delle immagini entro §9', () => {
  const kb = (f) => statSync(join(ROOT, f)).size / 1024
  const fuori = []
  for (const v of MANIFESTO?.immagini ?? []) {
    if (v.formati[0] === 'svg') continue
    const limite = /hero/i.test(v.dove) ? 160 : 120
    for (const f of v.formati) for (const l of v.larghezze.filter((x) => x <= 1200)) {
      const file = `${v.file}-${l}.${f}`
      if (esiste(file) && kb(file) > limite) fuori.push(`${file} ${kb(file).toFixed(0)} kB > ${limite}`)
    }
  }
  for (const f of fileSotto('src/assets/svg', (n) => n.endsWith('.svg'))) if (kb(f) > 12) fuori.push(`${f} ${kb(f).toFixed(1)} kB > 12`)
  if (esiste('public/og-image.jpg') && kb('public/og-image.jpg') > 200) fuori.push(`og-image.jpg ${kb('public/og-image.jpg').toFixed(0)} kB > 200`)
  return fuori.length ? { ok: false, nota: fuori.join('; ') } : { ok: true, nota: 'foto ≤ 160/120 kB a 1200 px, SVG ≤ 12 kB, og-image ≤ 200 kB' }
})

await controlloAsync('nessun metadato EXIF o GPS nelle immagini del sito (§10.10)', async () => {
  const raster = [...fileSotto('src/assets', (n) => /\.(jpe?g|png|webp|avif)$/i.test(n)), ...fileSotto('public', (n) => /\.(jpe?g|png|webp|avif)$/i.test(n))]
  const conMetadati = []
  for (const f of raster) {
    const m = await sharp(join(ROOT, f)).metadata()
    if (m.exif || m.xmp || m.iptc) conMetadati.push(f)
  }
  return conMetadati.length
    ? { ok: false, nota: `metadati presenti in: ${conMetadati.join(', ')}` }
    : { ok: true, nota: `${raster.length} immagini raster, nessuna con EXIF, XMP o IPTC` }
})

controllo('niente logo, foto o nome dei partner senza autorizzazione (§10.7)', () => {
  const problemi = []
  const sito = [...fileSotto('src'), ...fileSotto('public'), ...(esiste('dist') ? fileSotto('dist') : [])]
  for (const [ok, chiave, parola] of [
    [autorizzato('P1_OK'), 'P1', /edilnoma/i],
    [autorizzato('P2_OK'), 'P2', /bioisotherm/i],
  ]) {
    if (ok) continue
    // file con il nome del partner, o identici agli originali caricati in studio/originali/
    const originali = [...fileSotto('studio/originali/foto'), ...fileSotto('studio/originali/loghi-partner')]
    const impronte = new Set(originali.filter((f) => chiave === 'P1' || parola.test(f)).map(impronta))
    for (const f of sito) if (parola.test(f) || impronte.has(impronta(f))) problemi.push(`${f} (${chiave}_OK no)`)
    // il nome del partner non compare nella pagina
    const nome = nomeDato(`${chiave}_NOME`)
    if (nome && HTML.includes(nome)) problemi.push(`dist/index.html contiene «${nome}» (${chiave}_OK no)`)
  }
  return problemi.length ? { ok: false, nota: problemi.join('; ') } : { ok: true, nota: 'nessun file o nome di partner non autorizzati nel sito' }
})

await controlloAsync('favicon, icone, manifest e og-image con le misure giuste', async () => {
  const attese = [
    ['public/apple-touch-icon.png', 180, 180],
    ['public/icona-192.png', 192, 192],
    ['public/icona-512.png', 512, 512],
    ['public/icona-512-maskable.png', 512, 512],
    ['public/og-image.jpg', 1200, 630],
  ]
  const problemi = []
  for (const [f, w, h] of attese) {
    if (!esiste(f)) {
      problemi.push(`manca ${f}`)
      continue
    }
    const m = await sharp(join(ROOT, f)).metadata()
    if (m.width !== w || m.height !== h) problemi.push(`${f} è ${m.width}×${m.height}, servono ${w}×${h}`)
  }
  for (const f of ['public/favicon.ico', 'public/favicon.svg', 'public/site.webmanifest']) if (!esiste(f)) problemi.push(`manca ${f}`)
  if (esiste('public/site.webmanifest')) {
    const mw = JSON.parse(leggi('public/site.webmanifest'))
    for (const icona of mw.icons ?? []) if (!esiste(`public${icona.src}`)) problemi.push(`il manifest punta a ${icona.src}, che non esiste`)
  }
  const testa = (HTML.match(/<head>[\s\S]*<\/head>/) ?? [''])[0]
  for (const [cosa, re] of [
    ['favicon.ico', /rel="icon" href="\/favicon\.ico"/],
    ['favicon.svg', /rel="icon" href="\/favicon\.svg"/],
    ['apple-touch-icon', /rel="apple-touch-icon" href="\/apple-touch-icon\.png"/],
    ['manifest', /rel="manifest" href="\/site\.webmanifest"/],
    ['og:image', /property="og:image" content="https:\/\/[^"]+\/og-image\.jpg"/],
  ])
    if (!re.test(testa)) problemi.push(`nel <head> manca ${cosa}`)
  return problemi.length ? { ok: false, nota: problemi.join('; ') } : { ok: true, nota: 'favicon 32 e SVG, icona iPhone 180, icone 192 e 512, manifest, og-image 1200 × 630 e link nel <head>' }
})

// Nome del file del logo senza l'hash di Vite: /assets/bd-logo-negativo-Clkcxrzm.svg → bd-logo-negativo.svg
// (React scrive «srcSet»: gli attributi HTML non distinguono maiuscole e minuscole)
const fileLogo = (tag) => ((tag.match(/(?:src|srcset)="[^"]*\/(bd-logo[^"/]*?)-[A-Za-z0-9_-]{8}\.svg"/i) ?? [])[1] ?? '?') + '.svg'

controllo('logo nel sito: senza payoff, con width e height; con «Misto» negativo e positivo nell\'header (§2)', () => {
  const problemi = []
  // Non nomeDato: in dati.ts l'interfaccia scrive «STILE: 'cemento' | …» prima del valore
  const stile = (DATI_TS.match(/\bSTILE:\s*'([^']+)',/) ?? [])[1]
  const file = ['bd-logo', 'bd-logo-orizzontale', 'bd-logo-negativo', 'bd-logo-orizzontale-negativo'].map((n) => `src/assets/svg/${n}.svg`)
  for (const f of file) {
    if (!esiste(f)) problemi.push(`manca ${f}`)
    else if (/COSTRUZIONI|payoff/i.test(leggi(f))) problemi.push(`${f} contiene il payoff`)
  }
  const loghi = HTML.match(/<(img|source)[^>]*bd-logo[^>]*>/g) ?? []
  for (const tag of loghi) if (!/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag)) problemi.push(`logo senza width o height: ${tag.slice(0, 80)}`)
  const header = (HTML.match(/<header[\s\S]*?<\/header>/) ?? [''])[0]
  const nellHeader = new Set((header.match(/<(img|source)[^>]*bd-logo[^>]*>/g) ?? []).map(fileLogo))
  const attesi = stile === 'misto'
    ? ['bd-logo.svg', 'bd-logo-orizzontale.svg', 'bd-logo-negativo.svg', 'bd-logo-orizzontale-negativo.svg']
    : stile === 'grafite'
      ? ['bd-logo-negativo.svg', 'bd-logo-orizzontale-negativo.svg']
      : ['bd-logo.svg', 'bd-logo-orizzontale.svg']
  const mancanti = attesi.filter((f) => !nellHeader.has(f))
  if (mancanti.length) problemi.push(`nell'header mancano ${mancanti.join(', ')}`)
  const footer = (HTML.match(/<footer[\s\S]*?<\/footer>/) ?? [''])[0]
  const nelFooter = (footer.match(/<img[^>]*bd-logo[^>]*>/g) ?? []).map(fileLogo)
  if (nelFooter.join() !== 'bd-logo.svg') problemi.push(`nel footer: ${nelFooter.join(', ') || 'nessun logo'} invece del positivo impilato`)
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `${loghi.length} riferimenti con width e height · header: ${[...nellHeader].join(', ')} · footer: positivo impilato` }
})

// ---------- STEP 3 ----------

const FORM = (HTML.match(/<form[^>]*>[\s\S]*?<\/form>/) ?? [])[0] ?? ''
const CAMPI_MODULO = [
  'profilo', 'terreno', 'comune', 'budget', 'tempistica', 'nome', 'email', 'telefono', 'messaggio',
  'angolo', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid', 'pagina', 'event_id', 'avviato_il', 'consenso_marketing', 'sito_web',
]
// Gli attributi HTML non distinguono maiuscole e minuscole (React scrive «autoComplete»)
const attributo = (tag, nome) => (tag.match(new RegExp(`\\s${nome}="([^"]*)"`, 'i')) ?? [])[1]
const controlliForm = FORM.match(/<(input|textarea|select)\b[^>]*>/g) ?? []

controllo('modulo nell\'HTML prerenderizzato: action, method e campi con name (§4)', () => {
  if (!FORM) return { ok: false, nota: 'nessun <form> in dist/index.html' }
  const apertura = FORM.match(/<form[^>]*>/)[0]
  const problemi = []
  if (attributo(apertura, 'action') !== '/api/lead') problemi.push(`action="${attributo(apertura, 'action')}" invece di /api/lead`)
  if ((attributo(apertura, 'method') ?? '').toLowerCase() !== 'post') problemi.push('method diverso da post')
  const senzaNome = controlliForm.filter((tag) => !attributo(tag, 'name'))
  if (senzaNome.length) problemi.push(`${senzaNome.length} campi senza name`)
  const nomi = new Set(controlliForm.map((tag) => attributo(tag, 'name')))
  const mancanti = CAMPI_MODULO.filter((n) => !nomi.has(n))
  if (mancanti.length) problemi.push(`mancano i campi: ${mancanti.join(', ')}`)
  if (!/<button[^>]*type="submit"/.test(FORM)) problemi.push('manca il pulsante di invio')
  if (!/id="preventivo"/.test(HTML)) problemi.push('manca la sezione #preventivo')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `POST /api/lead, ${CAMPI_MODULO.length} campi con name (${controlliForm.length} controlli), invio presente anche senza JavaScript` }
})

controllo('ogni campo visibile del modulo ha una label collegata (§9)', () => {
  const visibili = controlliForm.filter((tag) => attributo(tag, 'type') !== 'hidden')
  const senzaLabel = visibili.filter((tag) => {
    const id = attributo(tag, 'id')
    return !id || !new RegExp(`<label[^>]*\\sfor="${id}"`).test(FORM)
  })
  const idDescritti = FORM.match(/aria-describedby="([^"]*)"/g) ?? []
  const orfani = idDescritti.flatMap((a) => a.slice(18, -1).split(' ')).filter((id) => !HTML.includes(`id="${id}"`))
  if (senzaLabel.length) return { ok: false, nota: `senza label: ${senzaLabel.map((t) => attributo(t, 'name')).join(', ')}` }
  if (orfani.length) return { ok: false, nota: `aria-describedby verso id inesistenti: ${orfani.join(', ')}` }
  const live = /aria-live="polite"/.test(FORM)
  return live
    ? { ok: true, nota: `${visibili.length} campi visibili, tutti con <label for>; suggerimenti collegati; riepilogo errori aria-live` }
    : { ok: false, nota: 'manca il riepilogo degli errori con aria-live="polite"' }
})

controllo('honeypot presente e nascosto (§4)', () => {
  const tag = controlliForm.find((t) => attributo(t, 'name') === 'sito_web')
  if (!tag) return { ok: false, nota: 'manca il campo sito_web' }
  const problemi = []
  if (attributo(tag, 'tabindex') !== '-1') problemi.push('tabindex diverso da -1')
  if (attributo(tag, 'autocomplete') !== 'off') problemi.push('autocomplete diverso da off')
  if (!/<div class="bd-hp" aria-hidden="true">(?:(?!<\/div>)[\s\S])*name="sito_web"/.test(FORM)) problemi.push('non è dentro .bd-hp con aria-hidden')
  const css = ASSETS.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(ROOT, 'dist/assets', f), 'utf8')).join('')
  const regola = (css.match(/\.bd-hp\{[^}]*\}/) ?? [])[0] ?? ''
  if (!/position:absolute/.test(regola) || !/left:-10000px/.test(regola)) problemi.push('il CSS di .bd-hp non lo porta fuori dallo schermo')
  return problemi.length ? { ok: false, nota: problemi.join('; ') } : { ok: true, nota: 'sito_web fuori dallo schermo, tabindex -1, autocomplete off, aria-hidden' }
})

controllo('nessun dato personale negli URL (§4)', () => {
  const problemi = []
  const moduli = HTML.match(/<form[^>]*>/g) ?? []
  for (const f of moduli) {
    if ((attributo(f, 'method') ?? 'get').toLowerCase() !== 'post') problemi.push('un <form> usa GET')
    if ((attributo(f, 'action') ?? '').includes('?')) problemi.push('action con querystring')
  }
  const campiPersonali = ['nome', 'email', 'telefono', 'messaggio', 'comune']
  const reQuery = new RegExp(`[?&](${campiPersonali.join('|')})=`)
  const js = ASSETS.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(ROOT, 'dist/assets', f), 'utf8')).join('\n')
  if (/\/api\/lead\?/.test(js) || /\/api\/lead\?/.test(HTML)) problemi.push('/api/lead chiamata con una querystring')
  if (reQuery.test(HTML)) problemi.push('un link dell\'HTML porta campi del modulo in querystring')
  const funzione = esiste('netlify/functions/bd-lead.mts') ? leggi('netlify/functions/bd-lead.mts') : ''
  const destinazioni = [...funzione.matchAll(/vaiA\('([^']*)'\)/g)].map((m) => m[1])
  if (!destinazioni.length || destinazioni.some((d) => d.includes('?'))) problemi.push('il 303 della funzione porta una querystring')
  const modulo = esiste('src/sections/BdModulo.tsx') ? leggi('src/sections/BdModulo.tsx') : ''
  if (!/method: 'POST'/.test(modulo)) problemi.push('il modulo non invia con POST')
  if (!/pagina: `\$\{window\.location\.origin\}\$\{window\.location\.pathname\}`/.test(modulo)) problemi.push('il campo pagina non è solo origine + percorso')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: 'form e fetch in POST, nessuna querystring con campi del modulo, 303 verso /grazie.html, pagina senza querystring' }
})

controllo('pagina /grazie.html per l\'invio senza JavaScript', () => {
  if (!esiste('dist/grazie.html')) return { ok: false, nota: 'manca dist/grazie.html (la genera scripts/prerender.mjs)' }
  const g = leggi('dist/grazie.html')
  const problemi = []
  if (!/<meta name="robots" content="noindex"/.test(g)) problemi.push('manca noindex')
  if (/<script type="module"/.test(g)) problemi.push('carica JavaScript')
  if (!/<link rel="stylesheet"[^>]*\/assets\/[^"]+\.css/.test(g)) problemi.push('manca il CSS della landing')
  if (!/<h1/.test(g) || /<!--bd-|DA COMPILARE|\{[A-Z_]+\}/.test(g)) problemi.push('contenuto incompleto')
  return problemi.length ? { ok: false, nota: problemi.join('; ') } : { ok: true, nota: 'stesso CSS, nessun JavaScript, noindex, testi da testi.json' }
})

controllo('funzioni e tabella: /api/lead, keepalive @daily, RLS senza policy', () => {
  const problemi = []
  const lead = esiste('netlify/functions/bd-lead.mts') ? leggi('netlify/functions/bd-lead.mts') : ''
  const keep = esiste('netlify/functions/bd-keepalive.mts') ? leggi('netlify/functions/bd-keepalive.mts') : ''
  const sql = esiste('supabase/migrations/001_bd_leads.sql') ? leggi('supabase/migrations/001_bd_leads.sql') : ''
  if (!/export const config: Config = \{ path: '\/api\/lead' \}/.test(lead)) problemi.push('bd-lead senza config.path /api/lead')
  if (!/export default async function/.test(lead)) problemi.push('bd-lead senza default export')
  if (!/schedule: '@daily'/.test(keep)) problemi.push('bd-keepalive senza schedule @daily')
  if (!/enable row level security/i.test(sql)) problemi.push('RLS non attiva su bd_leads')
  if (/create policy/i.test(sql)) problemi.push('la migrazione crea una policy')
  const colonne = ['id', 'creato_il', 'profilo', 'terreno', 'comune', 'budget', 'tempistica', 'nome', 'email', 'telefono', 'messaggio', 'angolo', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid', 'pagina', 'consenso_marketing', 'stato']
  const mancanti = colonne.filter((c) => !new RegExp(`^\\s+${c}\\s`, 'm').test(sql))
  if (mancanti.length) problemi.push(`colonne mancanti: ${mancanti.join(', ')}`)
  const commenti = colonne.filter((c) => !new RegExp(`comment on column public\\.bd_leads\\.${c}\\s+is\\s`, 'i').test(sql))
  if (commenti.length) problemi.push(`colonne senza commento: ${commenti.join(', ')}`)
  if (!/create index[^;]*creato_il/i.test(sql)) problemi.push('manca l\'indice su creato_il')
  return problemi.length ? { ok: false, nota: problemi.join('; ') } : { ok: true, nota: `${colonne.length} colonne commentate, indice su creato_il, RLS attiva e nessuna policy` }
})

controllo('npm test passa', () => {
  try {
    const uscita = execFileSync('npx', ['tsx', '--test', ...readdirSync(join(ROOT, 'studio/test')).filter((f) => f.endsWith('.test.ts')).map((f) => join('studio/test', f))], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const pass = (uscita.match(/^# pass (\d+)/m) ?? [])[1]
    return { ok: true, nota: `${pass ?? '?'} test superati (validazione, antispam, normalizzazione, SHA-256, BD_MOCK, 303, 502)` }
  } catch (err) {
    const fail = ((err.stdout ?? '').match(/^# fail (\d+)/m) ?? [])[1]
    return { ok: false, nota: `${fail ?? 'alcuni'} test falliti: npm test per i dettagli` }
  }
})

// ---------- STEP 4 ----------

const STILE = (DATI_TS.match(/\bSTILE:\s*'([^']+)',/) ?? [])[1]
const TESTI = JSON.parse(leggi('src/content/testi.json'))
const sezioneHtml = (id) => (HTML.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`)) ?? [''])[0]
const HERO = sezioneHtml('inizio')
const PER_CHI = sezioneHtml('per-chi')
const PREVENTIVO = sezioneHtml('preventivo')
const BARRA = (HTML.match(/<div[^>]*class="[^"]*bd-barra-mobile[\s\S]*?<\/div>/) ?? [''])[0]
const CSS_SITO = ASSETS.filter((f) => f.endsWith('.css')).map((f) => leggi(`dist/assets/${f}`)).join('\n')
const classi = (tag) => ((tag.match(/\sclass="([^"]*)"/) ?? [])[1] ?? '').split(/\s+/)
const ctaIn = (html) =>
  (html.match(/<a[^>]*class="[^"]*\bbd-cta\b[^"]*"[^>]*>/g) ?? []).map((tag) => ({
    primaria: classi(tag).includes('bd-cta--primaria'),
    href: attributo(tag, 'href'),
  }))

controllo('hero e header scuri al caricamento con STILE «Misto», il resto chiaro (§5, §6.1)', () => {
  if (STILE !== 'misto') return { ok: true, nota: `STILE «${STILE}»: controllo non applicabile` }
  const problemi = []
  if (!classi((HERO.match(/^<section[^>]*>/) ?? [''])[0]).includes('bd-tema-scuro')) problemi.push('l\'hero non ha bd-tema-scuro')
  if (!classi((HTML.match(/<header[^>]*>/) ?? [''])[0]).includes('bd-tema-scuro')) problemi.push('l\'header prerenderizzato è chiaro: al caricamento cambierebbe colore')
  if (!/<meta name="theme-color" content="#1a1c1e"/i.test(HTML)) problemi.push('theme-color diverso dal fondo scuro')
  const scure = (HTML.match(/<section[^>]*class="[^"]*\bbd-tema-scuro\b/g) ?? []).length
  if (scure !== 1) problemi.push(`${scure} sezioni scure invece della sola hero`)
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: 'hero con bd-tema-scuro, header scuro già nel prerender, theme-color #1a1c1e, le altre sezioni chiare' }
})

controllo('hero: occhiello con la zona, una sola CTA primaria, «Come funziona» secondaria, chi risponde (§6.2, §8)', () => {
  if (!HERO) return { ok: false, nota: 'section#inizio non trovata' }
  const problemi = []
  const cta = ctaIn(HERO)
  const primarie = cta.filter((c) => c.primaria)
  if (primarie.length !== 1 || primarie[0].href !== '#preventivo') problemi.push(`${primarie.length} CTA primarie (attesa 1 verso #preventivo)`)
  if (!cta.some((c) => !c.primaria && c.href === '#come-funziona')) problemi.push('manca la secondaria «Come funziona» verso #come-funziona')
  const testo = testoVisibile(HERO)
  const zona = nomeDato('ZONA')
  const referente = nomeDato('REFERENTE')
  if (!zona || !testo.includes(`Costruzione di case in ${zona}`)) problemi.push('occhiello senza la zona')
  if (!referente || !testo.includes(`Ti risponde ${referente}`)) problemi.push('manca «Ti risponde …» sotto la CTA')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `occhiello «Costruzione di case in ${zona}», 1 primaria verso #preventivo, «Come funziona» secondaria, «Ti risponde ${referente}…»` }
})

controllo('fatti dell\'hero solo con i dati presenti; classe solo con P1_OK (§6.2, §8)', () => {
  const lista = (HERO.match(/<ul class="bd-hero__fatti"[\s\S]*?<\/ul>/) ?? [''])[0]
  const voci = (lista.match(/<li>[\s\S]*?<\/li>/g) ?? []).map(testoVisibile)
  const tempi = nomeDato('TEMPI')
  const sistema = nomeDato('SISTEMA_BREVE')
  const attese = [tempi ? `Consegna: ${tempi}` : null, sistema ?? null].filter(Boolean)
  const problemi = attese.filter((a) => !voci.includes(a)).map((a) => `manca «${a}»`)
  const conClasse = voci.some((v) => /classe energetica/i.test(v))
  if (conClasse && !autorizzato('P1_OK')) problemi.push('classe energetica nei fatti senza l\'autorizzazione di P1')
  if (voci.some((v) => /garanzi/i.test(v)) && !nomeDato('GARANZIA')) problemi.push('garanzia citata con GARANZIA vuota')
  if (voci.length !== attese.length + (conClasse ? 1 : 0)) problemi.push(`${voci.length} fatti invece di ${attese.length}`)
  return problemi.length ? { ok: false, nota: problemi.join('; ') } : { ok: true, nota: `${voci.length} fatti: ${voci.join(' · ')}` }
})

controllo('la sezione nell\'hero: SVG inline con quattro strati, titolo accessibile e dicitura «Illustrazione» (§5, §10.9)', () => {
  const svg = (HERO.match(/data-bd-parete=""[^>]*>\s*(<svg[\s\S]*?<\/svg>)/) ?? [])[1] ?? ''
  if (!svg) return { ok: false, nota: 'nell\'hero manca la parete (data-bd-parete con l\'SVG inline)' }
  const problemi = []
  const strati = (svg.match(/data-strato="/g) ?? []).length
  if (strati !== 4) problemi.push(`${strati} strati invece di 4`)
  const titolo = attributo((svg.match(/^<svg[^>]*>/) ?? [''])[0], 'aria-labelledby')
  if (!titolo || !new RegExp(`<title id="${titolo}">[^<]{20,}</title>`).test(svg)) problemi.push('titolo accessibile assente')
  if (!svg.includes('--bd-esplodi')) problemi.push('gli strati non dipendono da --bd-esplodi')
  if (!/prefers-reduced-motion:\s*reduce/.test(svg)) problemi.push('nessuna regola per la riduzione del movimento')
  const didascalia = testoVisibile((HERO.match(/<figcaption[\s\S]*?<\/figcaption>/) ?? [''])[0])
  if (!/Illustrazione/.test(didascalia)) problemi.push('didascalia senza «Illustrazione»')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `4 strati, titolo #${titolo}, --bd-esplodi per lo scroll, composta con la riduzione del movimento, «${didascalia}»` }
})

controllo('id unici nell\'HTML (ancore, etichette e retini SVG senza doppioni)', () => {
  const ids = [...HTML.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
  const doppi = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
  return doppi.length ? { ok: false, nota: `id ripetuti: ${doppi.join(', ')}` } : { ok: true, nota: `${ids.length} id, nessuno ripetuto` }
})

controllo('Per chi è: tre card, ognuna con una CTA secondaria verso il modulo (§6.3, §5)', () => {
  if (!PER_CHI) return { ok: false, nota: 'section#per-chi non trovata' }
  const problemi = []
  const card = (PER_CHI.match(/<li class="bd-card"/g) ?? []).length
  if (card !== 3) problemi.push(`${card} card invece di 3`)
  const cta = ctaIn(PER_CHI)
  if (cta.length !== 3 || cta.some((c) => c.primaria || c.href !== '#preventivo')) problemi.push('le CTA delle card devono essere 3, secondarie, verso #preventivo')
  const testo = testoVisibile(PER_CHI)
  const mancanti = TESTI.perChi.card.map((c) => c.titolo).filter((t) => !testo.includes(t))
  if (mancanti.length) problemi.push(`titoli mancanti: ${mancanti.join(', ')}`)
  return problemi.length ? { ok: false, nota: problemi.join('; ') } : { ok: true, nota: `3 card (${TESTI.perChi.card.map((c) => c.titolo).join(', ')}), CTA secondarie verso #preventivo` }
})

// Gli step 5 e 6 aggiungono qui gli id delle loro sezioni, nell'ordine di §6.
const ORDINE_SEZIONI = ['inizio', 'per-chi', 'come-funziona', 'preventivo']

controllo('sezioni nell\'ordine di §6', () => {
  const posizioni = ORDINE_SEZIONI.map((id) => ({ id, pos: HTML.indexOf(` id="${id}"`) }))
  const mancanti = posizioni.filter((p) => p.pos < 0).map((p) => p.id)
  if (mancanti.length) return { ok: false, nota: `mancano: ${mancanti.join(', ')}` }
  const fuori = posizioni.filter((p, i) => i > 0 && p.pos < posizioni[i - 1].pos).map((p) => p.id)
  return fuori.length ? { ok: false, nota: `fuori ordine: ${fuori.join(', ')}` } : { ok: true, nota: ORDINE_SEZIONI.join(' → ') }
})

controllo('barra mobile: CTA primaria verso il modulo, nascosta finché non serve (§6, §5)', () => {
  if (!BARRA) return { ok: false, nota: 'barra mobile non trovata nell\'HTML' }
  const problemi = []
  const tag = (BARRA.match(/^<div[^>]*>/) ?? [''])[0]
  const cta = ctaIn(BARRA)
  if (cta.length !== 1 || !cta[0].primaria || cta[0].href !== '#preventivo') problemi.push('serve una sola CTA primaria verso #preventivo')
  if (!classi(tag).includes('md:hidden')) problemi.push('non è nascosta da 768 px in su')
  if (classi(tag).includes('bd-barra-mobile--vista')) problemi.push('visibile già nel prerender')
  if (!/\sinert=""/.test(tag)) problemi.push('nel prerender non è inert')
  if (!/\.bd-barra-mobile\{[^}]*visibility:hidden/.test(CSS_SITO)) problemi.push('il CSS non la nasconde finché il JavaScript non la mostra')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: 'solo sotto 768 px, nascosta e inert nel prerender, una CTA primaria verso #preventivo' }
})

controllo('telefono e WhatsApp mai nell\'hero, nella barra mobile o accanto al modulo (§2)', () => {
  const trovati = [['hero', HERO], ['barra mobile', BARRA], ['modulo', PREVENTIVO]]
    .filter(([, html]) => /href="(tel:|https:\/\/wa\.me\/)/.test(html))
    .map(([nome]) => nome)
  return trovati.length
    ? { ok: false, nota: `link a telefono o WhatsApp in: ${trovati.join(', ')}` }
    : { ok: true, nota: 'nessun tel: né wa.me in hero, barra mobile e modulo: restano a chiusura e footer' }
})

controllo('titolo dell\'hero rivelato per righe solo da 1024 px, con ripiego (§5, §3.8)', () => {
  const problemi = []
  const testa = HTML.slice(0, HTML.indexOf('</head>'))
  const script = (testa.match(/<script>[\s\S]*?<\/script>/) ?? [''])[0]
  if (!script.includes('bd-rivela') || !script.includes('min-width: 1024px') || !script.includes('prefers-reduced-motion: no-preference')) {
    problemi.push('lo script nel head non limita bd-rivela a 1024 px senza riduzione del movimento')
  }
  if (!/<h1[^>]*data-bd-rivela=""/.test(HERO)) problemi.push('il h1 non ha data-bd-rivela')
  if (!/@keyframes bd-mostra/.test(CSS_SITO) || !/\.bd-rivela \[data-bd-rivela\]\{[^}]*bd-mostra/.test(CSS_SITO)) {
    problemi.push('manca il ripiego CSS che mostra il titolo se il JavaScript non arriva')
  }
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: 'nascosto prima del primo disegno solo da 1024 px; senza JavaScript compare da solo dopo 1,6 s' }
})

controllo('hero senza immagini in lazy loading (LCP, §9)', () => {
  const lazy = (HERO.match(/<img[^>]*loading="lazy"[^>]*>/g) ?? []).length
  return lazy
    ? { ok: false, nota: `${lazy} immagini dell'hero con loading="lazy": ritarderebbero il primo schermo` }
    : { ok: true, nota: 'nessuna immagine lazy nell\'hero (oggi il primo schermo è testo prerenderizzato e SVG inline)' }
})

controllo('ancore delle CTA verso id esistenti, primarie solo verso #preventivo (§6)', () => {
  const cta = ctaIn(HTML)
  const interne = cta.filter((c) => c.href?.startsWith('#'))
  const senzaBersaglio = [...new Set(interne.map((c) => c.href).filter((h) => !HTML.includes(` id="${h.slice(1)}"`)))]
  const primarieAltrove = cta.filter((c) => c.primaria && c.href !== '#preventivo').map((c) => c.href)
  const problemi = []
  if (senzaBersaglio.length) problemi.push(`ancore senza bersaglio: ${senzaBersaglio.join(', ')}`)
  if (primarieAltrove.length) problemi.push(`CTA primarie verso ${primarieAltrove.join(', ')}`)
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `${cta.length} CTA: ancore verso ${[...new Set(interne.map((c) => c.href))].join(' e ')}, tutte esistenti; primarie solo verso #preventivo` }
})

controllo('ingressi senza visibility hidden: tutto raggiungibile con il tasto Tab (§5, §9)', () => {
  // Solo il codice: i commenti spiegano proprio perché autoAlpha non si usa
  const motion = leggi('src/lib/bd-motion.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const usi = (motion.match(/autoAlpha|visibility\s*:\s*['"]?hidden/g) ?? []).length
  return usi
    ? { ok: false, nota: `bd-motion.ts usa autoAlpha o visibility hidden (${usi} volte): le sezioni non ancora entrate escono dal Tab` }
    : { ok: true, nota: 'ingressi con opacity: le sezioni non ancora animate restano focalizzabili e trovabili con la ricerca' }
})

// ---------- esito ----------

let ko = 0
for (const r of risultati) {
  if (!r.ok) ko++
  console.log(`${r.ok ? 'OK' : 'KO'}  ${r.nome} — ${r.nota}`)
}
console.log(`\n${risultati.length - ko} OK, ${ko} KO`)
process.exit(ko ? 1 : 0)
