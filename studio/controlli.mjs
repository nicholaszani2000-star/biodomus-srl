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

// Parole vietate da §3.13 (D.Lgs. 30/2026): «Biodomus» resta ammesso. La usa anche il controllo dello step 5 sezione per sezione.
const PAROLE_AMBIENTALI = /\b(eco|ecologic[oaie]?|green|sostenibil\w*|bio)\b|impatto zero|amica dell'ambiente/gi

controllo('nessuna asserzione ambientale generica (§3.13)', () => {
  const trovati = [...new Set((TESTO.match(PAROLE_AMBIENTALI) ?? []).map((p) => p.toLowerCase()))]
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
// Dallo step 6 le autorizzazioni dei partner sono «const P1_OK = false» e i loro dati «P1_NOME: P1_OK ? '…' : null»
const autorizzato = (chiave) => new RegExp(`\\b${chiave}\\s*[:=]\\s*true\\b`).test(DATI_TS)
const nomeDato = (chiave) => (DATI_TS.match(new RegExp(`\\b${chiave}:\\s*(?:P\\d_OK\\s*\\?\\s*)?'([^']+)'`)) ?? [])[1]

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
  const token = leggi('src/styles/bd-tokens.css').replace(/\/\*[\s\S]*?\*\//g, '')
  const chiaro = (token.match(/:root\s*\{[\s\S]*?\}/) ?? [''])[0]
  // Il blocco scuro: il selettore elenca .bd-tema-scuro (e l'header sopra l'hero)
  const scuro = (token.match(/\.bd-tema-scuro[^{]*\{[\s\S]*?\}/) ?? [''])[0]
  if (LIME.test(chiaro)) problemi.push('bd-tokens.css: lime nella palette chiara')
  if (!/--bd-dettaglio:\s*#8DC21E/i.test(scuro)) problemi.push('bd-tokens.css: nel tema scuro --bd-dettaglio non è il lime del logo')
  if (/--bd-(accento|testo|testo-2)\s*:\s*#8DC21E/i.test(token)) problemi.push('bd-tokens.css: lime usato per testi o pulsanti')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `${daControllare.length} file: verde #4F8F17 solo nel logo, lime solo in --bd-dettaglio e --bd-tondino del tema scuro` }
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
  // L'header è scuro dal primo disegno solo con JavaScript: classe bd-header--scuro nel prerender, token scuri sotto .bd-js
  if (!classi((HTML.match(/<header[^>]*>/) ?? [''])[0]).includes('bd-header--scuro')) problemi.push('l\'header prerenderizzato non ha bd-header--scuro: al caricamento cambierebbe colore')
  const testa = HTML.slice(0, HTML.indexOf('</head>'))
  if (!/classList\.add\('bd-js'\)/.test(testa)) problemi.push('lo script nel head non aggiunge bd-js')
  if (!/[^{}]*\.bd-js \.bd-header--scuro[^{}]*\{[^}]*--bd-fondo:\s*#1a1c1e/i.test(CSS_SITO)) problemi.push('i token scuri non valgono per .bd-js .bd-header--scuro')
  if (!/<meta name="theme-color" content="#1a1c1e"/i.test(HTML)) problemi.push('theme-color diverso dal fondo scuro')
  const scure = (HTML.match(/<section[^>]*class="[^"]*\bbd-tema-scuro\b/g) ?? []).length
  if (scure !== 1) problemi.push(`${scure} sezioni scure invece della sola hero`)
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: 'hero con bd-tema-scuro; header scuro dal primo disegno con JavaScript (bd-js), chiaro senza; theme-color #1a1c1e; le altre sezioni chiare' }
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
  if (/var\(--bd-esplodi,\s*(?!0\))/.test(svg)) problemi.push('senza JavaScript la parete non è composta (--bd-esplodi deve valere 0 di default)')
  if (!/\.bd-js \[data-bd-parete\] svg\{[^}]*--bd-esplodi:\s*1/.test(CSS_SITO)) problemi.push('con JavaScript la parete non parte staccata (.bd-js [data-bd-parete] svg)')
  if (!/prefers-reduced-motion:\s*reduce/.test(svg)) problemi.push('nessuna regola per la riduzione del movimento')
  const didascalia = testoVisibile((HERO.match(/<figcaption[\s\S]*?<\/figcaption>/) ?? [''])[0])
  if (!/Illustrazione/.test(didascalia)) problemi.push('didascalia senza «Illustrazione»')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `4 strati, titolo #${titolo}; senza JavaScript composta con le quote, con JavaScript staccata e ricomposta scorrendo; «${didascalia}»` }
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

// Gli id delle sezioni nell'ordine di §6. Realizzazioni e Partner solo se compaiono (autorizzazioni di §2):
// che compaiano quando devono lo verifica il controllo dello step 6.
const ORDINE_SEZIONI = [
  'inizio',
  'per-chi',
  'come-funziona',
  'ruolo',
  'sistema',
  ...['realizzazioni', 'partner'].filter((id) => HTML.includes(`<section id="${id}"`)),
  'preventivo',
  'faq',
  'chiusura',
]

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
  // env(safe-area-inset-bottom) vale più di 0 solo con viewport-fit=cover: senza, su iPhone la CTA finisce sotto la barra di sistema
  if (!/<meta name="viewport" content="[^"]*viewport-fit=cover/.test(HTML)) problemi.push('meta viewport senza viewport-fit=cover: il margine sicuro in basso non funziona')
  if (!/safe-area-inset-bottom/.test(tag + CSS_SITO)) problemi.push('nessun margine per safe-area-inset-bottom')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: 'solo sotto 768 px, nascosta e inert nel prerender, una CTA primaria verso #preventivo, margine sicuro in basso (viewport-fit=cover)' }
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
  const ripiego = (CSS_SITO.match(/\.bd-rivela \[data-bd-rivela\]\{[^}]*animation:([^;}]*bd-mostra[^;}]*)/) ?? [])[1] ?? ''
  const secondi = [...ripiego.matchAll(/(\d*\.?\d+)(m?s)\b/g)].reduce((somma, m) => somma + Number(m[1]) / (m[2] === 'ms' ? 1000 : 1), 0)
  if (!/@keyframes bd-mostra/.test(CSS_SITO) || !ripiego) problemi.push('manca il ripiego CSS che mostra il titolo se il JavaScript non arriva')
  else if (secondi > 0.8 + 1e-9) problemi.push(`il ripiego mostra il titolo dopo ${secondi} s: §5 vuole al massimo 0,8 s`)
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `nascosto prima del primo disegno solo da 1024 px; se il JavaScript tarda, il CSS lo mostra entro ${secondi} s` }
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

// §2 (decisione del 23 novembre 2026): entrano solo due illustrazioni AI, sfumate, sempre dichiarate come illustrazioni.
// Per ogni illustrazione scelta i file del kit da cui nasce (il riquadro 3 del percorso nasce dall'originale nuovo di Niko).
const ILLUSTRAZIONI_SCELTE = {
  'villa-dal-disegno': ['villa-dal-disegno-672', 'villa-dal-disegno-panoramica-1200'],
  'villa-tramonto': ['villa-tramonto-640', 'villa-tramonto-1052'],
  'percorso-1-progetto': ['percorso-1-progetto'],
  'percorso-2-fondazioni': ['percorso-2-fondazioni'],
  'percorso-3-casseri': [],
  'percorso-4-impianti': ['percorso-4-impianti'],
  'percorso-5-casa-finita': ['percorso-5-casa-finita'],
}

