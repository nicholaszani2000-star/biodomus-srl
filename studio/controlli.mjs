// Controlli automatici del progetto (CLAUDE.md §13).
// Node puro, nessuna dipendenza. Cresce a ogni step: aggiungi i controlli in fondo all'elenco.
// Ogni controllo stampa OK o KO con una riga di spiegazione; un solo KO fa uscire con codice 1.

import { existsSync, readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
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

// ---------- esito ----------

let ko = 0
for (const r of risultati) {
  if (!r.ok) ko++
  console.log(`${r.ok ? 'OK' : 'KO'}  ${r.nome} — ${r.nota}`)
}
console.log(`\n${risultati.length - ko} OK, ${ko} KO`)
process.exit(ko ? 1 : 0)
