// Funzione del modulo di preventivo (CLAUDE.md §4): POST /api/lead.
//
// Verificato sulla documentazione ufficiale (step 3):
// - Netlify Functions: default export (req: Request, context: Context) => Response, config.path (@netlify/functions 6.1.1);
//   funzioni sincrone fino a 60 s (documentazione di novembre 2026); le chiamate esterne partono comunque in parallelo,
//   ognuna con 8 s di timeout, così la risposta arriva in pochi secondi e un servizio lento non blocca gli altri.
// - Brevo: POST https://api.brevo.com/v3/smtp/email, header api-key, campi sender, to, replyTo, subject,
//   htmlContent, textContent (SDK ufficiale getbrevo/brevo-node).
// - Supabase: POST {SUPABASE_URL}/rest/v1/bd_leads con Prefer: return=minimal (PostgREST). Le chiavi segrete
//   sb_secret_… vanno solo nell'header apikey: non sono JWT e su Authorization: Bearer vengono rifiutate.
//   Authorization si aggiunge solo con una chiave legacy service_role (JWT, inizia con «eyJ»).
// - Meta API Conversioni: POST https://graph.facebook.com/v27.0/{pixel}/events (SDK ufficiale 27.0.0),
//   event_name, event_time in secondi, event_id, action_source, event_source_url, user_data con em e ph
//   normalizzati e SHA-256, client_ip_address, client_user_agent, fbp, fbc; test_event_code nella richiesta.
//
// Con BD_MOCK=1 non chiama nessun servizio: scrive il contatto, con email e telefono mascherati,
// in studio/report/lead-mock.jsonl (e le due email in studio/report/lead-mock-email.txt).
// Con BD_MOCK=errore (anteprima e prove) simula email e Supabase non riusciti insieme: risposta 502 e, nella pagina,
// il messaggio con l'email pubblica come ripiego. Nessun servizio esterno.

import type { Config, Context } from '@netlify/functions'
import { createHash, randomUUID } from 'node:crypto'
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dati, emailPubblica, fasceBudget } from '../../src/content/dati.ts'
import { riempi, tt } from '../../src/content/bd-testi.ts'
import {
  CAMPI,
  CORPO_MASSIMO_BYTE,
  type DatiModulo,
  type Errori,
  type Lead,
  honeypotPieno,
  mascheraEmail,
  mascheraTelefono,
  normalizza,
  troppoVeloce,
  valida,
} from '../../src/lib/bd-lead-regole.ts'

export const config: Config = { path: '/api/lead' }

export const VERSIONE_GRAPH = 'v27.0'
const TIMEOUT_MS = 8000
const FILE_MOCK_PREDEFINITO = fileURLToPath(new URL('../../studio/report/lead-mock.jsonl', import.meta.url))

const ambiente = (nome: string): string => (process.env[nome] ?? '').trim()
// BD_MOCK_FILE serve ai test, per non scrivere nel file dell'anteprima
const fileMock = () => ambiente('BD_MOCK_FILE') || FILE_MOCK_PREDEFINITO

// ---------- lettura della richiesta ----------

/** Valori del corpo, solo i campi noti e sempre come testo. Lancia «json» se il JSON non è valido. */
export function leggiCampi(corpo: string, tipo: string): DatiModulo {
  const campi: DatiModulo = {}
  const metti = (chiave: string, valore: unknown) => {
    if ((CAMPI as readonly string[]).includes(chiave) && valore !== undefined && valore !== null) {
      campi[chiave as keyof DatiModulo] = String(valore)
    }
  }
  if (tipo.includes('application/json')) {
    const oggetto: unknown = JSON.parse(corpo)
    if (!oggetto || typeof oggetto !== 'object' || Array.isArray(oggetto)) throw new Error('json')
    for (const [k, v] of Object.entries(oggetto)) metti(k, v)
  } else {
    for (const [k, v] of new URLSearchParams(corpo)) metti(k, v)
  }
  return campi
}

/**
 * Senza JavaScript UTM e pagina arrivano vuoti e l'angolo vale quello dell'HTML prerenderizzato (famiglia):
 * si ricavano dalla pagina di provenienza (Referer, stessa origine). L'invio con JavaScript ha sempre avviato_il.
 * Dal Referer solo gli utm_*, mai fbclid: senza JavaScript non c'è un consenso di marketing (§10.4).
 * In ogni caso normalizza() scarta fbclid quando consenso_marketing è falso.
 */
