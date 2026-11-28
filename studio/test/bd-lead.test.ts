// Test della funzione netlify/functions/bd-lead.mts: metodi, limiti, antispam, validazione, ramo BD_MOCK,
// 303 senza JSON, 502 quando falliscono email e Supabase (fetch simulato), API Conversioni solo con consenso.
// Nessuna chiamata di rete: fetch è sempre simulato. Avvio: npm test (tsx --test).

import { afterEach, beforeEach, describe, test, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import bdLead, { VERSIONE_GRAPH, config, emailCliente, emailReferente, eventoLead, intestazioniSupabase, sha256 } from '../../netlify/functions/bd-lead.mts'
import { normalizza } from '../../src/lib/bd-lead-regole.ts'
import { dati } from '../../src/content/dati.ts'

const VARIABILI = ['BD_MOCK', 'BD_MOCK_FILE', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'BREVO_API_KEY', 'BREVO_MITTENTE', 'EMAIL_LEAD', 'META_PIXEL_ID', 'META_CAPI_TOKEN', 'META_TEST_EVENT_CODE']
const salvate = new Map<string, string | undefined>()
let cartella = ''
let fileMock = ''

beforeEach(() => {
  for (const v of VARIABILI) {
    salvate.set(v, process.env[v])
    delete process.env[v]
  }
  cartella = mkdtempSync(join(tmpdir(), 'bd-lead-'))
  fileMock = join(cartella, 'lead-mock.jsonl')
})

afterEach(() => {
  for (const [v, valore] of salvate) {
    if (valore === undefined) delete process.env[v]
    else process.env[v] = valore
  }
  rmSync(cartella, { recursive: true, force: true })
})

const campiValidi = () => ({
  profilo: 'casa',
  terreno: 'si',
  comune: 'Gallarate',
  budget: 'fascia-1',
  tempistica: '6-12',
  nome: 'Mario Rossi',
  email: 'Mario.Rossi@Esempio.it',
  telefono: '349 123 4567',
  messaggio: 'Villa di 180 m²',
  angolo: 'terreno',
  utm_source: 'facebook',
  utm_campaign: 'autunno',
  pagina: 'https://biodomussrls.it/',
  event_id: 'evento-0123456789',
  avviato_il: String(Date.now() - 10_000),
  consenso_marketing: 'no',
  sito_web: '',
})

const richiestaJson = (corpo: unknown, extra: Record<string, string> = {}) =>
  new Request('http://localhost/api/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...extra },
    body: JSON.stringify(corpo),
  })

const richiestaForm = (corpo: Record<string, string>, extra: Record<string, string> = {}) =>
  new Request('http://localhost/api/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'text/html,application/xhtml+xml', ...extra },
    body: new URLSearchParams(corpo).toString(),
  })

const righeMock = () => (existsSync(fileMock) ? readFileSync(fileMock, 'utf8').trim().split('\n').filter(Boolean).map((r) => JSON.parse(r) as Record<string, unknown>) : [])

function mock() {
  process.env.BD_MOCK = '1'
  process.env.BD_MOCK_FILE = fileMock
}

function servizi() {
  process.env.SUPABASE_URL = 'https://progetto.supabase.co'
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_prova'
  process.env.BREVO_API_KEY = 'xkeysib-prova'
  process.env.BREVO_MITTENTE = 'richieste@biodomussrls.it'
}

interface Chiamata {
  url: string
  init: RequestInit
}

/** fetch simulato: ogni host risponde con lo stato indicato; registra le chiamate. */
function simulaFetch(t: TestContext, stati: { brevo?: number; supabase?: number; meta?: number }) {
  const chiamate: Chiamata[] = []
  t.mock.method(globalThis, 'fetch', async (url: string | URL, init: RequestInit = {}) => {
    const indirizzo = String(url)
    chiamate.push({ url: indirizzo, init })
    const stato = indirizzo.includes('brevo') ? (stati.brevo ?? 201) : indirizzo.includes('supabase') ? (stati.supabase ?? 201) : (stati.meta ?? 200)
    return new Response(stato === 201 && indirizzo.includes('supabase') ? null : '{}', { status: stato })
  })
  const errori: string[] = []
  t.mock.method(console, 'error', (...argomenti: unknown[]) => errori.push(argomenti.join(' ')))
  return { chiamate, errori }
}

