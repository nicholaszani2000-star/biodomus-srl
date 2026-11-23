// Tiene sveglio il progetto Supabase Free, che va in pausa dopo 7 giorni di bassa attività (CLAUDE.md §4).
// Funzione pianificata: gira una volta al giorno (cron in UTC) e solo sui deploy pubblicati.
// Fa una sola lettura (un id) da bd_leads con la chiave segreta. Senza variabili d'ambiente esce senza errori.
// In locale: netlify functions:invoke bd-keepalive

import type { Config } from '@netlify/functions'

export const config: Config = { schedule: '@daily' }

export default async function bdKeepalive(): Promise<Response> {
  const url = (process.env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
  const chiave = (process.env.SUPABASE_SECRET_KEY ?? '').trim()
  if (!url || !chiave) {
    console.log('bd-keepalive: SUPABASE_URL o SUPABASE_SECRET_KEY non impostate, niente da fare')
    return new Response(null, { status: 204 })
  }
  try {
    // Le chiavi sb_secret_ vanno solo in apikey; Authorization solo con la chiave legacy JWT (come in bd-lead)
    const intestazioni: Record<string, string> = { apikey: chiave }
    if (chiave.startsWith('eyJ')) intestazioni.Authorization = `Bearer ${chiave}`
    const risposta = await fetch(`${url}/rest/v1/bd_leads?select=id&limit=1`, {
      headers: intestazioni,
      signal: AbortSignal.timeout(8000),
    })
    if (!risposta.ok) console.error(`bd-keepalive: lettura non riuscita (HTTP ${risposta.status})`)
    else console.log('bd-keepalive: Supabase risponde')
  } catch {
    console.error('bd-keepalive: Supabase non raggiungibile (timeout o errore di rete)')
  }
  return new Response(null, { status: 204 })
}