function completaDaReferer(campi: DatiModulo, referer: string | null): void {
  if (!referer) return
  try {
    const url = new URL(referer)
    for (const chiave of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const) {
      if (!campi[chiave] && url.searchParams.get(chiave)) campi[chiave] = url.searchParams.get(chiave) ?? undefined
    }
    const angoloUrl = url.searchParams.get('a')
    if (angoloUrl && (!campi.angolo || !campi.avviato_il)) campi.angolo = angoloUrl
    if (!campi.pagina) campi.pagina = `${url.origin}${url.pathname}`
  } catch {
    // referer non valido: si va avanti senza
  }
}

function leggiCookie(intestazione: string | null, nome: string): string | null {
  for (const parte of (intestazione ?? '').split(';')) {
    const [k, ...v] = parte.trim().split('=')
    if (k === nome && v.length) return decodeURIComponent(v.join('='))
  }
  return null
}

// ---------- testi delle email (copy di §8 da testi.json) ----------

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function etichette(lead: Lead) {
  return {
    profilo: tt(`modulo.passo1.profili.${lead.profilo}`),
    terreno: tt(`modulo.passo1.terreno.${lead.terreno}`),
    budget: fasceBudget().find((f) => f.valore === lead.budget)?.etichetta ?? lead.budget,
    tempistica: tt(`modulo.passo2.tempistiche.${lead.tempistica}`),
  }
}

/** Le risposte della persona, come coppie domanda → risposta (per entrambe le email). */
function risposte(lead: Lead): [string, string][] {
  const e = etichette(lead)
  const vuoto = tt('modulo.email.etichette.vuoto')
  return [
    [tt('modulo.passo1.domandaProfilo'), e.profilo],
    [tt('modulo.passo1.domandaTerreno'), e.terreno],
    [tt('modulo.passo2.comune'), lead.comune],
    [tt('modulo.passo2.budget'), e.budget],
    [tt('modulo.passo2.tempistica'), e.tempistica],
    [tt('modulo.passo3.nome'), lead.nome],
    [tt('modulo.passo3.email'), lead.email],
    [tt('modulo.passo3.telefono'), lead.telefono ?? vuoto],
    [tt('modulo.passo3.messaggio'), lead.messaggio ?? vuoto],
  ]
}

const riga = ([domanda, risposta]: [string, string]) =>
  /[?:]$/.test(domanda) ? `${domanda} ${risposta}` : `${domanda}: ${risposta}`

