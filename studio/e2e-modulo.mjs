// Prova end-to-end del modulo di preventivo (step 3) nell'anteprima simulata (BD_MOCK=1, nessun servizio esterno).
// A 390 × 844, per ogni angolo (?a=famiglia, terreno, investo): CTA dell'hero → modulo, preselezione dall'angolo,
// errore su «Avanti» con un campo vuoto, tre passaggi, attesa di 3 secondi, invio, messaggio di successo
// e riga in studio/report/lead-mock.jsonl. Poi un invio con honeypot pieno (non deve comparire nel file)
// e un invio senza JavaScript (form classico → 303 → /grazie.html).
// Screenshot di ogni passaggio e del successo in studio/report/e2e/ (escluso da git). Avvio: npm run e2e.

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const USCITA = join(ROOT, 'studio', 'report', 'e2e')
const FILE_MOCK = join(ROOT, 'studio', 'report', 'lead-mock.jsonl')
const PORTA = Number(process.env.PORTA_E2E ?? 4331)
const BASE = `http://localhost:${PORTA}`

mkdirSync(USCITA, { recursive: true })
if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('KO  e2e — manca dist/: esegui prima npm run build')
  process.exit(1)
}

// ---------- anteprima e browser ----------

const attiva = async () => {
  try {
    return (await fetch(`${BASE}/`)).ok
  } catch {
    return false
  }
}
const tsx = createRequire(import.meta.url).resolve('tsx/cli')
const server = spawn(process.execPath, [tsx, join(ROOT, 'studio', 'anteprima-server.mts')], {
  cwd: ROOT,
  env: { ...process.env, PORTA: String(PORTA), BD_MOCK: '1', BD_MOCK_FILE: FILE_MOCK },
  stdio: 'ignore',
})
for (let i = 0; i < 50 && !(await attiva()); i++) await new Promise((r) => setTimeout(r, 200))
if (!(await attiva())) {
  server.kill()
  console.error(`KO  e2e — l'anteprima non è partita su ${BASE}`)
  process.exit(1)
}

let browser
try {
  browser = await chromium.launch()
} catch (errore) {
  server.kill()
  console.log(`SALTATO  e2e — nessun browser disponibile (${errore.message.split('\n')[0]})`)
  process.exit(0)
}

const risultati = []
const esito = (ok, nome, nota) => {
  risultati.push({ ok: Boolean(ok), nome, nota })
  console.log(`${ok ? 'OK' : 'KO'}  ${nome} — ${nota}`)
}

