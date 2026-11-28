// Prove di netlify/functions/bd-keepalive.mts (step 8): lettura quotidiana e conservazione di 24 mesi (§10 punto 3).
// Nessuna chiamata a Supabase: la richiesta di cancellazione si costruisce e si controlla, fetch è simulato.

import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import bdKeepalive, { MESI_CONSERVAZIONE, config, richiestaCancellazione } from '../../netlify/functions/bd-keepalive.mts'

const ambienteIniziale = { ...process.env }
afterEach(() => {
  process.env = { ...ambienteIniziale }
})

test('pianificata ogni giorno', () => {
  assert.equal(config.schedule, '@daily')
})

test('cancellazione: DELETE delle righe create più di 24 mesi fa, filtro su creato_il, senza chiamare Supabase', () => {
  const { indirizzo, opzioni } = richiestaCancellazione('https://progetto.supabase.co', 'sb_secret_prova', new Date('2026-11-28T03:00:00.000Z'))
  assert.equal(MESI_CONSERVAZIONE, 24)
  assert.equal(opzioni.method, 'DELETE')
  assert.equal(indirizzo, 'https://progetto.supabase.co/rest/v1/bd_leads?creato_il=lt.2024-11-28T03%3A00%3A00.000Z')
  // La chiave segreta sb_secret_ solo in apikey: non è un JWT e su Authorization verrebbe rifiutata
  assert.deepEqual(opzioni.headers, { apikey: 'sb_secret_prova', Prefer: 'return=minimal' })
})

test('cancellazione con la chiave legacy JWT: anche Authorization Bearer', () => {
  const { opzioni } = richiestaCancellazione('https://p.supabase.co', 'eyJprova', new Date('2026-11-28T00:00:00Z'))
  assert.equal((opzioni.headers as Record<string, string>).Authorization, 'Bearer eyJprova')
})

test('il keepalive fa una lettura e una cancellazione, e nient\'altro (fetch simulato)', async (t) => {
  process.env.SUPABASE_URL = 'https://progetto.supabase.co/'
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_prova'
  const chiamate: { url: string; metodo: string }[] = []
  t.mock.method(globalThis, 'fetch', async (url: string | URL, init: RequestInit = {}) => {
    chiamate.push({ url: String(url), metodo: init.method ?? 'GET' })
    return new Response(init.method === 'DELETE' ? null : '[]', { status: init.method === 'DELETE' ? 204 : 200 })
  })
  t.mock.method(console, 'log', () => {})
  const risposta = await bdKeepalive()
  assert.equal(risposta.status, 204)
  assert.equal(chiamate.length, 2)
  assert.deepEqual(chiamate[0], { url: 'https://progetto.supabase.co/rest/v1/bd_leads?select=id&limit=1', metodo: 'GET' })
  assert.equal(chiamate[1].metodo, 'DELETE')
  assert.match(chiamate[1].url, /^https:\/\/progetto\.supabase\.co\/rest\/v1\/bd_leads\?creato_il=lt\.\d{4}-\d{2}-\d{2}T/)
})

test('senza variabili d\'ambiente non chiama nulla', async (t) => {
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_SECRET_KEY
  const finta = t.mock.method(globalThis, 'fetch', async () => new Response(null))
  t.mock.method(console, 'log', () => {})
  const risposta = await bdKeepalive()
  assert.equal(risposta.status, 204)
  assert.equal(finta.mock.callCount(), 0)
})
