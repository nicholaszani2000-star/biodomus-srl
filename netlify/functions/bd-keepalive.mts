// Funzione pianificata, una volta al giorno (cron in UTC, gira solo sui deploy pubblicati). Due compiti:
// 1. tiene sveglio il progetto Supabase Free, che va in pausa dopo 7 giorni di bassa attività (CLAUDE.md §4):
//    una lettura (un id) da bd_leads;
// 2. conservazione (§10 punto 3): cancella le righe di bd_leads create più di 24 mesi fa, così nessuna richiesta resta
//    oltre il tempo scritto nell'informativa (che conta dall'ultimo contatto, quindi mai prima dell'invio).
// Verificato sulla documentazione di PostgREST: DELETE /rest/v1/tabella?colonna=lt.valore (filtro obbligatorio).
// La chiave segreta va solo nell'header apikey; Authorization solo con la chiave legacy JWT (come in bd-lead).
// Senza variabili d'ambiente esce senza errori. In locale: netlify functions:invoke bd-keepalive

import type { Config } from '@netlify/functions'

export const config: Config = { schedule: '@daily' }

export const MESI_CONSERVAZIONE = 24

function intestazioni(chiave: string): Record<string, string> {
  const valori: Record<string, string> = { apikey: chiave }
  if (chiave.startsWith('eyJ')) valori.Authorization = `Bearer ${chiave}`
  return valori
}

/** La richiesta di cancellazione delle righe più vecchie di 24 mesi (creato_il prima del limite). Non chiama nulla. */
export function richiestaCancellazione(url: string, chiave: string, oggi = new Date()): { indirizzo: string; opzioni: RequestInit } {
  const limite = new Date(oggi)
  limite.setUTCMonth(limite.getUTCMonth() - MESI_CONSERVAZIONE)
  return {
    indirizzo: `${url}/rest/v1/bd_leads?creato_il=lt.${encodeURIComponent(limite.toISOString())}`,
    opzioni: { method: 'DELETE', headers: { ...intestazioni(chiave), Prefer: 'return=minimal' } },
  }
}

export default async function bdKeepalive(): Promise<Response> {
  const url = (process.env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
  const chiave = (process.env.SUPABASE_SECRET_KEY ?? '').trim()
  if (!url || !chiave) {
    console.log('bd-keepalive: SUPABASE_URL o SUPABASE_SECRET_KEY non impostate, niente da fare')
    return new Response(null, { status: 204 })
  }
  try {
    const lettura = await fetch(`${url}/rest/v1/bd_leads?select=id&limit=1`, {
      headers: intestazioni(chiave),
      signal: AbortSignal.timeout(8000),
    })
    if (!lettura.ok) console.error(`bd-keepalive: lettura non riuscita (HTTP ${lettura.status})`)
    else console.log('bd-keepalive: Supabase risponde')
  } catch {
    console.error('bd-keepalive: Supabase non raggiungibile per la lettura (timeout o errore di rete)')
  }
  try {
    const { indirizzo, opzioni } = richiestaCancellazione(url, chiave)
    const cancellazione = await fetch(indirizzo, { ...opzioni, signal: AbortSignal.timeout(8000) })
    if (!cancellazione.ok) console.error(`bd-keepalive: cancellazione oltre ${MESI_CONSERVAZIONE} mesi non riuscita (HTTP ${cancellazione.status})`)
    else console.log(`bd-keepalive: righe più vecchie di ${MESI_CONSERVAZIONE} mesi cancellate`)
  } catch {
    console.error('bd-keepalive: Supabase non raggiungibile per la cancellazione (timeout o errore di rete)')
  }
  return new Response(null, { status: 204 })
}