controllo('illustrazioni AI: solo quelle scelte, con «Illustrazione» visibile e alt che lo dice (§2, §10.9)', () => {
  const problemi = []
  const voci = (MANIFESTO?.immagini ?? []).filter((v) => v.tipo === 'illustrazione-ai')
  for (const v of voci) if (!ILLUSTRAZIONI_SCELTE[v.id]) problemi.push(`illustrazione non prevista dal brief: ${v.id}`)
  // Nel sito nessun altro file del kit (per nome o per impronta) e mai il riquadro 3 del kit: ha i muri in laterizio
  const kit = fileSotto('studio/originali/biodomus-asset/illustrazioni')
  const basiScelte = Object.values(ILLUSTRAZIONI_SCELTE).flat()
  const scelte = new Set(kit.filter((f) => basiScelte.some((b) => f.includes(`/${b}.`)) && /\.(avif|webp)$/.test(f)).map(impronta))
  const vietate = new Set(kit.map(impronta).filter((i) => !scelte.has(i)))
  const sito = [...fileSotto('src'), ...fileSotto('public'), ...(esiste('dist') ? fileSotto('dist') : [])]
  const fuori = sito.filter((f) => /percorso-3-struttura/i.test(f) || vietate.has(impronta(f)))
  if (fuori.length) problemi.push(`illustrazioni del kit non scelte nel sito: ${fuori.join(', ')}`)
  // In pagina: dentro una figure con la dicitura visibile; ogni immagine con un alt che comincia con «Illustrazione»
  const figure = HTML.match(/<figure[^>]*data-bd-illustrazione[\s\S]*?<\/figure>/g) ?? []
  if (figure.length !== 3) problemi.push(`${figure.length} gruppi di illustrazioni in pagina invece di 3 (due ville e il percorso)`)
  for (const f of figure) {
    for (const img of f.match(/<img[^>]*>/g) ?? []) {
      const alt = attributo(img, 'alt') ?? ''
      if (!alt.startsWith('Illustrazione')) problemi.push(`alt che non dice «Illustrazione»: ${alt.slice(0, 40)}`)
    }
    if (!/<figcaption[^>]*>Illustrazion[ei]\b/.test(f)) problemi.push('manca la dicitura «Illustrazione» visibile')
  }
  // Il percorso: in «Come funziona», cinque riquadri, il terzo con i casseri isolanti
  const percorso = (sezioneHtml('come-funziona').match(/<figure[^>]*bd-percorso__figura[\s\S]*?<\/figure>/) ?? [''])[0]
  const riquadri = percorso.match(/<img[^>]*>/g) ?? []
  if (riquadri.length !== 5) problemi.push(`il percorso in «Come funziona» ha ${riquadri.length} riquadri invece di 5`)
  else if (!/bd-percorso-3-casseri-/.test(riquadri[2])) problemi.push('il riquadro 3 del percorso non è quello con i casseri isolanti')
  // Posizioni: la villa dal disegno in fondo all'hero, la villa al tramonto subito prima del modulo; mai tra realizzazioni o partner
  if (!/bd-illustrazione--villa-dal-disegno/.test(HERO)) problemi.push('«villa dal disegno» non è in fondo all\'hero')
  const tramonto = HTML.indexOf('bd-illustrazione--villa-tramonto')
  const dopo = tramonto < 0 ? null : (HTML.slice(tramonto).match(/<section id="([^"]+)"/) ?? [])[1]
  if (dopo !== 'preventivo') problemi.push('«villa al tramonto» non è subito prima del modulo')
  for (const id of ['realizzazioni', 'partner']) if (/bd-illustrazione/.test(sezioneHtml(id))) problemi.push(`illustrazione dentro #${id}`)
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: 'villa dal disegno in fondo all\'hero, villa al tramonto prima del modulo, percorso del cantiere (riquadro 3 con i casseri isolanti) in «Come funziona»; tutte dichiarate; nessun altro file del kit' }
})