const righe = () =>
  existsSync(FILE_MOCK)
    ? readFileSync(FILE_MOCK, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((r) => JSON.parse(r))
    : []

const attendi = (ms) => new Promise((r) => setTimeout(r, ms))

async function nuovaPagina(opzioni = {}) {
  const contesto = await browser.newContext({ viewport: { width: 390, height: 844 }, ...opzioni })
  const pagina = await contesto.newPage()
  const errori = []
  pagina.on('console', (m) => {
    // L'informativa privacy arriva allo step 7: un 404 su /privacy.html non è un errore di questa prova.
    if (m.type() === 'error' && !/404/.test(m.text())) errori.push(m.text())
  })
  pagina.on('pageerror', (e) => errori.push(e.message))
  const inviati = []
  pagina.on('request', (r) => {
    if (r.url().endsWith('/api/lead') && r.method() === 'POST') inviati.push({ url: r.url(), corpo: r.postData() ?? '' })
  })
  return { contesto, pagina, errori, inviati }
}

const passoVisibile = (pagina) =>
  pagina.evaluate(() => {
    const passi = [...document.querySelectorAll('.bd-m-passo')]
    return passi.findIndex((p) => !p.hidden) + 1
  })

// Screenshot della sezione: dopo le transizioni (≤ 200 ms) e senza l'header fisso sopra il modulo
const NASCONDI_HEADER = '.bd-header { visibility: hidden !important; }'
async function foto(pagina, file) {
  await attendi(300)
  await pagina.locator('#preventivo').screenshot({ path: join(USCITA, file), style: NASCONDI_HEADER })
}

const focusSu = (pagina) => pagina.evaluate(() => document.activeElement?.id ?? document.activeElement?.tagName)

// ---------- i tre angoli ----------

const DATI = {
  famiglia: { terreno: 'cerco', comune: 'Gallarate', budget: 'fascia-1', tempistica: '6-12', nome: 'Giulia Bianchi', email: 'giulia.bianchi@esempio.it', telefono: '333 123 4567', messaggio: 'Casa su due piani, circa 160 m².' },
  terreno: { terreno: null, comune: 'Carnago', budget: 'fascia-2', tempistica: 'entro-6', nome: 'Luca Verdi', email: 'Luca.Verdi@Esempio.it', telefono: '', messaggio: 'Lotto di 900 m² già edificabile.' },
  investo: { terreno: 'no', comune: 'Busto Arsizio', budget: 'oltre', tempistica: 'oltre-12', nome: 'Paolo Neri', email: 'paolo.neri@esempio.it', telefono: '+39 347 765 4321', messaggio: '' },
}
const PRESCELTE = { famiglia: { profilo: 'casa', terreno: null }, terreno: { profilo: 'casa', terreno: 'si' }, investo: { profilo: 'investimento', terreno: null } }

for (const angolo of ['famiglia', 'terreno', 'investo']) {
  const d = DATI[angolo]
  const { contesto, pagina, errori, inviati } = await nuovaPagina()
  const nome = `angolo ${angolo} 390px`
  await pagina.goto(`${BASE}/?a=${angolo}&utm_source=e2e&utm_campaign=prova-${angolo}`, { waitUntil: 'networkidle' })
  const aperta = Date.now()

  // CTA dell'hero → #preventivo, focus sulla risposta 1 preselezionata
  await pagina.locator('#inizio .bd-cta--primaria').click()
  // Lo scroll morbido di Lenis dura circa 1,1 s; il focus arriva alla fine (bd-scorri)
  await pagina.waitForFunction(() => document.activeElement?.closest('#preventivo'), null, { timeout: 4000 }).catch(() => {})
  const scelte = await pagina.evaluate(() => ({
    profilo: document.querySelector('input[name="profilo"]:checked')?.value ?? null,
    terreno: document.querySelector('input[name="terreno"]:checked')?.value ?? null,
    focus: document.activeElement?.id ?? null,
  }))
  const attese = PRESCELTE[angolo]
  esito(
    scelte.profilo === attese.profilo && scelte.terreno === attese.terreno,
    `${nome}: preselezione dall'angolo`,
    `profilo ${scelte.profilo}, terreno ${scelte.terreno ?? '—'}`,
  )
  esito(scelte.focus === `bd-m-profilo-${attese.profilo}`, `${nome}: CTA dell'hero porta al modulo`, `focus su #${scelte.focus}`)
  await foto(pagina, `${angolo}-1-progetto.png`)

  // Passo 1: senza «Hai già il terreno?» l'Avanti mostra l'errore; poi si sceglie
  if (!attese.terreno) {
    await pagina.getByRole('button', { name: 'Avanti' }).click()
    const errore = await pagina.evaluate(() => ({
      testo: document.getElementById('bd-m-errore-terreno')?.textContent ?? '',
      riepilogo: document.querySelector('.bd-m-riepilogo')?.textContent ?? '',
      focus: document.activeElement?.id,
    }))
    esito(
      errore.testo === 'Scegli una risposta' && errore.riepilogo.includes('Hai già il terreno?') && errore.focus === 'bd-m-terreno-si',
      `${nome}: errore al passaggio successivo`,
      `«${errore.testo}», focus su #${errore.focus}`,
    )
    if (angolo === 'famiglia') await foto(pagina, `${angolo}-1-errore.png`)
    await pagina.locator(`label[for="bd-m-terreno-${d.terreno}"]`).click()
  }
  await pagina.getByRole('button', { name: 'Avanti' }).click()
  esito((await passoVisibile(pagina)) === 2 && (await focusSu(pagina)) === 'bd-m-titolo-2', `${nome}: passo 2 con focus sul titolo`, `passo ${await passoVisibile(pagina)}, focus su #${await focusSu(pagina)}`)

  // Passo 2
  await pagina.locator('#bd-m-comune').fill(d.comune)
  await pagina.locator(`label[for="bd-m-budget-${d.budget}"]`).click()
  await pagina.locator(`label[for="bd-m-tempistica-${d.tempistica}"]`).click()
  await foto(pagina, `${angolo}-2-dove-quando.png`)
  if (angolo === 'terreno') {
    // «Invio» da tastiera in un campo del passo 2 vale «Avanti»
    await pagina.locator('#bd-m-comune').press('Enter')
  } else {
    await pagina.getByRole('button', { name: 'Avanti' }).click()
  }
  esito((await passoVisibile(pagina)) === 3, `${nome}: passo 3${angolo === 'terreno' ? ' (con il tasto Invio)' : ''}`, `passo ${await passoVisibile(pagina)}`)

  // Passo 3
  await pagina.locator('#bd-m-nome').fill(d.nome)
  await pagina.locator('#bd-m-email').fill(d.email)
  if (d.telefono) await pagina.locator('#bd-m-telefono').fill(d.telefono)
  if (d.messaggio) await pagina.locator('#bd-m-messaggio').fill(d.messaggio)
  await foto(pagina, `${angolo}-3-contatti.png`)

  // Almeno 3 secondi dall'apertura del modulo, poi invio
  await attendi(Math.max(0, 3000 - (Date.now() - aperta)) + 200)
  await pagina.getByRole('button', { name: 'Invia la richiesta' }).click()
  await pagina.locator('#bd-m-successo').waitFor({ timeout: 5000 })
  const successo = await pagina.evaluate(() => ({
    testo: document.getElementById('bd-m-successo')?.textContent ?? '',
    focus: document.activeElement?.id,
    url: window.location.href,
  }))
  esito(
    successo.testo.startsWith('Richiesta ricevuta. Mirko Lanzafame ti scrive entro 2 giorni lavorativi.') && successo.focus === 'bd-m-successo',
    `${nome}: messaggio di successo`,
    `focus su #${successo.focus}`,
  )
  await foto(pagina, `${angolo}-4-successo.png`)

  // La riga nel file mock, trovata con l'event_id che il browser ha mandato
  const corpo = JSON.parse(inviati[0]?.corpo || '{}')
  const riga = righe().find((r) => r.event_id === corpo.event_id)
  const problemi = []
  if (!riga) problemi.push('riga non trovata')
  else {
    if (riga.angolo !== angolo) problemi.push(`angolo ${riga.angolo}`)
    if (riga.profilo !== attese.profilo) problemi.push(`profilo ${riga.profilo}`)
    if (riga.comune !== d.comune || riga.budget !== d.budget || riga.tempistica !== d.tempistica) problemi.push('passo 2 diverso')
    if (riga.utm_source !== 'e2e' || riga.utm_campaign !== `prova-${angolo}`) problemi.push('UTM mancanti')
    if (riga.pagina !== `${BASE}/`) problemi.push(`pagina ${riga.pagina}`)
    if (!/^[a-z]\*\*\*@[a-z]\*\*\*\.it$/.test(riga.email)) problemi.push(`email non mascherata: ${riga.email}`)
    if (d.telefono ? !/^\+39\*+\d\d$/.test(riga.telefono ?? '') : riga.telefono !== null) problemi.push(`telefono ${riga.telefono}`)
  }
  esito(!problemi.length, `${nome}: riga in lead-mock.jsonl`, problemi.length ? problemi.join('; ') : `id ${riga.id.slice(0, 8)}…, email ${riga.email}, telefono ${riga.telefono ?? '—'}`)

  const urlPulito = !/nome|email|telefono|comune|@/.test(new URL(successo.url).search + new URL(successo.url).hash) && inviati.every((i) => !i.url.includes('?'))
  esito(urlPulito && inviati.length === 1, `${nome}: un solo POST, nessun dato negli URL`, `${inviati.length} POST su /api/lead, URL finale ${new URL(successo.url).search}${new URL(successo.url).hash}`)
  esito(errori.length === 0, `${nome}: console`, errori.length ? errori.join(' | ') : 'nessun errore')
  await contesto.close()
}

// ---------- honeypot pieno: successo finto, nessuna riga ----------
{
  const { contesto, pagina, errori, inviati } = await nuovaPagina()
  await pagina.goto(`${BASE}/?a=famiglia`, { waitUntil: 'networkidle' })
  const prima = righe().length
  await pagina.evaluate(() => {
    const campo = document.querySelector('input[name="sito_web"]')
    campo.value = 'https://spam.example'
  })
  await pagina.locator('label[for="bd-m-terreno-no"]').click()
  await pagina.getByRole('button', { name: 'Avanti' }).click()
  await pagina.locator('#bd-m-comune').fill('Varese')
  await pagina.locator('label[for="bd-m-budget-non-so"]').click()
  await pagina.locator('label[for="bd-m-tempistica-valuto"]').click()
  await pagina.getByRole('button', { name: 'Avanti' }).click()
  await pagina.locator('#bd-m-nome').fill('Bot Spam')
  await pagina.locator('#bd-m-email').fill('bot@spam.example')
  await attendi(3200)
  await pagina.getByRole('button', { name: 'Invia la richiesta' }).click()
  await pagina.locator('#bd-m-successo').waitFor({ timeout: 5000 })
  const corpo = JSON.parse(inviati[0]?.corpo || '{}')
  const dopo = righe()
  esito(
    corpo.sito_web === 'https://spam.example' && dopo.length === prima && !dopo.some((r) => r.event_id === corpo.event_id),
    'honeypot pieno: successo finto, nessuna riga',
    `honeypot inviato «${corpo.sito_web}», righe ${prima} → ${dopo.length}`,
  )
  esito(errori.length === 0, 'honeypot: console', errori.length ? errori.join(' | ') : 'nessun errore')
  await contesto.close()
}

// ---------- senza JavaScript: form classico, 303, /grazie.html ----------
{
  const { contesto, pagina } = await nuovaPagina({ javaScriptEnabled: false })
  await pagina.goto(`${BASE}/?a=investo&utm_source=e2e-senza-js`, { waitUntil: 'load' })
  const passiVisibili = await pagina.locator('.bd-m-passo:visible').count()
  const comune = `Somma Lombardo ${Date.now().toString().slice(-5)}`
  await pagina.locator('label[for="bd-m-terreno-si"]').click()
  await pagina.locator('#bd-m-comune').fill(comune)
  await pagina.locator('label[for="bd-m-budget-fascia-1"]').click()
  await pagina.locator('label[for="bd-m-tempistica-entro-6"]').click()
  await pagina.locator('#bd-m-nome').fill('Anna Gialli')
  await pagina.locator('#bd-m-email').fill('anna.gialli@esempio.it')
  await foto(pagina, 'senza-js-modulo.png')
  await Promise.all([pagina.waitForURL('**/grazie.html'), pagina.getByRole('button', { name: 'Invia la richiesta' }).click()])
  const h1 = await pagina.locator('h1').textContent()
  await pagina.screenshot({ path: join(USCITA, 'senza-js-grazie.png'), fullPage: true })
  const riga = righe().find((r) => r.comune === comune)
  esito(passiVisibili === 3, 'senza JavaScript: tutti i passaggi in una pagina', `${passiVisibili} passaggi visibili`)
  esito(
    pagina.url().endsWith('/grazie.html') && h1 === 'Grazie per averci scritto.' && riga?.angolo === 'investo' && riga?.utm_source === 'e2e-senza-js',
    'senza JavaScript: 303 verso /grazie.html e riga salvata',
    riga ? `angolo ${riga.angolo} e utm_source ${riga.utm_source} dal Referer, profilo ${riga.profilo}` : 'riga non trovata',
  )
  await contesto.close()
}

await browser.close()
server.kill()

const ko = risultati.filter((r) => !r.ok).length
writeFileSync(join(USCITA, 'riepilogo.json'), JSON.stringify({ data: new Date().toISOString(), risultati }, null, 2))
console.log(`\nE2E: ${risultati.length - ko} OK, ${ko} KO. Screenshot in studio/report/e2e/`)
process.exit(ko ? 1 : 0)
