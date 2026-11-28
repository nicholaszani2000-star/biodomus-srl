// Prova end-to-end del modulo di preventivo (step 3) nell'anteprima simulata (BD_MOCK=1, nessun servizio esterno).
// A 390 × 844, per ogni angolo (?a=famiglia, terreno, investo): CTA dell'hero → modulo, preselezione dall'angolo,
// errore su «Avanti» con un campo vuoto, tre passaggi, attesa di 3 secondi, invio, messaggio di successo
// e riga in studio/report/lead-mock.jsonl. Poi un invio con honeypot pieno (non deve comparire nel file)
// e un invio senza JavaScript (form classico → 303 → /grazie.html).
// Step 4: le card di «Per chi è» portano al modulo con la risposta 1 (e il terreno) già scelti e tornano al passo 1.
// Step 7: ogni prova parte con una scelta sui cookie già salvata (il banner non copre i clic); con «terreno» la scelta è
// «accettato» e la riga ha consenso_marketing true, con gli altri angoli false. L'invio senza JavaScript arriva a
// /grazie.html con stato 200.
// Correzioni dello step 7: con /?a=terreno&utm_source=prova&utm_campaign=prova&fbclid=PROVA123 e nessuna scelta sui cookie
// sessionStorage e localStorage restano vuoti e la riga ha gli utm ma non fbclid; dopo «Accetta» fbclid c'è; l'invio senza
// JavaScript prende dal Referer gli utm ma non fbclid.
// Step 8: il modulo in errore con BD_MOCK=errore (502 e il ripiego con l'email pubblica); il Tab su tutta la pagina a 390
// e 1440 px con il focus sempre visibile e mai coperto; il modulo completato solo da tastiera.
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

// Pixel di prova (step 7): Meta non si raggiunge mai. route() serve un fbevents.js finto che registra le chiamate a fbq
// e, solo in questa prova, riscrive il bundle servito (META_PIXEL:null → un ID finto): nel sito nessun aggancio per i test.
const PIXEL_PROVA = '000000000000007'
const FBEVENTS_FINTO = `(function () {
  window.__fbqChiamate = window.__fbqChiamate || [];
  var f = window.fbq; if (!f) return;
  var coda = f.queue || [];
  f.callMethod = function () { window.__fbqChiamate.push(Array.prototype.slice.call(arguments)); };
  for (var i = 0; i < coda.length; i++) f.callMethod.apply(f, coda[i]);
  f.queue = [];
})();`