controllo('ingressi senza visibility hidden: tutto raggiungibile con il tasto Tab (§5, §9)', () => {
  // Solo il codice: i commenti spiegano proprio perché autoAlpha non si usa
  const motion = leggi('src/lib/bd-motion.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const usi = (motion.match(/autoAlpha|visibility\s*:\s*['"]?hidden/g) ?? []).length
  return usi
    ? { ok: false, nota: `bd-motion.ts usa autoAlpha o visibility hidden (${usi} volte): le sezioni non ancora entrate escono dal Tab` }
    : { ok: true, nota: 'ingressi con opacity: le sezioni non ancora animate restano focalizzabili e trovabili con la ricerca' }
})

// ---------- STEP 5 ----------

const COME_FUNZIONA = sezioneHtml('come-funziona')
const RUOLO = sezioneHtml('ruolo')
const SISTEMA = sezioneHtml('sistema')
// Valore di un dato di §2 da dati.ts: solo dentro l'oggetto «dati» (non nei tipi dell'interfaccia), stringa su una riga
// tra apici o virgolette (anche sulla riga dopo la chiave), oppure null. undefined se la chiave non c'è.
const DATI_OGGETTO = DATI_TS.slice(Math.max(0, DATI_TS.indexOf('export const dati')))
const valoreDato = (chiave) => {
  const m = DATI_OGGETTO.match(new RegExp(`\\b${chiave}:\\s*(?:P\\d_OK\\s*\\?\\s*)?(?:null|(['"\`])((?:(?!\\1)[^\\n])*)\\1)\\s*[,:]`))
  return m ? (m[2] ?? null) : undefined
}

controllo('«Come funziona»: sezione vera, bersaglio della CTA secondaria, 4 passaggi, tempi e CTA (§6.4, §8)', () => {
  if (!COME_FUNZIONA) return { ok: false, nota: 'manca <section id="come-funziona">' }
  const problemi = []
  if (/<div[^>]*\sid="come-funziona"/.test(HTML) || /bd-ancora/.test(HTML)) problemi.push('c\'è ancora l\'ancora provvisoria dello step 4')
  const secondaria = ctaIn(HERO).find((c) => !c.primaria)
  if (secondaria?.href !== '#come-funziona') problemi.push(`la CTA secondaria dell'hero punta a ${secondaria?.href ?? 'niente'}`)
  if (!/<header[\s\S]*?href="#come-funziona"[\s\S]*?<\/header>/.test(HTML)) problemi.push('il link «Come funziona» dell\'header non punta alla sezione')
  const passaggi = COME_FUNZIONA.match(/<li class="bd-passaggio"[\s\S]*?<\/li>/g) ?? []
  if (passaggi.length !== 4) problemi.push(`${passaggi.length} passaggi invece di 4`)
  if (!/<ol class="bd-passaggi"[^>]*data-bd-traccia/.test(COME_FUNZIONA)) problemi.push('la catena di quote non ha data-bd-traccia (linea che si disegna)')
  const icone = passaggi.filter((li) => /bd-passaggio__icona" aria-hidden="true"><svg/.test(li)).length
  if (icone !== 4) problemi.push(`${icone} icone su 4`)
  const numeri = passaggi.map((li) => testoVisibile((li.match(/<span class="bd-passaggio__numero"[^>]*>[^<]*<\/span>/) ?? [''])[0]))
  if (numeri.join(',') !== '01,02,03,04') problemi.push(`numeri dei passaggi: ${numeri.join(', ')}`)
  const tempi = valoreDato('TEMPI')
  const quarto = testoVisibile(passaggi[3] ?? '')
  if (tempi && !quarto.includes(`Tempi indicativi: ${tempi}.`)) problemi.push('il passaggio 4 non dice i tempi')
  if (!tempi && /Tempi indicativi/.test(quarto)) problemi.push('tempi citati con TEMPI vuoto')
  const cta = ctaIn(COME_FUNZIONA)
  if (cta.length !== 1 || !cta[0].primaria || cta[0].href !== '#preventivo') problemi.push('serve una CTA primaria verso #preventivo')
  else if (COME_FUNZIONA.indexOf('bd-cta--primaria') < COME_FUNZIONA.indexOf('</ol>')) problemi.push('la CTA non sta dopo il passaggio 4')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `section#come-funziona bersaglio di hero e header; 4 passaggi con icona e numero 01–04; passaggio 4 con ${tempi ? `«${tempi}»` : 'la frase senza tempi'}; CTA primaria dopo il passaggio 4` }
})

controllo('«Un solo referente»: tre colonne con elenchi veri, costo solo con COSTO_SERVIZIO, niente ritratto senza foto (§6.5, §8)', () => {
  if (!RUOLO) return { ok: false, nota: 'manca <section id="ruolo">' }
  const problemi = []
  const colonne = RUOLO.match(/<div class="bd-ruolo__colonna[^"]*">[\s\S]*?<\/ul>/g) ?? []
  if (colonne.length !== 3) problemi.push(`${colonne.length} colonne invece di 3`)
  const voci = colonne.map((c) => (c.match(/<li>/g) ?? []).length)
  const attese = TESTI.ruolo.colonne.map((c) => c.voci.length)
  if (voci.join(',') !== attese.join(',')) problemi.push(`voci per colonna ${voci.join('/')} invece di ${attese.join('/')}`)
  if (colonne.some((c) => !/<h3[^>]*>[^<]+<\/h3>\s*<ul/.test(c))) problemi.push('ogni colonna vuole un titolo h3 e un elenco ul')
  const costo = valoreDato('COSTO_SERVIZIO')
  const riquadro = /data-bd-costo/.test(RUOLO)
  if (costo === null && riquadro) problemi.push('COSTO_SERVIZIO è vuoto ma il riquadro del costo è nell\'HTML')
  if (costo && !riquadro) problemi.push('manca il riquadro «Quanto costa il servizio»')
  if (costo && riquadro && !testoVisibile(RUOLO).includes(costo.trim())) problemi.push('il riquadro non riporta COSTO_SERVIZIO di §2')
  const fotoReferente = fileSotto('studio/originali', (n) => /(mirko|lanzafame|ritratto|referente)/i.test(n) && /\.(jpe?g|png|webp|avif|heic)$/i.test(n))
  if (!fotoReferente.length && /<img/.test(RUOLO)) problemi.push('immagine nel ruolo senza una foto del referente negli originali')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : {
        ok: true,
        nota: `3 colonne (${voci.join('/')} voci in ul); ${costo ? 'riquadro del costo con COSTO_SERVIZIO' : 'COSTO_SERVIZIO vuoto: nessun riquadro'}; ${fotoReferente.length ? 'foto del referente presente' : 'nessuna foto del referente: niente ritratto né segnaposto'}`,
      }
})

controllo('«Com\'è fatta la casa»: parete chiara e 4 pulsanti degli strati con aria-expanded, aria-controls e nome (§6.6)', () => {
  if (!SISTEMA) return { ok: false, nota: 'manca <section id="sistema">' }
  const problemi = []
  const svg = (SISTEMA.match(/data-bd-parete=""[^>]*>\s*(<svg[\s\S]*?<\/svg>)/) ?? [])[1] ?? ''
  if (!svg) problemi.push('manca la parete (data-bd-parete con l\'SVG inline)')
  else {
    if (!/<svg[^>]*class="bdss"/.test(svg)) problemi.push('la parete non usa il prefisso bdss')
    if ((svg.match(/data-strato="/g) ?? []).length !== 4) problemi.push('la parete non ha 4 strati')
    if (/<button/.test(svg)) problemi.push('pulsanti dentro l\'SVG (role="img")')
  }
  if (/class="[^"]*\bbd-tema-scuro\b/.test((SISTEMA.match(/^<section[^>]*>/) ?? [''])[0])) problemi.push('la sezione è scura: la parete grande qui è nella versione chiara')
  if (!testoVisibile(SISTEMA).includes(TESTI.sistema.nota)) problemi.push(`manca la nota «${TESTI.sistema.nota}»`)
  const pulsanti = SISTEMA.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []
  if (pulsanti.length !== 4) problemi.push(`${pulsanti.length} pulsanti invece di 4`)
  pulsanti.forEach((tag, i) => {
    const apertura = (tag.match(/^<button[^>]*>/) ?? [''])[0]
    const nome = (attributo(apertura, 'aria-label') ?? testoVisibile(tag)).trim()
    const controlla = attributo(apertura, 'aria-controls')
    if (!/\saria-expanded="(true|false)"/.test(apertura)) problemi.push(`pulsante ${i + 1} senza aria-expanded`)
    if (!controlla || !SISTEMA.includes(` id="${controlla}"`)) problemi.push(`pulsante ${i + 1}: aria-controls verso un id che non c'è`)
    if (!nome || !nome.includes(TESTI.sistema.strati[i]?.titolo ?? '§')) problemi.push(`pulsante ${i + 1} senza il nome dello strato`)
    if (attributo(apertura, 'type') !== 'button') problemi.push(`pulsante ${i + 1} senza type="button"`)
  })
  // Senza JavaScript tutti i riquadri sono aperti: le frasi di §8 sono nell'HTML
  const frasi = TESTI.sistema.strati.filter((s) => !testoVisibile(SISTEMA).includes(s.testo))
  if (frasi.length) problemi.push(`frasi degli strati mancanti nell'HTML: ${frasi.map((s) => s.titolo).join(', ')}`)
  const cta = ctaIn(SISTEMA)
  if (cta.length !== 1 || !cta[0].primaria || cta[0].href !== '#preventivo') problemi.push('serve una CTA primaria verso #preventivo')
  else if (SISTEMA.indexOf('bd-cta--primaria') < SISTEMA.lastIndexOf('bd-strati__riquadro')) problemi.push('la CTA non sta dopo i riquadri')
  // Fatti solo se presenti: classe con P1_OK, garanzia con GARANZIA
  const testo = testoVisibile(SISTEMA)
  if (!autorizzato('P1_OK') && /classe energetica/i.test(testo)) problemi.push('classe energetica senza P1_OK «sì»')
  if (valoreDato('GARANZIA') === null && /garanzi/i.test(testo)) problemi.push('garanzia citata con GARANZIA vuota')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: '4 <button type="button"> fuori dall\'SVG, con aria-expanded, aria-controls verso il loro riquadro e il nome dello strato; frasi tutte nell\'HTML (aperte senza JavaScript); parete bdss chiara con la nota; CTA dopo i riquadri; nessun fatto senza dato' }
})

controllo('RAPPORTO_PARTNER non confermato: in «Com\'è fatta la casa» nessun nome del produttore del sistema (§2)', () => {
  const rapporto = valoreDato('RAPPORTO_PARTNER')
  const p2 = valoreDato('P2_NOME')
  if (rapporto === 'sì, confermato per iscritto') return { ok: true, nota: 'rapporto confermato per iscritto: il collegamento è ammesso' }
  if (!SISTEMA) return { ok: false, nota: 'manca <section id="sistema">' }
  const testo = testoVisibile(SISTEMA)
  const trovati = [p2, p2?.split(/\s+/)[0]].filter((n) => n && n.length > 3 && testo.toLowerCase().includes(n.toLowerCase()))
  return trovati.length
    ? { ok: false, nota: `RAPPORTO_PARTNER «${rapporto}» ma in #sistema compare ${trovati[0]}` }
    : { ok: true, nota: `RAPPORTO_PARTNER «${rapporto}»: in #sistema solo SISTEMA, nessuna citazione di ${p2}` }
})

controllo('parole vietate da §3.13 anche nelle sezioni nuove, nell\'HTML e in testi.json', () => {
  const sezioni = { 'come-funziona': COME_FUNZIONA, ruolo: RUOLO, sistema: SISTEMA }
  const problemi = []
  for (const [id, html] of Object.entries(sezioni)) {
    if (!html) {
      problemi.push(`#${id} non trovata`)
      continue
    }
    const testo = testoVisibile(html)
    if (!TESTO.includes(testo.slice(0, 60))) problemi.push(`#${id} fuori dal testo controllato da §3.13`)
    const parole = [...new Set((testo.match(PAROLE_AMBIENTALI) ?? []).map((p) => p.toLowerCase()))]
    if (parole.length) problemi.push(`#${id}: ${parole.join(', ')}`)
  }
  const copy = JSON.stringify([TESTI.comeFunziona, TESTI.ruolo, TESTI.sistema])
  const nelCopy = [...new Set((copy.match(PAROLE_AMBIENTALI) ?? []).map((p) => p.toLowerCase()))]
  if (nelCopy.length) problemi.push(`testi.json: ${nelCopy.join(', ')}`)
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: '#come-funziona, #ruolo e #sistema dentro il controllo di §3.13 e senza parole vietate, anche nel copy di testi.json' }
})

// ---------- STEP 6 ----------

const FAQ = sezioneHtml('faq')
const CHIUSURA = sezioneHtml('chiusura')
const FOOTER = (HTML.match(/<footer[\s\S]*?<\/footer>/) ?? [''])[0]
// Le righe di REALIZZAZIONI_TESTO in dati.ts: nome · comune · m² · anno · classe («–» = comune non indicato)
const TESTO_REALIZZAZIONI = (DATI_TS.match(/REALIZZAZIONI_TESTO = `([\s\S]*?)`/) ?? [])[1]
const RIGHE_REALIZZAZIONI = (TESTO_REALIZZAZIONI ?? '')
  .split('\n')
  .map((riga) => riga.trim())
  .filter(Boolean)
  .map((riga) => {
    const [nome, comune] = riga.split('·').map((parte) => parte.trim())
    return { nome, comune: comune && comune !== '–' ? comune : null }
  })
const REALIZZAZIONI_RIGHE = RIGHE_REALIZZAZIONI.length
// Come diventa un nome nei file (studio/immagini.mjs): «Villa Mary» → «villa-mary»
const comeFile = (testo) =>
  testo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
const nomeAutorizzati = [1, 2].filter((n) => autorizzato(`P${n}_OK`))

// I testi di testi.json con i dati di §2, come li risolve bd-testi.ts: null se un dato è vuoto, maiuscola se il testo
// comincia con un dato, un punto solo se il dato finisce con il punto («S.r.l.»).
function risolviTesto(modello) {
  let vuoto = false
  const senzaPuntoDoppio = modello.replace(/\{([A-Z][A-Z0-9_]*)\}\./g, (intero, k) => (valoreDato(k)?.endsWith('.') ? `{${k}}` : intero))
  const testo = senzaPuntoDoppio.replace(/\{([A-Z][A-Z0-9_]*)\}/g, (_, k) => {
    const v = valoreDato(k)
    if (v === null || v === undefined) vuoto = true
    return v ?? ''
  })
  if (vuoto) return null
  return modello.startsWith('{') ? testo.charAt(0).toUpperCase() + testo.slice(1) : testo
}

controllo('partner senza autorizzazione: né nome né sito né realizzazioni né file in dist, nemmeno nel JavaScript (§2, §10.7)', () => {
  const problemi = []
  const testiDist = esiste('dist') ? fileSotto('dist', (n) => /\.(html|js|css|json|svg|txt|xml|webmanifest)$/.test(n)) : []
  const impronteDist = new Set((esiste('dist') ? fileSotto('dist') : []).map(impronta))
  const controllati = []
  for (const n of [1, 2]) {
    if (autorizzato(`P${n}_OK`)) continue
    const nome = nomeDato(`P${n}_NOME`)
    const parola = nome?.split(/\s+/)[0]
    const dominio = (DATI_TS.match(new RegExp(`\\bP${n}_SITO:[^\\n]*?'https?://(?:www\\.)?([^/']+)`)) ?? [])[1]
    controllati.push(`P${n} (${parola ?? '?'})`)
    // Realizzazioni di P1: per ogni riga il nome (anche come nome di file, «villa-mary») e il comune se non è «–».
    // I comuni dicono dove stanno case di clienti: senza autorizzazione nemmeno il JavaScript li deve contenere.
    if (n === 1 && TESTO_REALIZZAZIONI === undefined) problemi.push('REALIZZAZIONI_TESTO non trovato in dati.ts: le realizzazioni non si possono verificare')
    const daNascondere = n === 1 ? [...new Set(RIGHE_REALIZZAZIONI.flatMap(({ nome, comune }) => [nome, comeFile(nome), comune].filter(Boolean)))] : []
    for (const f of testiDist) {
      const testo = leggi(f)
      const minuscolo = testo.toLowerCase()
      if (parola && new RegExp(`\\b${parola}\\b`, 'i').test(testo)) problemi.push(`${f} contiene «${parola}»`)
      if (dominio && minuscolo.includes(dominio.toLowerCase())) problemi.push(`${f} contiene ${dominio}`)
      for (const voce of daNascondere) if (minuscolo.includes(voce.toLowerCase())) problemi.push(`${f} contiene «${voce}»`)
    }
    // Foto (P1, src/assets/img) e loghi (src/assets/partner): nessuna copia in dist, nemmeno con un nome diverso
    const fileDelPartner = [
      ...(n === 1 && esiste('src/assets/img') ? fileSotto('src/assets/img', (x) => !x.startsWith('.')) : []),
      ...(esiste('src/assets/partner') ? fileSotto('src/assets/partner', (x) => parola && x.toLowerCase().includes(parola.toLowerCase())) : []),
    ]
    for (const f of fileDelPartner) if (impronteDist.has(impronta(f))) problemi.push(`${f} è arrivato in dist`)
  }
  if (!controllati.length) return { ok: true, nota: 'P1 e P2 autorizzati: nomi, loghi e foto ammessi' }
  return problemi.length
    ? { ok: false, nota: [...new Set(problemi)].join('; ') }
    : {
        ok: true,
        nota: `${controllati.join(' e ')} non autorizzati: nome, dominio del sito, foto e loghi${autorizzato('P1_OK') ? '' : `, nomi e comuni delle ${REALIZZAZIONI_RIGHE} realizzazioni di P1`} assenti da tutti i ${testiDist.length} file di testo di dist e da ogni asset`,
      }
})

controllo('Realizzazioni e Partner solo con autorizzazione; CTA dopo Sistema se le realizzazioni non ci sono (§2, §6)', () => {
  const problemi = []
  const realizzazioni = sezioneHtml('realizzazioni')
  const partner = sezioneHtml('partner')
  const conRealizzazioni = autorizzato('P1_OK') && REALIZZAZIONI_RIGHE > 0
  if (!conRealizzazioni && realizzazioni) problemi.push('#realizzazioni c\'è senza P1_OK «sì»')
  if (conRealizzazioni && !realizzazioni) problemi.push('#realizzazioni manca con P1_OK «sì»')
  const ctaSistema = ctaIn(SISTEMA).filter((c) => c.primaria).length
  if (!conRealizzazioni && ctaSistema !== 1) problemi.push('senza realizzazioni la CTA deve stare dopo BdSistema')
  if (conRealizzazioni) {
    if (ctaSistema) problemi.push('con le realizzazioni la CTA si sposta da BdSistema a BdRealizzazioni')
    if (ctaIn(realizzazioni).filter((c) => c.primaria && c.href === '#preventivo').length !== 1) problemi.push('#realizzazioni senza la CTA «Voglio una casa così»')
    const card = (realizzazioni.match(/data-bd-realizzazione/g) ?? []).length
    if (card !== REALIZZAZIONI_RIGHE) problemi.push(`${card} card invece di ${REALIZZAZIONI_RIGHE}`)
    if (/data-bd-illustrazione/.test(realizzazioni)) problemi.push('data-bd-illustrazione in #realizzazioni (è solo per le illustrazioni AI)')
  }
  if (!nomeAutorizzati.length && partner) problemi.push('#partner c\'è senza partner autorizzati')
  if (nomeAutorizzati.length) {
    const voci = (partner.match(/<li class="bd-partner__voce"/g) ?? []).length
    if (voci !== nomeAutorizzati.length) problemi.push(`${voci} partner in pagina invece di ${nomeAutorizzati.length}`)
    if (nomeAutorizzati.length === 1 && testoVisibile(partner).includes(TESTI.partner.titolo)) problemi.push('titolo al plurale con un partner solo')
  }
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : {
        ok: true,
        nota: `${conRealizzazioni ? `#realizzazioni con ${REALIZZAZIONI_RIGHE} card e la CTA` : 'P1_OK «no»: #realizzazioni assente, CTA dopo BdSistema'}; ${nomeAutorizzati.length ? `#partner con ${nomeAutorizzati.length} partner` : 'nessun partner autorizzato: #partner assente'}`,
      }
})

controllo('link esterni con rel="noopener" (§6.8, §8)', () => {
  const pagine = ['dist/index.html', 'dist/grazie.html', 'dist/privacy.html', 'dist/cookie.html', 'dist/404.html'].filter(esiste)
  const esterni = pagine.flatMap((f) => (leggi(f).match(/<a\b[^>]*href="(?:https?:)?\/\/[^"]*"[^>]*>/g) ?? []).map((tag) => ({ f, tag })))
  const senza = esterni.filter(({ tag }) => !(attributo(tag, 'rel') ?? '').split(/\s+/).includes('noopener'))
  return senza.length
    ? { ok: false, nota: `senza rel="noopener": ${senza.map(({ tag }) => attributo(tag, 'href')).join(', ')}` }
    : { ok: true, nota: `${esterni.length} link esterni, tutti con rel="noopener" (${[...new Set(esterni.map(({ tag }) => new URL(attributo(tag, 'href')).host))].join(', ')})` }
})

controllo('FAQ: le domande di §8 con tutte le risposte nell\'HTML prerenderizzato; senza COSTO_SERVIZIO niente domanda 5 (§6.10)', () => {
  if (!FAQ) return { ok: false, nota: 'manca <section id="faq">' }
  const problemi = []
  const attese = TESTI.faq.voci.map((v) => ({ domanda: risolviTesto(v.domanda), risposta: risolviTesto(v.risposta) })).filter((v) => v.domanda && v.risposta)
  const atteseNumero = valoreDato('COSTO_SERVIZIO') === null ? 7 : 8
  if (attese.length !== atteseNumero) problemi.push(`${attese.length} domande da testi.json e dati.ts invece di ${atteseNumero}`)
  const voci = (FAQ.match(/<details class="bd-faq__voce"/g) ?? []).length
  if (voci !== attese.length) problemi.push(`${voci} voci <details> nel prerender invece di ${attese.length}`)
  const testo = testoVisibile(FAQ)
  const mancanti = attese.filter((v) => !testo.includes(v.domanda) || !testo.includes(v.risposta)).map((v) => v.domanda)
  if (mancanti.length) problemi.push(`risposte non nell'HTML: ${mancanti.join(' · ')}`)
  if (valoreDato('COSTO_SERVIZIO') === null && /Quanto costa il servizio/.test(testo)) problemi.push('domanda 5 presente con COSTO_SERVIZIO vuoto')
  if (!/<summary class="bd-faq__domanda"/.test(FAQ)) problemi.push('senza JavaScript le domande non sono <summary>')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `${attese.length} domande in <details> con le risposte nell'HTML (dopo l'hydration: button con aria-expanded e aria-controls, una aperta per volta)` }
})

controllo('CTA verso #preventivo tra 6 e 8, barra mobile esclusa (§6)', () => {
  const senzaBarra = BARRA ? HTML.replace(BARRA, '') : HTML
  const verso = ctaIn(senzaBarra).filter((c) => c.href === '#preventivo')
  const dove = ['header', ...['inizio', 'per-chi', 'come-funziona', 'sistema', 'realizzazioni', 'chiusura'].filter((id) => ctaIn(sezioneHtml(id)).some((c) => c.href === '#preventivo'))]
  const ok = verso.length >= 6 && verso.length <= 8
  return { ok, nota: `${verso.length} CTA verso #preventivo (${verso.filter((c) => c.primaria).length} primarie): ${dove.join(', ')}` }
})

controllo('telefono e WhatsApp solo in BdChiusura e nel footer, con il numero di TELEFONO (§2, §8)', () => {
  const telefono = valoreDato('TELEFONO')
  const tutti = [...HTML.matchAll(/href="((?:tel:|https:\/\/wa\.me\/)[^"]*)"/g)].map((m) => m[1])
  if (!telefono) return tutti.length ? { ok: false, nota: `TELEFONO vuoto ma ci sono ${tutti.length} link` } : { ok: true, nota: 'TELEFONO vuoto: nessun link tel: né wa.me' }
  const problemi = []
  const cifre = telefono.replace(/\D/g, '')
  const internazionale = cifre.startsWith('39') ? cifre : `39${cifre}`
  const nelleDue = [...`${CHIUSURA}${FOOTER}`.matchAll(/href="((?:tel:|https:\/\/wa\.me\/)[^"]*)"/g)].map((m) => m[1])
  if (nelleDue.length !== tutti.length) problemi.push(`${tutti.length - nelleDue.length} link fuori da chiusura e footer`)
  for (const href of tutti) {
    if (href.startsWith('tel:') && href !== `tel:+${internazionale}`) problemi.push(`${href} invece di tel:+${internazionale}`)
    if (href.startsWith('https://wa.me/') && href !== `https://wa.me/${internazionale}`) problemi.push(`${href} invece di https://wa.me/${internazionale}`)
  }
  const whatsapp = /WHATSAPP:\s*true/.test(DATI_OGGETTO)
  const wa = tutti.filter((h) => h.includes('wa.me')).length
  if (!whatsapp && wa) problemi.push('WHATSAPP «no» ma c\'è un link wa.me')
  if (whatsapp && (!/wa\.me/.test(CHIUSURA) || !/wa\.me/.test(FOOTER))) problemi.push('WhatsApp manca in chiusura o nel footer')
  if (!/tel:/.test(CHIUSURA) || !/tel:/.test(FOOTER)) problemi.push('«Chiama» manca in chiusura o nel footer')
  const waTag = (`${CHIUSURA}${FOOTER}`.match(/<a\b[^>]*wa\.me[^>]*>/g) ?? []).filter((t) => attributo(t, 'target') !== '_blank')
  if (waTag.length) problemi.push('link WhatsApp senza target="_blank"')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `${tutti.length} link (tel:+${internazionale}${whatsapp ? `, https://wa.me/${internazionale}` : ''}), tutti in chiusura e footer` }
})

// ---------- STEP 7 ----------

const PAGINE_STATICHE = ['privacy.html', 'cookie.html', 'grazie.html', '404.html']
const TOML = esiste('netlify.toml') ? leggi('netlify.toml') : ''
// Le regole [[headers]] di netlify.toml (stesso sottoinsieme di TOML che legge l'anteprima)
const REGOLE_HEADER = TOML.split(/^\[\[headers\]\]\s*$/m)
  .slice(1)
  .map((pezzo) => {
    const corpo = pezzo.split(/^\[(?!headers\.values\])/m)[0]
    const valori = Object.fromEntries([...corpo.matchAll(/^\s*([A-Za-z-]+)\s*=\s*"((?:[^"\\]|\\.)*)"/gm)].map((m) => [m[1], m[2]]))
    return { per: valori.for, valori }
  })
const HEADER_TUTTE = REGOLE_HEADER.find((r) => r.per === '/*')?.valori ?? {}
const CSP = HEADER_TUTTE['Content-Security-Policy'] ?? ''
const direttivaCsp = (nome) =>
  (CSP.split(';').map((d) => d.trim()).find((d) => d.split(/\s+/)[0] === nome) ?? '').split(/\s+/).slice(1)
const sha256 = (testo) => `'sha256-${createHash('sha256').update(testo, 'utf8').digest('base64')}'`
const TESTA = (HTML.match(/<head>[\s\S]*<\/head>/) ?? [''])[0]
const metaContenuto = (attributo, nome) => (TESTA.match(new RegExp(`<meta ${attributo}="${nome}" content="([^"]*)"`)) ?? [])[1]
const decodifica = (testo) => (testo ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const ORIGINE = (() => {
  const dominio = valoreDato('DOMINIO')
  return dominio ? `https://${dominio}/` : `https://${valoreDato('NETLIFY_SITO') ?? 'biodomus'}.netlify.app/`
})()

controllo('pagine statiche: privacy, cookie, grazie e 404 con titolare e partita IVA, senza script né stili inline (§4, §10.1)', () => {
  const problemi = []
  const titolare = valoreDato('TITOLARE')
  const piva = valoreDato('PIVA')
  for (const file of PAGINE_STATICHE) {
    if (!esiste(`dist/${file}`)) {
      problemi.push(`manca dist/${file}`)
      continue
    }
    const pagina = leggi(`dist/${file}`)
    const testo = testoVisibile(pagina)
    if (titolare && piva) {
      if (!testo.includes(titolare) || !testo.includes(piva)) problemi.push(`${file} senza ${titolare} o P.IVA ${piva}`)
    } else if (!/class="bd-avviso/.test(pagina)) problemi.push(`${file}: TITOLARE o PIVA vuoti e nessun riquadro di avviso`)
    if (/<script\b|<style\b|\sstyle="/.test(pagina)) problemi.push(`${file} ha script o stili inline`)
    if (!/<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"/.test(pagina)) problemi.push(`${file} senza il CSS della landing`)
    if (!/<html[^>]*\blang="it"/.test(pagina) || !/<h1[\s>]/.test(pagina)) problemi.push(`${file} senza lang="it" o senza h1`)
    if (/<!--bd-|DA COMPILARE|\{[A-Z_]+\}/.test(pagina)) problemi.push(`${file} con segnaposti non risolti`)
    const noindex = /<meta name="robots" content="noindex"/.test(pagina)
    if (['grazie.html', '404.html'].includes(file) !== noindex) problemi.push(`${file}: noindex ${noindex ? 'di troppo' : 'mancante'}`)
  }
  const nonTrovata = esiste('dist/404.html') ? leggi('dist/404.html') : ''
  if (!/href="\/"/.test(nonTrovata) || !/href="\/#preventivo"/.test(nonTrovata)) problemi.push('404 senza link alla home e al modulo')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `${PAGINE_STATICHE.length} pagine con ${titolare} e P.IVA ${piva}, CSS esterno, nessuno script né stile inline; grazie e 404 noindex` }
})

controllo('informativa privacy (art. 13) e cookie policy: contenuti di §10, data di aggiornamento e riquadro da far verificare', () => {
  const problemi = []
  const privacy = testoVisibile(esiste('dist/privacy.html') ? leggi('dist/privacy.html') : '')
  const cookie = testoVisibile(esiste('dist/cookie.html') ? leggi('dist/cookie.html') : '')
  for (const [nome, testo] of [['privacy', privacy], ['cookie', cookie]]) {
    if (!/Ultimo aggiornamento: \d{1,2} \w+ \d{4}/.test(testo)) problemi.push(`${nome}: manca la data di aggiornamento`)
  }
  const attesiPrivacy = {
    'titolare e sede': [valoreDato('TITOLARE'), valoreDato('SEDE')],
    finalità: ['preparare il preventivo'],
    'base giuridica (6.1.b, 6.1.a)': ['lettera b', 'lettera a'],
    'destinatari: impresa partner': ["l'impresa partner che costruisce", "l'impresa partner che produce il sistema costruttivo"],
    'fornitori': ['Netlify', 'Supabase', 'Brevo', 'Meta Platforms Ireland Limited'],
    'trasferimenti fuori UE': ['Data Privacy Framework', 'clausole contrattuali standard'],
    'conservazione 24 mesi': ['24 mesi'],
    diritti: ['accesso', 'rettifica', 'cancellazione', 'portabilità', 'opposizione', 'revocare il consenso'],
    'reclamo al Garante': ['Garante per la protezione dei dati personali'],
  }
  for (const [cosa, parole] of Object.entries(attesiPrivacy)) {
    const mancano = parole.filter((parola) => parola && !privacy.includes(parola))
    if (mancano.length) problemi.push(`privacy senza ${cosa} (${mancano.join(', ')})`)
  }
  if (/newsletter/i.test(privacy) && !/Non usiamo i tuoi dati per newsletter/.test(privacy)) problemi.push('privacy: uso per newsletter')
  for (const parola of ['localStorage', '_fbp', '_fbc', '90 giorni', '6 mesi', 'cambia la tua scelta']) {
    if (!cookie.includes(parola)) problemi.push(`cookie senza «${parola}»`)
  }
  // Correzioni dello step 7: niente bd-utm né sessionStorage; utm sì, fbclid solo con il consenso; hash, non cifratura;
  // contitolarità con Meta (art. 26) con il link al Controller Addendum
  if (/bd-utm|sessionStorage/.test(cookie)) problemi.push('cookie policy con bd-utm o sessionStorage, che non esistono più')
  const attesiCorrezioni = [
    "i parametri della campagna da cui arrivi (utm) e, solo se accetti i cookie di marketing, l'identificativo del clic sull'annuncio (fbclid)",
    'pseudonimizzati con una funzione di hash (SHA-256), che Meta confronta con i dati dei suoi utenti',
    `${valoreDato('TITOLARE')} e Meta Platforms Ireland Limited sono contitolari del trattamento (articolo 26 del GDPR)`,
    'Dopo la trasmissione Meta tratta i dati come titolare autonomo. Puoi esercitare i tuoi diritti anche nei confronti di Meta.',
  ]
  for (const frase of attesiCorrezioni) if (!privacy.includes(frase)) problemi.push(`privacy senza «${frase.slice(0, 50)}…»`)
  if (/cifrati/.test(privacy)) problemi.push('privacy: «cifrati» (un hash non è una cifratura)')
  const privacyHtml = esiste('dist/privacy.html') ? leggi('dist/privacy.html') : ''
  for (const link of ['https://www.facebook.com/legal/controller_addendum', 'https://www.facebook.com/privacy/policy/']) {
    if (!privacyHtml.includes(`href="${link}"`)) problemi.push(`privacy senza il link ${link}`)
  }
  if (!/href="\/#gestisci-cookie"/.test(esiste('dist/cookie.html') ? leggi('dist/cookie.html') : '')) problemi.push('cookie senza il link che riapre la scelta')
  for (const file of ['privacy.html', 'cookie.html']) {
    const ambientali = testoVisibile(esiste(`dist/${file}`) ? leggi(`dist/${file}`) : '').replace(/Biodomus/g, '').match(PAROLE_AMBIENTALI)
    if (ambientali) problemi.push(`${file}: asserzioni ambientali (${[...new Set(ambientali)].join(', ')})`)
  }
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: 'titolare, finalità, basi giuridiche, impresa partner e fornitori, trasferimenti, 24 mesi, diritti, Garante; fbclid solo con il consenso, hash (non cifratura), contitolarità con Meta e link al Controller Addendum; cookie tecnico e _fbp/_fbc a 90 giorni; data in tutte e due' }
})

controllo('Meta solo da bd-traccia.ts: nel sorgente e nel bundle nessun altro file contatta facebook (§10 punto 4)', () => {
  const problemi = []
  const META = /facebook\.(?:com|net)|fbevents|\bfbq\s*\(/
  // testi.json ha i link alle informative di Meta: sono testi delle pagine statiche e il bundle non li porta (vite.config.ts)
  const sorgenti = fileSotto('src', (n) => /\.(ts|tsx|js|jsx|css|html)$/.test(n)).filter((f) => !f.endsWith('src/lib/bd-traccia.ts') && META.test(leggi(f)))
  if (sorgenti.length) problemi.push(`riferimenti a Meta fuori da bd-traccia.ts: ${sorgenti.join(', ')}`)
  const traccia = ASSETS.filter((f) => /^bd-traccia-[\w-]+\.js$/.test(f))
  if (traccia.length !== 1) problemi.push(`bd-traccia non è un file a parte in dist/assets (${traccia.length})`)
  const altri = ASSETS.filter((f) => f.endsWith('.js') && !traccia.includes(f) && /facebook\.(?:com|net)|fbevents/.test(leggi(`dist/assets/${f}`)))
  if (altri.length) problemi.push(`facebook nel bundle fuori da bd-traccia: ${altri.join(', ')}`)
  for (const file of ['index.html', ...PAGINE_STATICHE].filter((f) => esiste(`dist/${f}`))) {
    const pagina = leggi(`dist/${file}`)
    const richieste = [...pagina.matchAll(/<(?:script|img|link|iframe|source)\b[^>]*\b(?:src|href)="([^"]*facebook[^"]*)"/g)].map((m) => m[1])
    if (richieste.length) problemi.push(`${file} carica ${richieste.join(', ')}`)
  }
  if (traccia.length === 1 && !/connect\.facebook\.net\/en_US\/fbevents\.js/.test(leggi(`dist/assets/${traccia[0]}`))) problemi.push('bd-traccia senza lo script ufficiale del Pixel')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `facebook.com e facebook.net solo in ${traccia[0]} (import dinamico dopo l'hydration); nessun tag che carica Meta nelle pagine` }
})

controllo('header di netlify.toml: CSP con gli hash di dist/index.html, niente unsafe-inline, nosniff, referrer, permessi, cache (§4)', () => {
  const problemi = []
  if (!CSP) return { ok: false, nota: 'manca Content-Security-Policy per "/*" in netlify.toml' }
  const scriptSrc = direttivaCsp('script-src')
  const styleSrc = direttivaCsp('style-src')
  const scriptInline = [...HTML.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => sha256(m[1]))
  const stiliInline = [...HTML.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => sha256(m[1]))
  if (!scriptInline.length) problemi.push('dist/index.html senza lo script dell\'angolo')
  const scriptMancanti = scriptInline.filter((h) => !scriptSrc.includes(h))
  if (scriptMancanti.length) problemi.push(`script-src senza l'hash dello script dell'angolo ${scriptMancanti.join(' ')}`)
  const stiliMancanti = stiliInline.filter((h) => !styleSrc.includes(h) && !styleSrc.includes("'unsafe-inline'"))
  if (stiliMancanti.length) problemi.push(`style-src senza ${stiliMancanti.length} hash dei <style>`)
  if (scriptSrc.includes("'unsafe-inline'") || scriptSrc.includes("'unsafe-eval'")) problemi.push("script-src con 'unsafe-inline' o 'unsafe-eval'")
  const attese = {
    'default-src': ["'self'"],
    'script-src': ["'self'", 'https://connect.facebook.net'],
    'img-src': ["'self'", 'https://www.facebook.com'],
    'connect-src': ["'self'", 'https://www.facebook.com'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }
  for (const [nome, valori] of Object.entries(attese)) {
    const presenti = direttivaCsp(nome)
    const mancano = valori.filter((v) => !presenti.includes(v))
    if (mancano.length) problemi.push(`${nome} senza ${mancano.join(' ')}`)
  }
  const esterni = CSP.match(/https?:\/\/[^\s;]+/g) ?? []
  const ammessi = new Set(['https://connect.facebook.net', 'https://www.facebook.com'])
  const altriHost = esterni.filter((h) => !ammessi.has(h))
  if (altriHost.length) problemi.push(`host esterni non previsti: ${altriHost.join(', ')}`)
  if (HEADER_TUTTE['X-Content-Type-Options'] !== 'nosniff') problemi.push('manca X-Content-Type-Options: nosniff')
  if (HEADER_TUTTE['Referrer-Policy'] !== 'strict-origin-when-cross-origin') problemi.push('Referrer-Policy diversa da strict-origin-when-cross-origin')
  const permessi = HEADER_TUTTE['Permissions-Policy'] ?? ''
  for (const p of ['camera=()', 'microphone=()', 'geolocation=()']) if (!permessi.includes(p)) problemi.push(`Permissions-Policy senza ${p}`)
  const cache = REGOLE_HEADER.find((r) => r.per === '/assets/*')?.valori['Cache-Control'] ?? ''
  if (!/max-age=31536000/.test(cache) || !/immutable/.test(cache)) problemi.push('/assets/* senza Cache-Control di un anno immutable')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : {
        ok: true,
        nota: `script-src con l'hash dello script dell'angolo ${scriptInline[0]}; style-src con ${stiliInline.length} hash dei <style>${styleSrc.includes("'unsafe-inline'") ? " e 'unsafe-inline'" : ", senza 'unsafe-inline'"}; Pixel solo connect.facebook.net e www.facebook.com; nosniff, referrer, permessi, cache immutable`,
      }
})

controllo('dati strutturati JSON-LD Organization e WebSite: JSON valido e senza campi vuoti, niente recensioni né prezzi', () => {
  const blocchi = [...HTML.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1])
  if (blocchi.length !== 1) return { ok: false, nota: `${blocchi.length} blocchi JSON-LD invece di 1` }
  let dati
  try {
    dati = JSON.parse(blocchi[0])
  } catch (errore) {
    return { ok: false, nota: `JSON-LD non valido: ${errore.message}` }
  }
  const problemi = []
  const vuoti = []
  const visita = (valore, percorso) => {
    if (valore === null || valore === '' || (Array.isArray(valore) && !valore.length) || (typeof valore === 'object' && !Array.isArray(valore) && !Object.keys(valore).length)) vuoti.push(percorso)
    else if (Array.isArray(valore)) valore.forEach((v, i) => visita(v, `${percorso}[${i}]`))
    else if (typeof valore === 'object') for (const [k, v] of Object.entries(valore)) visita(v, `${percorso}.${k}`)
  }
  visita(dati, 'jsonld')
  if (vuoti.length) problemi.push(`campi vuoti: ${vuoti.join(', ')}`)
  const grafo = dati['@graph'] ?? []
  const org = grafo.find((n) => n['@type'] === 'Organization')
  const sito = grafo.find((n) => n['@type'] === 'WebSite')
  if (!org || !sito) problemi.push('manca Organization o WebSite')
  if (org) {
    if (org.name !== valoreDato('BRAND')) problemi.push(`name ${org.name} invece di ${valoreDato('BRAND')}`)
    if (org.url !== ORIGINE) problemi.push(`url ${org.url} invece di ${ORIGINE}`)
    if (!/^https:\/\/.+\.(png|jpg|svg)$/.test(org.logo ?? '') || !esiste(`dist/${new URL(org.logo).pathname.slice(1)}`)) problemi.push(`logo ${org.logo} non valido`)
    const email = valoreDato('EMAIL_PUBBLICA') ?? valoreDato('EMAIL_LEAD')
    if (org.email !== email) problemi.push(`email ${org.email} invece di ${email}`)
  }
  if (/review|rating|offers|price/i.test(blocchi[0])) problemi.push('recensioni o prezzi nei dati strutturati')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `Organization (${org.name}, ${org.url}, logo, email) e WebSite (${sito.inLanguage}), JSON valido` }
})

controllo('SEO e condivisione: title ≤ 60 e description ≤ 155 (angolo famiglia), canonical, Open Graph e Twitter card', () => {
  const problemi = []
  const titolo = decodifica(TITOLO)
  const descrizione = decodifica(DESCRIZIONE)
  if (titolo.length > 60) problemi.push(`title di ${titolo.length} caratteri`)
  if (descrizione.length > 155) problemi.push(`description di ${descrizione.length} caratteri`)
  const canonical = (TESTA.match(/<link rel="canonical" href="([^"]+)"/) ?? [])[1]
  if (canonical !== ORIGINE) problemi.push(`canonical ${canonical} invece di ${ORIGINE}`)
  const immagine = new URL('og-image.jpg', ORIGINE).href
  const attesi = [
    ['property', 'og:title', titolo],
    ['property', 'og:description', descrizione],
    ['property', 'og:url', ORIGINE],
    ['property', 'og:image', immagine],
    ['property', 'og:site_name', valoreDato('BRAND')],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', titolo],
    ['name', 'twitter:description', descrizione],
    ['name', 'twitter:image', immagine],
  ]
  for (const [attributo, nome, valore] of attesi) {
    const trovato = decodifica(metaContenuto(attributo, nome))
    if (trovato !== valore) problemi.push(`${nome}: «${trovato || 'assente'}»`)
  }
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: `title ${titolo.length}/60 «${titolo}», description ${descrizione.length}/155, canonical ${canonical}, og e twitter con og-image.jpg` }
})

controllo('robots.txt e sitemap.xml: la home e le pagine legali verso il dominio di §2', () => {
  const problemi = []
  const robots = esiste('dist/robots.txt') ? leggi('dist/robots.txt') : ''
  const sitemap = esiste('dist/sitemap.xml') ? leggi('dist/sitemap.xml') : ''
  if (!/User-agent: \*/.test(robots) || /Disallow: \/\s*$/m.test(robots)) problemi.push('robots.txt assente o chiude il sito')
  if (!robots.includes(`Sitemap: ${new URL('sitemap.xml', ORIGINE).href}`)) problemi.push('robots.txt senza la sitemap del dominio')
  const indirizzi = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  const attesi = [ORIGINE, new URL('privacy.html', ORIGINE).href, new URL('cookie.html', ORIGINE).href]
  if (indirizzi.join() !== attesi.join()) problemi.push(`sitemap con ${indirizzi.join(', ') || 'nessun indirizzo'} invece di ${attesi.join(', ')}`)
  return problemi.length ? { ok: false, nota: problemi.join('; ') } : { ok: true, nota: `${indirizzi.length} indirizzi su ${ORIGINE}; robots punta alla sitemap` }
})

controllo('banner dei cookie fuori dall\'HTML prerenderizzato, «Gestisci cookie» nel footer (§10 punto 4)', () => {
  const problemi = []
  // L'elemento del banner (la barra mobile cita solo la variabile --bd-banner-h)
  if (/class="bd-banner[\s"]|aria-label="Scelta sui cookie"/.test(HTML)) problemi.push('il banner è nell\'HTML prerenderizzato')
  if (!/<footer[\s\S]*>Gestisci cookie<\/button>[\s\S]*<\/footer>/.test(HTML)) problemi.push('manca «Gestisci cookie» nel footer')
  const banner = esiste('src/components/BdBannerCookie.tsx') ? leggi('src/components/BdBannerCookie.tsx') : ''
  if (!/useIdratato\(\)/.test(banner)) problemi.push('il banner non aspetta l\'hydration')
  if (!/'Escape'/.test(banner) || !/bd:apri-cookie/.test(banner)) problemi.push('il banner non si chiude con Esc o non si riapre da «Gestisci cookie»')
  return problemi.length ? { ok: false, nota: problemi.join('; ') } : { ok: true, nota: 'il banner si monta dopo l\'hydration (useIdratato), si riapre da «Gestisci cookie», Esc chiude' }
})

controllo('avviso «Testo da far verificare…» in dist se e solo se PRIVACY_VERIFICATA è «no» (§2)', () => {
  const problemi = []
  const valore = (DATI_OGGETTO.match(/\bPRIVACY_VERIFICATA:\s*(true|false)\b/) ?? [])[1]
  if (!valore) return { ok: false, nota: 'PRIVACY_VERIFICATA manca in dati.ts' }
  const verificata = valore === 'true'
  const claude = leggi('CLAUDE.md')
  const inClaude = (claude.match(/^- PRIVACY_VERIFICATA \([^)]*\): (sì|no)$/m) ?? [])[1]
  if (!inClaude) problemi.push('PRIVACY_VERIFICATA manca in §2 di CLAUDE.md')
  else if ((inClaude === 'sì') !== verificata) problemi.push(`CLAUDE.md dice «${inClaude}», dati.ts ${valore}`)
  if (!/^- PRIVACY_VERIFICATA «no»: privacy e cookie policy mostrano il riquadro/m.test(claude)) problemi.push('manca la regola condizionale di PRIVACY_VERIFICATA in §2')
  const avviso = TESTI.pagine.avviso
  const testiDist = esiste('dist') ? fileSotto('dist', (n) => /\.(html|js|css|json|txt|xml)$/.test(n)) : []
  const conAvviso = testiDist.filter((f) => leggi(f).includes(avviso))
  const attesi = verificata ? [] : ['dist/privacy.html', 'dist/cookie.html']
  const mancano = attesi.filter((f) => !conAvviso.includes(f))
  const diTroppo = conAvviso.filter((f) => !attesi.includes(f))
  if (mancano.length) problemi.push(`avviso assente in ${mancano.join(', ')}`)
  if (diTroppo.length) problemi.push(`avviso in ${diTroppo.join(', ')}`)
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: verificata ? 'PRIVACY_VERIFICATA «sì»: nessun riquadro in dist' : 'PRIVACY_VERIFICATA «no»: riquadro solo in privacy.html e cookie.html; §2 e dati.ts d\'accordo' }
})