function tabellaHtml(righe: [string, string][]): string {
  return `<table cellpadding="6" style="border-collapse:collapse;font:15px/1.5 Arial,sans-serif;color:#1F2326">${righe
    .map(
      ([k, v]) =>
        `<tr><td style="color:#595E62;vertical-align:top;padding-right:16px">${escapeHtml(k)}</td><td>${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`,
    )
    .join('')}</table>`
}

export interface Email {
  oggetto: string
  testo: string
  html: string
}

export function emailReferente(lead: Lead, id: string, creatoIl: Date): Email {
  const e = etichette(lead)
  const et = (k: string) => tt(`modulo.email.etichette.${k}`)
  const dataOra = new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Rome' }).format(creatoIl)
  const tecnici: [string, string][] = [
    [et('angolo'), lead.angolo],
    ...(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid'] as const).map(
      (k): [string, string] => [k, lead[k] ?? et('vuoto')],
    ),
    [et('pagina'), lead.pagina ?? et('vuoto')],
    [et('consenso'), lead.consenso_marketing ? et('si') : et('no')],
    [et('dataOra'), dataOra],
    [et('codice'), id],
  ]
  const oggetto = riempi(tt('modulo.email.oggettoReferente'), { profilo: e.profilo, comune: lead.comune, budget: e.budget })
  const titolo = tt('modulo.email.titoloReferente')
  const testo = [titolo, '', ...risposte(lead).map(riga), '', ...tecnici.map(riga)].join('\n')
  const html = `<p style="font:600 18px Arial,sans-serif;color:#1F2326">${escapeHtml(titolo)}</p>${tabellaHtml(risposte(lead))}<hr style="border:0;border-top:1px solid #D3D1CC;margin:16px 0">${tabellaHtml(tecnici)}`
  return { oggetto, testo, html }
}

export function emailCliente(lead: Lead): Email {
  const nome = lead.nome.split(' ')[0]
  const SEGNA = '\u0000RIEPILOGO\u0000'
  const corpo = riempi(tt('modulo.email.corpoCliente'), { nome, riepilogo: SEGNA })
  const [prima, dopo = ''] = corpo.split(SEGNA)
  const finale = dopo.replace(/^\.\s*/, '')
  const elenco = risposte(lead).map(riga)
  const testo = `${prima.trim()}\n\n${elenco.map((r) => `- ${r}`).join('\n')}\n\n${finale}`
  const html = `<div style="font:15px/1.6 Arial,sans-serif;color:#1F2326"><p>${escapeHtml(prima.trim())}</p>${tabellaHtml(risposte(lead))}<p>${escapeHtml(finale)}</p></div>`
  return { oggetto: tt('modulo.email.oggettoCliente'), testo, html }
}

// ---------- chiamate esterne ----------

export interface Esito {
  passaggio: string
  ok: boolean
  stato: number | 'timeout' | 'rete' | 'configurazione'
}

async function chiama(passaggio: string, url: string, init: RequestInit): Promise<Esito> {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!r.ok) console.error(`bd-lead: ${passaggio} non riuscito (HTTP ${r.status})`)
    return { passaggio, ok: r.ok, stato: r.status }
  } catch (errore) {
    const timeout = errore instanceof Error && (errore.name === 'TimeoutError' || errore.name === 'AbortError')
    console.error(`bd-lead: ${passaggio} non riuscito (${timeout ? 'timeout di 8 s' : 'errore di rete'})`)
    return { passaggio, ok: false, stato: timeout ? 'timeout' : 'rete' }
  }
}

function mancaConfigurazione(passaggio: string, variabili: string[]): Esito {
  console.error(`bd-lead: ${passaggio} saltato (mancano ${variabili.join(', ')})`)
  return { passaggio, ok: false, stato: 'configurazione' }
}

async function inviaEmail(passaggio: string, a: { email: string; name?: string }, email: Email, rispondiA: string): Promise<Esito> {
  const chiave = ambiente('BREVO_API_KEY')
  const mittente = ambiente('BREVO_MITTENTE')
  if (!chiave || !mittente) return mancaConfigurazione(passaggio, ['BREVO_API_KEY', 'BREVO_MITTENTE'].filter((v) => !ambiente(v)))
  return chiama(passaggio, 'https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': chiave, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: dati.BRAND, email: mittente },
      to: [a],
      replyTo: { email: rispondiA },
      subject: email.oggetto,
      htmlContent: email.html,
      textContent: email.testo,
    }),
  })
}

/** Intestazioni per Supabase: apikey sempre; Authorization solo con una chiave legacy JWT. */
export function intestazioniSupabase(chiave: string): Record<string, string> {
  return {
    apikey: chiave,
    ...(chiave.startsWith('eyJ') ? { Authorization: `Bearer ${chiave}` } : {}),
    'content-type': 'application/json',
    Prefer: 'return=minimal',
  }
}

async function salvaSupabase(lead: Lead, id: string, creatoIl: Date): Promise<Esito> {
  const url = ambiente('SUPABASE_URL').replace(/\/+$/, '')
  const chiave = ambiente('SUPABASE_SECRET_KEY')
  if (!url || !chiave) return mancaConfigurazione('Supabase', ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'].filter((v) => !ambiente(v)))
  // event_id serve solo a Meta: non è una colonna della tabella (§4)
  const { event_id: _eventId, ...colonne } = lead
  void _eventId
  return chiama('Supabase', `${url}/rest/v1/bd_leads`, {
    method: 'POST',
    headers: intestazioniSupabase(chiave),
    body: JSON.stringify({ id, creato_il: creatoIl.toISOString(), ...colonne }),
  })
}

export const sha256 = (valore: string) => createHash('sha256').update(valore).digest('hex')

/** Corpo per l'API Conversioni: em e ph normalizzati come lo SDK ufficiale di Meta, poi SHA-256. */
export function eventoLead(lead: Lead, extra: { ip: string | null; userAgent: string | null; fbp: string | null; fbc: string | null }, adesso = Date.now()) {
  const paginaValida = lead.pagina && /^https?:\/\//.test(lead.pagina) ? lead.pagina : undefined
  const userData: Record<string, unknown> = { em: [sha256(lead.email.trim().toLowerCase())] }
  if (lead.telefono) userData.ph = [sha256(lead.telefono.replace(/\D/g, ''))]
  if (extra.ip) userData.client_ip_address = extra.ip
  if (extra.userAgent) userData.client_user_agent = extra.userAgent
  if (extra.fbp) userData.fbp = extra.fbp
  if (extra.fbc) userData.fbc = extra.fbc
  const codiceTest = ambiente('META_TEST_EVENT_CODE')
  return {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(adesso / 1000),
        event_id: lead.event_id,
        action_source: 'website',
        ...(paginaValida ? { event_source_url: paginaValida } : {}),
        user_data: userData,
      },
    ],
    ...(codiceTest ? { test_event_code: codiceTest } : {}),
  }
}