describe('richieste non ammesse', () => {
  test('config.path è /api/lead', () => {
    assert.equal(config.path, '/api/lead')
  })

  test('solo POST', async () => {
    const r = await bdLead(new Request('http://localhost/api/lead'))
    assert.equal(r.status, 405)
    assert.equal(r.headers.get('allow'), 'POST')
  })

  test('corpo oltre 10 kB: 413', async () => {
    mock()
    const r = await bdLead(richiestaJson({ ...campiValidi(), messaggio: 'x'.repeat(11 * 1024) }))
    assert.equal(r.status, 413)
    assert.equal(righeMock().length, 0)
  })

  test('formato diverso da JSON e form: 415', async () => {
    const r = await bdLead(new Request('http://localhost/api/lead', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'ciao' }))
    assert.equal(r.status, 415)
  })

  test('JSON non valido: 400', async () => {
    const r = await bdLead(new Request('http://localhost/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{rotto' }))
    assert.equal(r.status, 400)
  })
})

describe('antispam', () => {
  test('honeypot pieno: successo finto e nessuna riga', async () => {
    mock()
    const r = await bdLead(richiestaJson({ ...campiValidi(), sito_web: 'https://spam.example' }))
    assert.equal(r.status, 200)
    assert.equal(((await r.json()) as { ok: boolean }).ok, true)
    assert.equal(righeMock().length, 0)
  })

  test('meno di 3 secondi da avviato_il: successo finto e nessuna riga', async () => {
    mock()
    const r = await bdLead(richiestaJson({ ...campiValidi(), avviato_il: String(Date.now() - 1000) }))
    assert.equal(r.status, 200)
    assert.equal(righeMock().length, 0)
  })

  test('honeypot pieno senza JavaScript: 303 finto', async () => {
    mock()
    const r = await bdLead(richiestaForm({ ...campiValidi(), sito_web: 'x', avviato_il: '' }))
    assert.equal(r.status, 303)
    assert.equal(righeMock().length, 0)
  })
})

describe('validazione lato server', () => {
  test('400 con l’elenco dei campi non validi', async () => {
    mock()
    const r = await bdLead(richiestaJson({ ...campiValidi(), email: 'mario@', budget: 'tanti', telefono: '123' }))
    assert.equal(r.status, 400)
    const corpo = (await r.json()) as { ok: boolean; errori: Record<string, string> }
    assert.equal(corpo.ok, false)
    assert.deepEqual(corpo.errori, { budget: 'scelta', email: 'email', telefono: 'telefono' })
    assert.equal(righeMock().length, 0)
  })

  test('senza JavaScript: pagina HTML con gli errori e il link al modulo', async () => {
    const r = await bdLead(richiestaForm({ ...campiValidi(), nome: '', avviato_il: '' }))
    assert.equal(r.status, 400)
    assert.match(r.headers.get('content-type') ?? '', /text\/html/)
    const html = await r.text()
    assert.match(html, /Scrivi il tuo nome e cognome/)
    assert.match(html, /href="\/#preventivo"/)
  })
})