async function nuovaPagina({ consenso = 'rifiutato', pixel = false, ...opzioni } = {}) {
  const contesto = await browser.newContext({ viewport: { width: 390, height: 844 }, ...opzioni })
  await contesto.route(/^https:\/\/(?:connect\.facebook\.net|www\.facebook\.com)\//, (route) =>
    route.request().url().endsWith('/fbevents.js')
      ? route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: FBEVENTS_FINTO })
      : route.fulfill({ status: 204, body: '' }),
  )
  if (pixel) {
    await contesto.route(/\/assets\/index-[\w-]+\.js$/, async (route) => {
      const risposta = await route.fetch()
      const corpo = await risposta.text()
      if (!corpo.includes('META_PIXEL:null')) return route.abort()
      return route.fulfill({ response: risposta, body: corpo.replace('META_PIXEL:null', `META_PIXEL:${JSON.stringify(PIXEL_PROVA)}`) })
    })
  }
  // Scelta sui cookie già salvata (solo se manca): il banner non compare e consenso_marketing la segue
  await contesto.addInitScript((scelta) => {
    try {
      if (scelta && !localStorage.getItem('bd-consenso')) localStorage.setItem('bd-consenso', JSON.stringify({ stato: scelta, data: Date.now() }))
    } catch {
      // niente
    }
  }, consenso)
  const pagina = await contesto.newPage()
  const errori = []
  pagina.on('console', (m) => {
    if (m.type() === 'error') errori.push(m.text())
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
// Header e barra mobile nascosti negli screenshot con il CSSOM (el.style, ammesso dalla CSP): l'opzione «style» di
// Playwright inietta uno <style> senza hash che la Content-Security-Policy dell'anteprima blocca (step 7).
async function senzaFissi(pagina, scatta) {
  const imposta = (nascondi) =>
    pagina.evaluate((n) => {
      for (const el of document.querySelectorAll('.bd-header, .bd-barra-mobile')) {
        if (n) el.style.setProperty('visibility', 'hidden', 'important')
        else el.style.removeProperty('visibility')
      }
    }, nascondi)
  await imposta(true)
  try {
    return await scatta()
  } finally {
    await imposta(false)
  }
}

async function foto(pagina, file) {
  await attendi(300)
  await senzaFissi(pagina, () => pagina.locator('#preventivo').screenshot({ path: join(USCITA, file) }))
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
  // consenso_marketing segue la scelta sui cookie: «accettato» solo nella prova dell'angolo terreno
  const consenso = angolo === 'terreno' ? 'accettato' : 'rifiutato'
  const { contesto, pagina, errori, inviati } = await nuovaPagina({ consenso, pixel: consenso === 'accettato' })
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
    if (riga.consenso_marketing !== (consenso === 'accettato')) problemi.push(`consenso_marketing ${riga.consenso_marketing} con la scelta «${consenso}»`)
  }
  esito(!problemi.length, `${nome}: riga in lead-mock.jsonl`, problemi.length ? problemi.join('; ') : `id ${riga.id.slice(0, 8)}…, email ${riga.email}, telefono ${riga.telefono ?? '—'}, consenso_marketing ${riga.consenso_marketing} (cookie «${consenso}»)`)
  // Con il consenso e un Pixel di prova: dopo l'invio «Lead» con lo stesso ID mandato alla funzione (deduplica con l'API
  // Conversioni, §4). Senza consenso nessuna chiamata a fbq.
  await attendi(400)
  const lead = await pagina.evaluate(() => (window.__fbqChiamate ?? []).filter((c) => c[0] === 'track' && c[1] === 'Lead'))
  if (consenso === 'accettato') {
    esito(
      lead.length === 1 && lead[0][3]?.eventID === corpo.event_id && JSON.stringify(lead[0][2]) === '{}',
      `${nome}: evento Lead con lo stesso event_id`,
      lead.length ? `Lead con eventID ${String(lead[0][3]?.eventID).slice(0, 8)}…, uguale all'event_id del POST: ${lead[0][3]?.eventID === corpo.event_id ? 'sì' : 'no'}` : 'nessun Lead',
    )
  } else {
    esito(lead.length === 0, `${nome}: nessun Lead senza consenso`, `${lead.length} chiamate Lead`)
  }

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

// ---------- step 4: le card di «Per chi è» preselezionano il modulo ----------
{
  const { contesto, pagina, errori } = await nuovaPagina()
  await pagina.goto(`${BASE}/?a=famiglia`, { waitUntil: 'networkidle' })
  const statoModulo = () =>
    pagina.evaluate(() => ({
      passo: [...document.querySelectorAll('.bd-m-passo')].findIndex((p) => !p.hidden) + 1,
      profilo: document.querySelector('input[name="profilo"]:checked')?.value ?? null,
      terreno: document.querySelector('input[name="terreno"]:checked')?.value ?? null,
      angolo: document.querySelector('input[name="angolo"]')?.value ?? null,
      focus: document.activeElement?.id ?? null,
    }))
  const card = async (testo, profilo) => {
    await pagina.locator('#per-chi').getByRole('link', { name: testo }).click()
    await pagina
      .waitForFunction((id) => document.activeElement?.id === id, `bd-m-profilo-${profilo}`, { timeout: 4000 })
      .catch(() => {})
    return statoModulo()
  }

  // Tastiera: dall'ultima card il tasto Tab attraversa le sezioni dello step 5 (CTA di «Come funziona», pulsanti degli strati,
  // CTA del sistema) e arriva al modulo, anche se le sezioni non sono ancora entrate scorrendo (ingressi con opacity, §5)
  await pagina.locator('#per-chi').getByRole('link', { name: 'Parliamo del progetto' }).focus()
  const percorso = []
  for (let i = 0; i < 25; i++) {
    await pagina.keyboard.press('Tab')
    const dove = await pagina.evaluate(() => {
      const el = document.activeElement
      return { id: el?.id || el?.tagName || '', sezione: el?.closest('section')?.id ?? null }
    })
    percorso.push(dove)
    if (dove.sezione === 'preventivo') break
  }
  const sezioniTab = [...new Set(percorso.map((p) => p.sezione).filter(Boolean))]
  const pulsantiStrati = percorso.filter((p) => /^sistema-strato-\d$/.test(p.id)).length
  esito(
    percorso.at(-1)?.sezione === 'preventivo' && sezioniTab.includes('come-funziona') && pulsantiStrati === 4,
    'tastiera: Tab dall\'ultima card attraverso le sezioni nuove fino al modulo',
    `${percorso.length} Tab: ${sezioniTab.join(' → ')}; ${pulsantiStrati} pulsanti degli strati; ultimo focus #${percorso.at(-1)?.id}`,
  )

  const casa = await card('Parti dal tuo progetto', 'casa')
  esito(
    casa.passo === 1 && casa.profilo === 'casa' && casa.terreno === null && casa.focus === 'bd-m-profilo-casa',
    'card «Vuoi costruire casa»: modulo con la risposta 1 scelta',
    `passo ${casa.passo}, profilo ${casa.profilo}, terreno ${casa.terreno ?? '—'}, focus #${casa.focus}`,
  )

  // Dal passo 2 una card riporta al passo 1 con le nuove risposte
  await pagina.locator('label[for="bd-m-terreno-cerco"]').click()
  await pagina.getByRole('button', { name: 'Avanti' }).click()
  await attendi(300)
  const passoPrima = await passoVisibile(pagina)

  // CTA dell'header con il modulo già al passo 2: niente reset, focus sul primo campo del passaggio aperto
  await pagina.locator('header').getByRole('link', { name: 'Richiedi un preventivo' }).click()
  await pagina
    .waitForFunction(() => !!document.activeElement?.closest('.bd-m-passo') && document.activeElement.getClientRects().length > 0, null, { timeout: 4000 })
    .catch(() => {})
  const dalHeader = await statoModulo()
  const tabRadio = await pagina.evaluate(() => document.getElementById('bd-m-profilo-casa')?.getAttribute('tabindex'))
  esito(
    passoPrima === 2 && dalHeader.passo === 2 && /^bd-m-/.test(dalHeader.focus ?? '') && tabRadio === null,
    'CTA con il modulo al passo 2: focus sul passaggio aperto',
    `passo ${dalHeader.passo}, focus #${dalHeader.focus}; risposta 1 ${tabRadio === null ? 'ancora raggiungibile con Tab' : `con tabindex ${tabRadio}`}`,
  )

  const terreno = await card('Parti dal terreno', 'casa')
  await foto(pagina, 'card-terreno.png')
  esito(
    passoPrima === 2 && terreno.passo === 1 && terreno.profilo === 'casa' && terreno.terreno === 'si' && terreno.focus === 'bd-m-profilo-casa',
    'card «Hai già il terreno»: dal passo 2 torna al passo 1 con «Sì»',
    `passo ${passoPrima} → ${terreno.passo}, profilo ${terreno.profilo}, terreno ${terreno.terreno ?? '—'}, focus #${terreno.focus}`,
  )

  const investo = await card('Parliamo del progetto', 'investimento')
  esito(
    investo.passo === 1 && investo.profilo === 'investimento' && investo.focus === 'bd-m-profilo-investimento',
    'card «Vuoi investire»: modulo con «Un investimento»',
    `profilo ${investo.profilo}, terreno ${investo.terreno ?? '—'} (resta la risposta già data), focus #${investo.focus}`,
  )
  // L'angolo dice quale titolo ha visto la persona (§7): le card non lo cambiano
  esito(
    [casa, terreno, investo].every((s) => s.angolo === 'famiglia') && errori.length === 0,
    'card: angolo della campagna invariato, console pulita',
    `angolo ${investo.angolo}${errori.length ? `, errori: ${errori.join(' | ')}` : ', nessun errore'}`,
  )
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
  const rispostaLead = pagina.waitForResponse((r) => r.url().endsWith('/api/lead') && r.request().method() === 'POST')
  const rispostaGrazie = pagina.waitForResponse((r) => new URL(r.url()).pathname === '/grazie.html')
  await Promise.all([pagina.waitForURL('**/grazie.html'), pagina.getByRole('button', { name: 'Invia la richiesta' }).click()])
  const statoLead = (await rispostaLead).status()
  const statoGrazie = (await rispostaGrazie).status()
  const h1 = await pagina.locator('h1').textContent()
  await pagina.screenshot({ path: join(USCITA, 'senza-js-grazie.png'), fullPage: true })
  const riga = righe().find((r) => r.comune === comune)
  esito(passiVisibili === 3, 'senza JavaScript: tutti i passaggi in una pagina', `${passiVisibili} passaggi visibili`)
  esito(
    statoLead === 303 && statoGrazie === 200 && pagina.url().endsWith('/grazie.html'),
    'senza JavaScript: /grazie.html arriva con stato 200',
    `POST /api/lead ${statoLead}, poi /grazie.html ${statoGrazie}`,
  )
  esito(
    pagina.url().endsWith('/grazie.html') && h1 === 'Grazie per averci scritto.' && riga?.angolo === 'investo' && riga?.utm_source === 'e2e-senza-js',
    'senza JavaScript: 303 verso /grazie.html e riga salvata',
    riga ? `angolo ${riga.angolo} e utm_source ${riga.utm_source} dal Referer, profilo ${riga.profilo}` : 'riga non trovata',
  )
  await contesto.close()
}

// ---------- correzioni dello step 7: parametri della campagna senza salvataggio, fbclid solo con il consenso ----------
{
  const INDIRIZZO = `${BASE}/?a=terreno&utm_source=prova&utm_campaign=prova&fbclid=PROVA123`
  const memoria = (pagina) => pagina.evaluate(() => ({ sessione: sessionStorage.length, locale: localStorage.length }))
  // Il modulo dell'angolo terreno parte con «Una casa» e «Sì» già scelti: passo 2, passo 3, invio
  async function compilaEInvia(pagina, comune) {
    const aperta = Date.now()
    await pagina.getByRole('button', { name: 'Avanti' }).click()
    await pagina.locator('#bd-m-comune').fill(comune)
    await pagina.locator('label[for="bd-m-budget-fascia-1"]').click()
    await pagina.locator('label[for="bd-m-tempistica-entro-6"]').click()
    await pagina.getByRole('button', { name: 'Avanti' }).click()
    await pagina.locator('#bd-m-nome').fill('Prova Parametri')
    await pagina.locator('#bd-m-email').fill('prova.parametri@esempio.it')
    await attendi(Math.max(0, 3300 - (Date.now() - aperta)))
    await pagina.getByRole('button', { name: 'Invia la richiesta' }).click()
    await pagina.locator('#bd-m-successo').waitFor({ timeout: 10000 })
    await attendi(300)
    return righe().find((r) => r.comune === comune)
  }

  // Nessuna scelta sui cookie: niente nel browser, utm sì, fbclid no
  const { contesto, pagina, errori } = await nuovaPagina({ consenso: null })
  await pagina.goto(INDIRIZZO, { waitUntil: 'networkidle' })
  await attendi(600)
  const primaDellInvio = await memoria(pagina)
  const senzaScelta = await compilaEInvia(pagina, `Cislago ${Date.now().toString().slice(-5)}`)
  const dopoLInvio = await memoria(pagina)
  esito(
    primaDellInvio.sessione === 0 && primaDellInvio.locale === 0 && dopoLInvio.sessione === 0 && dopoLInvio.locale === 0 &&
      senzaScelta?.utm_source === 'prova' && senzaScelta?.utm_campaign === 'prova' && senzaScelta?.fbclid === null && senzaScelta?.consenso_marketing === false,
    'parametri senza scelta sui cookie: niente nel browser, utm sì, fbclid no',
    `sessionStorage ${primaDellInvio.sessione}→${dopoLInvio.sessione} voci, localStorage ${primaDellInvio.locale}→${dopoLInvio.locale}; riga: utm_source ${senzaScelta?.utm_source}, utm_campaign ${senzaScelta?.utm_campaign}, fbclid ${senzaScelta?.fbclid}`,
  )

  // «Accetta» dal banner, poi un nuovo invio dalla stessa pagina: fbclid c'è
  await pagina.locator('.bd-banner').getByRole('button', { name: 'Accetta', exact: true }).click()
  await attendi(300)
  await pagina.goto(INDIRIZZO, { waitUntil: 'networkidle' })
  await attendi(600)
  const conConsenso = await compilaEInvia(pagina, `Marnate ${Date.now().toString().slice(-5)}`)
  const memoriaDopo = await memoria(pagina)
  esito(
    conConsenso?.fbclid === 'PROVA123' && conConsenso?.utm_source === 'prova' && conConsenso?.consenso_marketing === true && memoriaDopo.sessione === 0 && errori.length === 0,
    'parametri dopo «Accetta»: fbclid PROVA123',
    `riga: fbclid ${conConsenso?.fbclid}, utm_source ${conConsenso?.utm_source}, consenso_marketing ${conConsenso?.consenso_marketing}; sessionStorage ${memoriaDopo.sessione} voci, localStorage solo la scelta (${memoriaDopo.locale})${errori.length ? `; errori: ${errori.join(' | ')}` : ''}`,
  )
  await contesto.close()

  // Senza JavaScript: dal Referer gli utm, mai fbclid
  const senzaJs = await nuovaPagina({ javaScriptEnabled: false })
  await senzaJs.pagina.goto(INDIRIZZO, { waitUntil: 'load' })
  const comune = `Carnago ${Date.now().toString().slice(-5)}`
  await senzaJs.pagina.locator('label[for="bd-m-terreno-si"]').click()
  await senzaJs.pagina.locator('#bd-m-comune').fill(comune)
  await senzaJs.pagina.locator('label[for="bd-m-budget-fascia-1"]').click()
  await senzaJs.pagina.locator('label[for="bd-m-tempistica-entro-6"]').click()
  await senzaJs.pagina.locator('#bd-m-nome').fill('Prova Senza Js')
  await senzaJs.pagina.locator('#bd-m-email').fill('prova.senzajs@esempio.it')
  await Promise.all([senzaJs.pagina.waitForURL('**/grazie.html'), senzaJs.pagina.getByRole('button', { name: 'Invia la richiesta' }).click()])
  const daReferer = righe().find((r) => r.comune === comune)
  esito(
    daReferer?.utm_source === 'prova' && daReferer?.utm_campaign === 'prova' && daReferer?.fbclid === null,
    'senza JavaScript: dal Referer gli utm ma non fbclid',
    `riga: utm_source ${daReferer?.utm_source}, utm_campaign ${daReferer?.utm_campaign}, fbclid ${daReferer?.fbclid}`,
  )
  await senzaJs.contesto.close()
}

// ---------- step 8: modulo in errore, tastiera su tutta la pagina, modulo senza mouse ----------
const tabFino = async (pagina, condizione, massimo = 40) => {
  for (let i = 0; i < massimo; i++) {
    await pagina.keyboard.press('Tab')
    if (await pagina.evaluate(condizione)) return true
  }
  return false
}

// Il modulo in errore: un'altra anteprima con BD_MOCK=errore (email e Supabase non riescono insieme)
{
  const PORTA_ERRORE = PORTA + 1
  const BASE_ERRORE = `http://localhost:${PORTA_ERRORE}`
  const serverErrore = spawn(process.execPath, [tsx, join(ROOT, 'studio', 'anteprima-server.mts')], {
    cwd: ROOT,
    env: { ...process.env, PORTA: String(PORTA_ERRORE), BD_MOCK: 'errore' },
    stdio: 'ignore',
  })
  const pronta = async () => {
    try {
      return (await fetch(`${BASE_ERRORE}/`)).ok
    } catch {
      return false
    }
  }
  for (let i = 0; i < 50 && !(await pronta()); i++) await attendi(200)
  const { contesto, pagina } = await nuovaPagina()
  await pagina.goto(`${BASE_ERRORE}/?a=terreno`, { waitUntil: 'networkidle' })
  await attendi(600)
  const aperta = Date.now()
  await pagina.locator('#inizio .bd-cta--primaria').click()
  await pagina.waitForFunction(() => document.activeElement?.closest('#preventivo'), null, { timeout: 4000 }).catch(() => {})
  await pagina.getByRole('button', { name: 'Avanti' }).click()
  await pagina.locator('#bd-m-comune').fill('Gallarate')
  await pagina.locator('label[for="bd-m-budget-fascia-1"]').click()
  await pagina.locator('label[for="bd-m-tempistica-entro-6"]').click()
  await pagina.getByRole('button', { name: 'Avanti' }).click()
  await pagina.locator('#bd-m-nome').fill('Prova Errore')
  await pagina.locator('#bd-m-email').fill('prova.errore@esempio.it')
  await attendi(Math.max(0, 3300 - (Date.now() - aperta)))
  const risposta = pagina.waitForResponse((r) => r.url().endsWith('/api/lead') && r.request().method() === 'POST')
  await pagina.getByRole('button', { name: 'Invia la richiesta' }).click()
  const stato = (await risposta).status()
  await pagina.locator('.bd-m-errore-invio').waitFor({ timeout: 5000 }).catch(() => {})
  const messaggio = (await pagina.locator('.bd-m-errore-invio').textContent().catch(() => '')) ?? ''
  const linkEmail = await pagina.locator('.bd-m-errore-invio a[href^="mailto:"]').count()
  await foto(pagina, 'modulo-errore.png')
  esito(
    stato === 502 && /Non siamo riusciti a inviare la richiesta/.test(messaggio) && messaggio.includes('biodomus2025@libero.it') && linkEmail === 1,
    'modulo in errore con BD_MOCK=errore',
    `POST ${stato}; «${messaggio.trim().slice(0, 90)}…» con il link all'email pubblica`,
  )
  await contesto.close()
  serverErrore.kill()
}

// Il Tab su tutta la pagina: ogni fermata nello schermo, con un indicatore di focus e non coperta da header o barra
for (const vista of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  const { contesto, pagina, errori } = await nuovaPagina({ viewport: vista })
  await pagina.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await attendi(800)
  const fermate = []
  let prima = null
  for (let i = 0; i < 250; i++) {
    await pagina.keyboard.press('Tab')
    await attendi(80)
    const fermata = await pagina.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body || el === document.documentElement) return null
      // I radio del modulo mostrano il focus sulla loro etichetta (.bd-m-scelta:has(input:focus-visible))
      const cornice = el.matches('input[type="radio"]') ? el.closest('label') ?? el : el
      const r = cornice.getBoundingClientRect()
      const indicatore = [cornice, el].some((x) => {
        const s = getComputedStyle(x)
        return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (s.boxShadow !== 'none' && s.boxShadow !== '')
      })
      const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1)
      const cy = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1)
      const sopra = document.elementFromPoint(cx, cy)
      return {
        chi: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} «${(el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || '').trim().replace(/\s+/g, ' ').slice(0, 28)}»`,
        firma: `${el.tagName}|${el.id}|${el.getAttribute('href') ?? ''}|${(el.textContent ?? '').trim().slice(0, 20)}|${Math.round(r.top + scrollY)}`,
        nelloSchermo: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
        indicatore,
        libero: Boolean(sopra) && (cornice.contains(sopra) || sopra.contains(cornice)),
      }
    })
    if (!fermata || fermata.firma === prima) break
    prima ??= fermata.firma
    fermate.push(fermata)
  }
  const nascoste = fermate.filter((f) => !f.nelloSchermo || !f.indicatore || !f.libero)
  esito(
    fermate.length > 30 && nascoste.length === 0 && errori.length === 0,
    `tastiera su tutta la pagina ${vista.width}px`,
    nascoste.length
      ? `${nascoste.length} fermate senza focus visibile: ${nascoste.map((f) => `${f.chi}${f.nelloSchermo ? '' : ' fuori schermo'}${f.indicatore ? '' : ' senza indicatore'}${f.libero ? '' : ' coperta'}`).join(', ')}`
      : `${fermate.length} fermate con il Tab, dalla prima («${fermate[0]?.chi}») all'ultima («${fermate.at(-1)?.chi}»): tutte nello schermo, con il contorno di focus e non coperte`,
  )
  await contesto.close()
}