async function inviaConversione(lead: Lead, req: Request, context: Pick<Context, 'ip'> | undefined): Promise<Esito | null> {
  const pixel = ambiente('META_PIXEL_ID')
  const token = ambiente('META_CAPI_TOKEN')
  // Solo con il consenso ai cookie di marketing e con Pixel e token configurati (§10.4)
  if (!lead.consenso_marketing || !pixel || !token) return null
  const cookie = req.headers.get('cookie')
  const evento = eventoLead(lead, {
    ip: context?.ip ?? null,
    userAgent: req.headers.get('user-agent'),
    fbp: leggiCookie(cookie, '_fbp'),
    fbc: leggiCookie(cookie, '_fbc'),
  })
  return chiama('API Conversioni', `https://graph.facebook.com/${VERSIONE_GRAPH}/${encodeURIComponent(pixel)}/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...evento, access_token: token }),
  })
}

// ---------- risposte ----------

const json = (stato: number, corpo: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } })

const vaiA = (destinazione: string) => new Response(null, { status: 303, headers: { location: destinazione, 'cache-control': 'no-store' } })

function paginaErrore(stato: number, titolo: string, righe: string[]): Response {
  const html = `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(titolo)}</title><body style="font:17px/1.6 system-ui,sans-serif;background:#EDECE8;color:#1F2326;max-width:40rem;margin:0 auto;padding:48px 16px"><h1 style="font-size:1.6rem;line-height:1.2">${escapeHtml(titolo)}</h1><ul>${righe.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul><p><a href="/#preventivo" style="color:#383E42">${escapeHtml(tt('modulo.senzaJs.torna'))}</a></p></body></html>`
  return new Response(html, { status: stato, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}

function etichettaCampo(campo: string): string {
  const mappa: Record<string, string> = {
    profilo: 'modulo.passo1.domandaProfilo',
    terreno: 'modulo.passo1.domandaTerreno',
    comune: 'modulo.passo2.comune',
    budget: 'modulo.passo2.budget',
    tempistica: 'modulo.passo2.tempistica',
    nome: 'modulo.passo3.nome',
    email: 'modulo.passo3.email',
    telefono: 'modulo.passo3.telefono',
  }
  return mappa[campo] ? tt(mappa[campo]) : campo
}

// ---------- la funzione ----------

export default async function bdLead(req: Request, context?: Pick<Context, 'ip'>): Promise<Response> {
  const vuoleJson = (req.headers.get('accept') ?? '').includes('application/json')
  const successo = (id: string) => (vuoleJson ? json(200, { ok: true, id }) : vaiA('/grazie.html'))

  if (req.method !== 'POST') return json(405, { ok: false, errore: 'metodo non ammesso' }, { allow: 'POST' })

  const dichiarata = Number(req.headers.get('content-length') ?? 0)
  if (dichiarata > CORPO_MASSIMO_BYTE) return json(413, { ok: false, errore: 'richiesta troppo grande' })
  const corpo = await req.text()
  if (new TextEncoder().encode(corpo).length > CORPO_MASSIMO_BYTE) return json(413, { ok: false, errore: 'richiesta troppo grande' })

  const tipo = (req.headers.get('content-type') ?? '').toLowerCase()
  if (!tipo.includes('application/json') && !tipo.includes('application/x-www-form-urlencoded')) {
    return json(415, { ok: false, errore: 'formato non supportato' })
  }

  let campi: DatiModulo
  try {
    campi = leggiCampi(corpo, tipo)
  } catch {
    return json(400, { ok: false, errore: 'JSON non valido' })
  }

  // Antispam: risposta di successo finta, così il bot non impara nulla
  if (honeypotPieno(campi) || troppoVeloce(campi)) return successo(randomUUID())

  const errori: Errori = valida(campi)
  if (Object.keys(errori).length) {
    if (vuoleJson) return json(400, { ok: false, errori })
    const righe = Object.entries(errori).map(([campo, chiave]) => `${etichettaCampo(campo)}: ${tt(`modulo.errori.${chiave}`)}`)
    return paginaErrore(400, tt('modulo.senzaJs.titoloErrore'), righe)
  }

  completaDaReferer(campi, req.headers.get('referer'))
  const id = randomUUID()
  const creatoIl = new Date()
  const lead = normalizza(campi, randomUUID())
  const perReferente = emailReferente(lead, id, creatoIl)
  const perCliente = emailCliente(lead)

  if (ambiente('BD_MOCK') === 'errore') {
    console.error('bd-lead: BD_MOCK=errore, email a EMAIL_LEAD e Supabase simulati come non riusciti')
    return invioNonRiuscito(vuoleJson)
  }

  if (ambiente('BD_MOCK') === '1') {
    const riga = {
      ricevuto_il: creatoIl.toISOString(),
      id,
      ...lead,
      email: mascheraEmail(lead.email),
      telefono: mascheraTelefono(lead.telefono),
      passaggi: {
        email_referente: 'simulata',
        email_cliente: 'simulata',
        supabase: 'simulato',
        api_conversioni: lead.consenso_marketing ? 'solo con META_PIXEL_ID e META_CAPI_TOKEN' : 'no (nessun consenso)',
      },
    }
    await mkdir(dirname(fileMock()), { recursive: true })
    await appendFile(fileMock(), JSON.stringify(riga) + '\n')
    const anteprima = [
      `A: ${ambiente('EMAIL_LEAD') || dati.EMAIL_LEAD} · Rispondi a: ${mascheraEmail(lead.email)}`,
      `Oggetto: ${perReferente.oggetto}`,
      '',
      perReferente.testo.replace(lead.email, mascheraEmail(lead.email)).replace(lead.telefono ?? '\u0000', mascheraTelefono(lead.telefono) ?? ''),
      '',
      '──────────',
      '',
      `A: ${mascheraEmail(lead.email)} · Rispondi a: ${ambiente('EMAIL_LEAD') || dati.EMAIL_LEAD}`,
      `Oggetto: ${perCliente.oggetto}`,
      '',
      perCliente.testo.replace(lead.email, mascheraEmail(lead.email)).replace(lead.telefono ?? '\u0000', mascheraTelefono(lead.telefono) ?? ''),
      '',
    ].join('\n')
    await writeFile(fileMock().replace(/\.jsonl$/, '') + '-email.txt', anteprima)
    return successo(id)
  }

  // 1) email a Mirko · 2) conferma al cliente · 3) Supabase · 4) API Conversioni:
  // partono insieme, ognuna con il suo timeout; un passaggio che fallisce non blocca gli altri.
  const destinatario = ambiente('EMAIL_LEAD') || dati.EMAIL_LEAD
  const [referente, , supabase] = await Promise.all([
    inviaEmail('email a EMAIL_LEAD', { email: destinatario, name: dati.REFERENTE }, perReferente, lead.email),
    inviaEmail('email di conferma', { email: lead.email, name: lead.nome }, perCliente, destinatario),
    salvaSupabase(lead, id, creatoIl),
    inviaConversione(lead, req, context),
  ])

  if (!referente.ok && !supabase.ok) {
    console.error('bd-lead: email a EMAIL_LEAD e Supabase non riusciti, richiesta persa')
    return invioNonRiuscito(vuoleJson)
  }
  return successo(id)
}

/** Email e Supabase non riusciti insieme: 502, e la pagina mostra l'email pubblica come ripiego (§4). */
function invioNonRiuscito(vuoleJson: boolean): Response {
  if (vuoleJson) return json(502, { ok: false, errore: 'invio non riuscito', email: emailPubblica() })
  return paginaErrore(502, tt('modulo.erroreInvio').replace(/\.$/, ''), [])
}