describe('BD_MOCK=1', () => {
  test('JSON: {ok, id} e riga mascherata in lead-mock.jsonl', async () => {
    mock()
    const r = await bdLead(richiestaJson(campiValidi()))
    assert.equal(r.status, 200)
    const corpo = (await r.json()) as { ok: boolean; id: string }
    assert.equal(corpo.ok, true)
    assert.match(corpo.id, /^[0-9a-f-]{36}$/)

    const [riga] = righeMock()
    assert.equal(riga.id, corpo.id)
    assert.equal(riga.email, 'm***@e***.it')
    assert.equal(riga.telefono, '+39********67')
    assert.equal(riga.angolo, 'terreno')
    assert.equal(riga.utm_source, 'facebook')
    const testo = JSON.stringify(riga)
    assert.ok(!testo.includes('mario.rossi@esempio.it') && !testo.includes('3491234567'), 'niente dati personali in chiaro')

    const anteprima = readFileSync(join(cartella, 'lead-mock-email.txt'), 'utf8')
    assert.match(anteprima, /Oggetto: Nuova richiesta · Una casa per me o per la mia famiglia · Gallarate · Da 250\.000 € a 350\.000 €/)
    assert.match(anteprima, /Oggetto: Abbiamo ricevuto la tua richiesta · Biodomus/)
    assert.ok(!anteprima.includes('mario.rossi@esempio.it'))
  })

  test('nessuna chiamata esterna', async (t) => {
    mock()
    servizi()
    const { chiamate } = simulaFetch(t, {})
    const r = await bdLead(richiestaJson({ ...campiValidi(), consenso_marketing: 'si' }))
    assert.equal(r.status, 200)
    assert.equal(chiamate.length, 0)
  })

  test('senza JavaScript: 303 verso /grazie.html; angolo, UTM e pagina dal Referer', async () => {
    mock()
    const { angolo: _a, utm_source: _s, utm_campaign: _c, pagina: _p, event_id: _e, ...campi } = campiValidi()
    void [_a, _s, _c, _p, _e]
    const r = await bdLead(
      richiestaForm(
        { ...campi, angolo: 'famiglia', utm_source: '', pagina: '', avviato_il: '' },
        { referer: 'https://biodomussrls.it/?a=investo&utm_source=instagram&utm_campaign=lotti' },
      ),
    )
    assert.equal(r.status, 303)
    assert.equal(r.headers.get('location'), '/grazie.html')
    const [riga] = righeMock()
    assert.equal(riga.angolo, 'investo')
    assert.equal(riga.utm_source, 'instagram')
    assert.equal(riga.utm_campaign, 'lotti')
    assert.equal(riga.pagina, 'https://biodomussrls.it/')
    assert.match(String(riga.event_id), /^[0-9a-f-]{36}$/, 'event_id generato dal server')
  })

  test('senza JavaScript: dal Referer gli utm_* ma mai fbclid', async () => {
    mock()
    const { utm_source: _s, utm_campaign: _c, pagina: _p, ...campi } = campiValidi()
    void [_s, _c, _p]
    const r = await bdLead(
      richiestaForm(
        { ...campi, utm_source: '', pagina: '', avviato_il: '' },
        { referer: 'https://biodomussrls.it/?a=terreno&utm_source=prova&utm_campaign=prova&fbclid=PROVA123' },
      ),
    )
    assert.equal(r.status, 303)
    const [riga] = righeMock()
    assert.equal(riga.utm_source, 'prova')
    assert.equal(riga.utm_campaign, 'prova')
    assert.equal(riga.fbclid, null)
  })

  test('fbclid solo con il consenso di marketing (§10.4)', async () => {
    mock()
    await bdLead(richiestaJson({ ...campiValidi(), fbclid: 'PROVA123', consenso_marketing: 'no' }))
    await bdLead(richiestaJson({ ...campiValidi(), event_id: 'evento-9876543210', fbclid: 'PROVA123', consenso_marketing: 'si' }))
    const [senza, con] = righeMock()
    assert.equal(senza.fbclid, null, 'senza consenso fbclid si scarta')
    assert.equal(con.fbclid, 'PROVA123', 'con il consenso fbclid resta')
  })
})

