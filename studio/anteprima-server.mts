// Anteprima simulata (CLAUDE.md §13): serve dist/ su http://localhost:4321 e manda POST /api/lead
// direttamente alla funzione netlify/functions/bd-lead.mts con BD_MOCK=1. Nessun servizio esterno.
// Dallo step 7 applica ai file statici gli header di netlify.toml, letti dal file a ogni richiesta (non copiati a mano):
// così Content-Security-Policy e gli altri header si provano in locale. Come su Netlify, le risposte della funzione
// non li ricevono; il 404 sì (è un file di dist/).
// Avvio: npm run anteprima (usa tsx). Porta diversa: PORTA=4322 npm run anteprima.

import { createServer, type IncomingMessage } from 'node:http'
import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(ROOT, 'dist')
const FUNZIONE = join(ROOT, 'netlify', 'functions', 'bd-lead.mts')
const NETLIFY_TOML = join(ROOT, 'netlify.toml')
const PORTA = Number(process.env.PORTA ?? 4321)
process.env.BD_MOCK ??= '1'

const TIPI: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

interface RegolaHeader {
  percorso: RegExp
  valori: Record<string, string>
}

/**
 * Le regole [[headers]] di netlify.toml: «for» con l'asterisco come jolly e i valori di [headers.values].
 * Basta il sottoinsieme di TOML che usa il file (stringhe tra virgolette doppie, commenti con #): nessuna dipendenza.
 */
async function regoleHeader(): Promise<RegolaHeader[]> {
  const testo = await readFile(NETLIFY_TOML, 'utf8').catch(() => '')
  const regole: { per: string; valori: Record<string, string> }[] = []
  let corrente: { per: string; valori: Record<string, string> } | null = null
  let neiValori = false
  for (const grezza of testo.split(/\r?\n/)) {
    const riga = grezza.trim()
    if (!riga || riga.startsWith('#')) continue
    if (riga === '[[headers]]') {
      corrente = { per: '', valori: {} }
      regole.push(corrente)
      neiValori = false
      continue
    }
    if (riga.startsWith('[')) {
      neiValori = corrente !== null && riga === '[headers.values]'
      if (!neiValori) corrente = null
      continue
    }
    const coppia = riga.match(/^"?([A-Za-z0-9_-]+)"?\s*=\s*"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/)
    if (!coppia || !corrente) continue
    const [, chiave, valore] = coppia
    const testoValore = JSON.parse(`"${valore}"`) as string
    if (neiValori) corrente.valori[chiave] = testoValore
    else if (chiave === 'for') corrente.per = testoValore
  }
  return regole
    .filter((r) => r.per)
    .map((r) => ({
      percorso: new RegExp(`^${r.per.split('*').map((pezzo) => pezzo.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`),
      valori: r.valori,
    }))
}

async function headerPer(percorso: string): Promise<Record<string, string>> {
  const valori: Record<string, string> = {}
  for (const regola of await regoleHeader()) if (regola.percorso.test(percorso)) Object.assign(valori, regola.valori)
  return valori
}

function leggiCorpo(richiesta: IncomingMessage): Promise<Buffer> {
  return new Promise((risolvi, rifiuta) => {
    const pezzi: Buffer[] = []
    richiesta.on('data', (pezzo: Buffer) => pezzi.push(pezzo))
    richiesta.on('end', () => risolvi(Buffer.concat(pezzi)))
    richiesta.on('error', rifiuta)
  })
}

function intestazioni(richiesta: IncomingMessage): Headers {
  const h = new Headers()
  for (const [nome, valore] of Object.entries(richiesta.headers)) {
    if (valore === undefined) continue
    for (const v of Array.isArray(valore) ? valore : [valore]) h.append(nome, v)
  }
  return h
}

const server = createServer(async (richiesta, risposta) => {
  const url = new URL(richiesta.url ?? '/', `http://localhost:${PORTA}`)

  if (url.pathname === '/api/lead') {
    if (!existsSync(FUNZIONE)) {
      risposta.writeHead(501, { 'content-type': 'application/json; charset=utf-8' })
      risposta.end(JSON.stringify({ ok: false, errore: 'bd-lead.mts non esiste ancora: arriva allo step 3' }))
      return
    }
    try {
      const corpo = richiesta.method === 'GET' || richiesta.method === 'HEAD' ? undefined : await leggiCorpo(richiesta)
      const req = new Request(url, { method: richiesta.method, headers: intestazioni(richiesta), body: corpo })
      const modulo = (await import(pathToFileURL(FUNZIONE).href)) as { default: (r: Request, c: unknown) => Promise<Response> }
      const res = await modulo.default(req, { ip: '127.0.0.1' })
      risposta.writeHead(res.status, Object.fromEntries(res.headers))
      risposta.end(Buffer.from(await res.arrayBuffer()))
    } catch (errore) {
      console.error('Anteprima: errore nella funzione bd-lead', errore)
      risposta.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
      risposta.end(JSON.stringify({ ok: false, errore: 'errore nella funzione' }))
    }
    return
  }

  let relativo = normalize(decodeURIComponent(url.pathname))
  if (relativo.endsWith(sep) || relativo.endsWith('/')) relativo = join(relativo, 'index.html')
  let file = join(DIST, relativo)
  if (!file.startsWith(DIST)) {
    risposta.writeHead(403).end()
    return
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
    const contenuto = await readFile(file)
    risposta.writeHead(200, { ...(await headerPer(url.pathname)), 'content-type': TIPI[extname(file)] ?? 'application/octet-stream' })
    risposta.end(contenuto)
  } catch {
    const pagina404 = join(DIST, '404.html')
    const contenuto = existsSync(pagina404) ? await readFile(pagina404) : Buffer.from('Pagina non trovata')
    risposta.writeHead(404, { ...(await headerPer(url.pathname)), 'content-type': 'text/html; charset=utf-8' })
    risposta.end(contenuto)
  }
})

server.listen(PORTA, () => {
  console.log(`Anteprima su http://localhost:${PORTA} · BD_MOCK=${process.env.BD_MOCK}`)
})