controllo('parametri della campagna senza salvataggio nel browser: niente sessionStorage, fbclid solo con il consenso (§7, §10.4)', () => {
  const problemi = []
  const conSessione = fileSotto('src').filter((f) => leggi(f).includes('sessionStorage'))
  if (conSessione.length) problemi.push(`sessionStorage in ${conSessione.join(', ')}`)
  const conLocale = fileSotto('src', (n) => /\.(ts|tsx)$/.test(n)).filter((f) => !f.endsWith('src/lib/bd-consenso.ts') && /\blocalStorage\b/.test(leggi(f)))
  if (conLocale.length) problemi.push(`localStorage fuori da bd-consenso.ts: ${conLocale.join(', ')}`)
  const utm = leggi('src/lib/bd-utm.ts')
  if (!/window\.location\.search/.test(utm) || !/consensoMarketing && fbclid/.test(utm)) problemi.push('bd-utm non legge l\'indirizzo o non lega fbclid al consenso')
  const regole = leggi('src/lib/bd-lead-regole.ts')
  if (!/fbclid: consensoMarketing \?/.test(regole)) problemi.push('normalizza() non scarta fbclid senza consenso')
  const funzione = leggi('netlify/functions/bd-lead.mts')
  const referer = (funzione.match(/function completaDaReferer[\s\S]*?\n}\n/) ?? [''])[0]
  if (!referer) problemi.push('completaDaReferer non trovata in bd-lead.mts')
  else if (/fbclid/.test(referer.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ''))) problemi.push('completaDaReferer prende fbclid dal Referer')
  return problemi.length
    ? { ok: false, nota: problemi.join('; ') }
    : { ok: true, nota: 'utm_* letti dall\'indirizzo all\'invio, nessun sessionStorage in src, localStorage solo per la scelta sui cookie; fbclid solo con il consenso, mai dal Referer' }
})

controllo('Pixel con la configurazione automatica spenta prima di init (step 7)', () => {
  const traccia = leggi('src/lib/bd-traccia.ts')
  const autoConfig = traccia.indexOf("window.fbq('set', 'autoConfig', false, id)")
  const init = traccia.indexOf("window.fbq('init', id)")
  return autoConfig !== -1 && init !== -1 && autoConfig < init
    ? { ok: true, nota: "fbq('set', 'autoConfig', false, id) prima di fbq('init', id); la prova con l'fbq finto è in screenshot.mjs" }
    : { ok: false, nota: 'autoConfig false manca o arriva dopo init' }
})

// ---------- esito ----------

let ko = 0
for (const r of risultati) {
  if (!r.ok) ko++
  console.log(`${r.ok ? 'OK' : 'KO'}  ${r.nome} — ${r.nota}`)
}
console.log(`\n${risultati.length - ko} OK, ${ko} KO`)
process.exit(ko ? 1 : 0)