describe('servizi reali (fetch simulato)', () => {
  test('tutto riuscito: email con Brevo, riga su Supabase, nessun evento senza consenso', async (t) => {
    servizi()
    process.env.META_PIXEL_ID = '123'
    process.env.META_CAPI_TOKEN = 'token'
    const { chiamate } = simulaFetch(t, {})
    const r = await bdLead(richiestaJson(campiValidi()))
    assert.equal(r.status, 200)

    const brevo = chiamate.filter((c) => c.url === 'https://api.brevo.com/v3/smtp/email')
    assert.equal(brevo.length, 2)
    const intestazioni = brevo[0].init.headers as Record<string, string>
    assert.equal(intestazioni['api-key'], 'xkeysib-prova')
    const [aMirko, aCliente] = brevo.map((c) => JSON.parse(String(c.init.body)) as Record<string, unknown>)
    assert.deepEqual(aMirko.to, [{ email: dati.EMAIL_LEAD, name: dati.REFERENTE }])
    assert.deepEqual(aMirko.replyTo, { email: 'mario.rossi@esempio.it' })
    assert.deepEqual(aMirko.sender, { name: 'Biodomus', email: 'richieste@biodomussrls.it' })
    assert.deepEqual(aCliente.replyTo, { email: dati.EMAIL_LEAD })
    assert.ok(typeof aCliente.textContent === 'string' && typeof aCliente.htmlContent === 'string')

    const supabase = chiamate.find((c) => c.url === 'https://progetto.supabase.co/rest/v1/bd_leads')
    assert.ok(supabase)
    const hs = supabase.init.headers as Record<string, string>
    assert.equal(hs.apikey, 'sb_secret_prova')
    assert.equal(hs.Prefer, 'return=minimal')
    assert.equal(hs.Authorization, undefined, 'le chiavi sb_secret non vanno in Authorization')
    const rigaDb = JSON.parse(String(supabase.init.body)) as Record<string, unknown>
    assert.equal(rigaDb.email, 'mario.rossi@esempio.it')
    assert.equal(rigaDb.telefono, '+393491234567')
    assert.equal(rigaDb.event_id, undefined)

    assert.equal(chiamate.filter((c) => c.url.includes('graph.facebook.com')).length, 0, 'senza consenso niente API Conversioni')
  })

  test('502 quando falliscono sia l’email sia Supabase; log senza dati personali', async (t) => {
    servizi()
    const { errori } = simulaFetch(t, { brevo: 500, supabase: 503 })
    const r = await bdLead(richiestaJson(campiValidi()))
    assert.equal(r.status, 502)
    const corpo = (await r.json()) as { ok: boolean; email: string }
    assert.equal(corpo.ok, false)
    assert.equal(corpo.email, dati.EMAIL_PUBBLICA ?? dati.EMAIL_LEAD)
    assert.ok(errori.some((e) => e.includes('HTTP 500')))
    assert.ok(errori.some((e) => e.includes('Supabase') && e.includes('HTTP 503')))
    for (const e of errori) assert.ok(!/mario|rossi|349/i.test(e), `log con dati personali: ${e}`)
  })

  test('502 senza JavaScript: pagina HTML con l’email pubblica', async (t) => {
    servizi()
    simulaFetch(t, { brevo: 500, supabase: 500 })
    const r = await bdLead(richiestaForm({ ...campiValidi(), avviato_il: '' }))
    assert.equal(r.status, 502)
    assert.match(await r.text(), new RegExp(dati.EMAIL_LEAD.replace(/[.]/g, '\\.')))
  })

  test('solo Supabase fallisce: la richiesta è salva grazie all’email', async (t) => {
    servizi()
    simulaFetch(t, { supabase: 500 })
    const r = await bdLead(richiestaJson(campiValidi()))
    assert.equal(r.status, 200)
  })

  test('solo l’email fallisce: la richiesta è salva su Supabase', async (t) => {
    servizi()
    simulaFetch(t, { brevo: 401 })
    const r = await bdLead(richiestaJson(campiValidi()))
    assert.equal(r.status, 200)
  })

  test('mancano le variabili: 502, nessuna chiamata', async (t) => {
    const { chiamate } = simulaFetch(t, {})
    const r = await bdLead(richiestaJson(campiValidi()))
    assert.equal(r.status, 502)
    assert.equal(chiamate.length, 0)
  })

  test('API Conversioni con consenso: evento Lead con em e ph SHA-256, fbp e fbc dai cookie', async (t) => {
    servizi()
    process.env.META_PIXEL_ID = '123456'
    process.env.META_CAPI_TOKEN = 'token-segreto'
    process.env.META_TEST_EVENT_CODE = 'TEST123'
    const { chiamate } = simulaFetch(t, {})
    const r = await bdLead(
      richiestaJson({ ...campiValidi(), consenso_marketing: 'si' }, { 'user-agent': 'Prova/1.0', cookie: '_fbp=fb.1.1.111; _fbc=fb.1.1.abc' }),
      { ip: '203.0.113.7' },
    )
    assert.equal(r.status, 200)
    const meta = chiamate.find((c) => c.url.includes('graph.facebook.com'))
    assert.ok(meta)
    assert.equal(meta.url, `https://graph.facebook.com/${VERSIONE_GRAPH}/123456/events`)
    const corpo = JSON.parse(String(meta.init.body)) as { data: Record<string, unknown>[]; test_event_code: string; access_token: string }
    const [evento] = corpo.data
    assert.equal(evento.event_name, 'Lead')
    assert.equal(evento.event_id, 'evento-0123456789')
    assert.equal(evento.action_source, 'website')
    assert.equal(evento.event_source_url, 'https://biodomussrls.it/')
    const ud = evento.user_data as Record<string, unknown>
    assert.deepEqual(ud.em, [sha256('mario.rossi@esempio.it')])
    assert.deepEqual(ud.ph, [sha256('393491234567')])
    assert.equal(ud.client_ip_address, '203.0.113.7')
    assert.equal(ud.client_user_agent, 'Prova/1.0')
    assert.equal(ud.fbp, 'fb.1.1.111')
    assert.equal(ud.fbc, 'fb.1.1.abc')
    assert.equal(corpo.test_event_code, 'TEST123')
    assert.equal(corpo.access_token, 'token-segreto')
  })
})