// Il modulo solo da tastiera: Invio sulla CTA dell'hero, poi Tab, Spazio, testo e Invio
{
  const { contesto, pagina, errori } = await nuovaPagina({ viewport: { width: 1440, height: 900 } })
  await pagina.goto(`${BASE}/?a=famiglia&utm_source=e2e-tastiera`, { waitUntil: 'networkidle' })
  await attendi(800)
  const aperta = Date.now()
  const passi = []
  const suCta = await tabFino(pagina, () => document.activeElement?.matches('#inizio .bd-cta--primaria') ?? false)
  await pagina.keyboard.press('Enter')
  await pagina.waitForFunction(() => document.activeElement?.closest('#preventivo'), null, { timeout: 4000 }).catch(() => {})
  passi.push(`CTA dell'hero con Invio → focus su #${await focusSu(pagina)}`)
  // Passo 1: il profilo è già scelto dall'angolo; Tab sul gruppo «Hai già il terreno?», Spazio sceglie «Sì»
  await pagina.keyboard.press('Tab')
  await pagina.keyboard.press('Space')
  const terreno = await pagina.evaluate(() => document.querySelector('input[name="terreno"]:checked')?.value ?? null)
  await tabFino(pagina, () => document.activeElement?.textContent?.trim() === 'Avanti')
  await pagina.keyboard.press('Enter')
  passi.push(`passo 1 con terreno «${terreno}»`)
  // Passo 2
  await tabFino(pagina, () => document.activeElement?.id === 'bd-m-comune')
  await pagina.keyboard.type('Gallarate tastiera')
  await pagina.keyboard.press('Tab')
  await pagina.keyboard.press('Space')
  await pagina.keyboard.press('Tab')
  await pagina.keyboard.press('Space')
  const passo2 = await pagina.evaluate(() => ({
    budget: document.querySelector('input[name="budget"]:checked')?.value ?? null,
    tempistica: document.querySelector('input[name="tempistica"]:checked')?.value ?? null,
  }))
  await tabFino(pagina, () => document.activeElement?.textContent?.trim() === 'Avanti')
  await pagina.keyboard.press('Enter')
  passi.push(`passo 2 con budget «${passo2.budget}» e tempistica «${passo2.tempistica}»`)
  // Passo 3
  await tabFino(pagina, () => document.activeElement?.id === 'bd-m-nome')
  await pagina.keyboard.type('Tastiera Prova')
  await pagina.keyboard.press('Tab')
  await pagina.keyboard.type('tastiera.prova@esempio.it')
  await attendi(Math.max(0, 3300 - (Date.now() - aperta)))
  const suInvia = await tabFino(pagina, () => document.activeElement?.textContent?.trim() === 'Invia la richiesta')
  await pagina.keyboard.press('Enter')
  await pagina.locator('#bd-m-successo').waitFor({ timeout: 10000 }).catch(() => {})
  await attendi(300)
  const successo = await pagina.evaluate(() => document.activeElement?.id === 'bd-m-successo')
  const riga = righe().find((r) => r.comune === 'Gallarate tastiera' && r.utm_source === 'e2e-tastiera')
  esito(
    suCta && suInvia && successo && Boolean(riga) && errori.length === 0,
    'modulo completato senza mouse',
    `${passi.join('; ')}; «Invia la richiesta» con Invio → ${successo ? 'messaggio di successo con il focus' : 'nessun successo'}; riga ${riga ? 'salvata' : 'MANCANTE'}`,
  )
  await contesto.close()
}

await browser.close()
server.kill()

const ko = risultati.filter((r) => !r.ok).length
writeFileSync(join(USCITA, 'riepilogo.json'), JSON.stringify({ data: new Date().toISOString(), risultati }, null, 2))
console.log(`\nE2E: ${risultati.length - ko} OK, ${ko} KO. Screenshot in studio/report/e2e/`)
process.exit(ko ? 1 : 0)