describe('funzioni di supporto', () => {
  test('SHA-256 (vettore noto)', () => {
    assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  test('intestazioni Supabase: Authorization solo con chiave legacy JWT', () => {
    assert.equal(intestazioniSupabase('sb_secret_x').Authorization, undefined)
    assert.equal(intestazioniSupabase('eyJhbGciOi.x.y').Authorization, 'Bearer eyJhbGciOi.x.y')
  })

  test('evento Lead: event_time in secondi, niente test_event_code se non impostato', () => {
    const lead = normalizza({ ...campiValidi(), telefono: '' }, 'riserva-00000000')
    const evento = eventoLead(lead, { ip: null, userAgent: null, fbp: null, fbc: null }, 1_800_000_000_123)
    assert.equal(evento.data[0].event_time, 1_800_000_000)
    assert.equal('test_event_code' in evento, false)
    assert.equal((evento.data[0].user_data as Record<string, unknown>).ph, undefined)
  })

  test('email: oggetti e corpo di §8', () => {
    const lead = normalizza(campiValidi(), 'riserva-00000000')
    const a = emailReferente(lead, 'id-prova', new Date('2026-11-23T10:30:00Z'))
    assert.equal(a.oggetto, 'Nuova richiesta · Una casa per me o per la mia famiglia · Gallarate · Da 250.000 € a 350.000 €')
    assert.match(a.testo, /Angolo della campagna: terreno/)
    assert.match(a.testo, /utm_source: facebook/)
    assert.match(a.testo, /23 novembre 2026/)
    const c = emailCliente(lead)
    assert.equal(c.oggetto, 'Abbiamo ricevuto la tua richiesta · Biodomus')
    assert.match(c.testo, /^Ciao Mario, grazie per averci scritto\. Mirko Lanzafame ti risponde entro 2 giorni lavorativi\. Ecco cosa ci hai inviato:/)
    assert.match(c.testo, /Per aggiungere qualcosa rispondi a questa email\.$/)
    assert.ok(!a.html.includes('<script') && !c.html.includes('<script'))
  })
})
