// Regole del modulo di preventivo, condivise da pagina (BdModulo) e funzione (netlify/functions/bd-lead.mts):
// stesse scelte ammesse, stessa validazione, stessa normalizzazione. Niente DOM, niente API di Node, niente librerie.
// Le scelte ammesse vengono da testi.json (etichette) e da dati.ts (fasce di budget): una sola fonte.

import testi from '../content/testi.json'
import { fasceBudget } from '../content/dati.ts'

export const PROFILI = Object.keys(testi.modulo.passo1.profili) as readonly string[] // casa, investimento, altro
export const TERRENI = Object.keys(testi.modulo.passo1.terreno) as readonly string[] // si, cerco, no
export const TEMPISTICHE = Object.keys(testi.modulo.passo2.tempistiche) as readonly string[]
export const BUDGET = fasceBudget().map((f) => f.valore) as readonly string[]
export const ANGOLI_LEAD = ['famiglia', 'terreno', 'investo'] as const

/** Nome del campo trappola: le persone non lo vedono, i bot lo riempiono. */
export const CAMPO_HONEYPOT = 'sito_web'
/** Tempo minimo tra apertura del modulo e invio (CLAUDE.md §4). */
export const TEMPO_MINIMO_MS = 3000
/** Corpo massimo della richiesta (CLAUDE.md §4). */
export const CORPO_MASSIMO_BYTE = 10 * 1024

export const LIMITI = { comune: 80, nome: 80, email: 254, telefono: 25, messaggio: 2000, campoTecnico: 300 } as const

/** I campi che il modulo invia. Tutto è testo: è così che arriva da un form e da JSON. */
export const CAMPI = [
  'profilo',
  'terreno',
  'comune',
  'budget',
  'tempistica',
  'nome',
  'email',
  'telefono',
  'messaggio',
  'angolo',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'fbclid',
  'pagina',
  'event_id',
  'avviato_il',
  'consenso_marketing',
  CAMPO_HONEYPOT,
] as const

export type Campo = (typeof CAMPI)[number]
export type DatiModulo = Partial<Record<Campo, string>>

/** Chiave dell'errore in testi.json → modulo.errori */
export type Errore = 'scelta' | 'comune' | 'nome' | 'email' | 'telefono'
export type CampoValidato = 'profilo' | 'terreno' | 'comune' | 'budget' | 'tempistica' | 'nome' | 'email' | 'telefono'
export type Errori = Partial<Record<CampoValidato, Errore>>

/** Quali campi controlla ogni passaggio. */
export const CAMPI_PER_PASSO: Record<1 | 2 | 3, readonly CampoValidato[]> = {
  1: ['profilo', 'terreno'],
  2: ['comune', 'budget', 'tempistica'],
  3: ['nome', 'email', 'telefono'],
}

const pulito = (v: string | undefined) => (v ?? '').trim()
const cifre = (v: string) => v.replace(/\D/g, '')

const RE_EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/

export function emailValida(email: string): boolean {
  const e = email.trim()
  return e.length <= LIMITI.email && RE_EMAIL.test(e)
}

/** Facoltativo: vuoto va bene; se c'è, da 9 a 15 cifre (CLAUDE.md §8: «almeno 9 cifre»). */
export function telefonoValido(telefono: string): boolean {
  const t = telefono.trim()
  if (!t) return true
  if (t.length > LIMITI.telefono || !/^[\d\s+()./-]+$/.test(t)) return false
  const n = cifre(t).length
  return n >= 9 && n <= 15
}

function controlla(campo: CampoValidato, d: DatiModulo): Errore | null {
  switch (campo) {
    case 'profilo':
      return PROFILI.includes(pulito(d.profilo)) ? null : 'scelta'
    case 'terreno':
      return TERRENI.includes(pulito(d.terreno)) ? null : 'scelta'
    case 'budget':
      return BUDGET.includes(pulito(d.budget)) ? null : 'scelta'
    case 'tempistica':
      return TEMPISTICHE.includes(pulito(d.tempistica)) ? null : 'scelta'
    case 'comune': {
      const c = pulito(d.comune)
      return c.length >= 2 && c.length <= LIMITI.comune ? null : 'comune'
    }
    case 'nome': {
      const n = pulito(d.nome)
      return n.length >= 2 && n.length <= LIMITI.nome && /\p{L}/u.test(n) ? null : 'nome'
    }
    case 'email':
      return emailValida(pulito(d.email)) ? null : 'email'
    case 'telefono':
      return telefonoValido(pulito(d.telefono)) ? null : 'telefono'
  }
}

/** Errori di un passaggio (per «Avanti») o di tutto il modulo (passo omesso, per l'invio e per il server). */
export function valida(d: DatiModulo, passo?: 1 | 2 | 3): Errori {
  const campi = passo ? CAMPI_PER_PASSO[passo] : [...CAMPI_PER_PASSO[1], ...CAMPI_PER_PASSO[2], ...CAMPI_PER_PASSO[3]]
  const errori: Errori = {}
  for (const campo of campi) {
    const errore = controlla(campo, d)
    if (errore) errori[campo] = errore
  }
  // Il messaggio non ha un errore in §8: se è troppo lungo lo accorcia la normalizzazione.
  return errori
}

/** Il passaggio in cui si trova un campo (per tornarci quando l'invio trova un errore). */
export function passoDi(campo: CampoValidato): 1 | 2 | 3 {
  return CAMPI_PER_PASSO[1].includes(campo) ? 1 : CAMPI_PER_PASSO[2].includes(campo) ? 2 : 3
}

// ---------- antispam ----------

export function honeypotPieno(d: DatiModulo): boolean {
  return pulito(d[CAMPO_HONEYPOT]).length > 0
}

/** true se il modulo è stato inviato troppo presto. Senza avviato_il (invio senza JavaScript) il controllo si salta. */
export function troppoVeloce(d: DatiModulo, adesso = Date.now()): boolean {
  const avviato = Number(pulito(d.avviato_il))
  if (!pulito(d.avviato_il) || !Number.isFinite(avviato) || avviato <= 0) return false
  return adesso - avviato < TEMPO_MINIMO_MS
}

// ---------- normalizzazione (lato server) ----------

/** Testo senza HTML, senza caratteri di controllo, spazi compatti; a capo ammessi solo se richiesto. */
export function testoPulito(valore: string | undefined, massimo: number, aCapo = false): string {
  let t = (valore ?? '')
    .replace(/<[^>]*>?/g, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  t = aCapo ? t.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n') : t.replace(/\s+/g, ' ')
  return t.trim().slice(0, massimo)
}

/** Email in minuscolo e senza spazi. */
export function normalizzaEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Telefono in formato internazionale: solo cifre con «+», +39 se manca il prefisso. Vuoto resta vuoto. */
export function normalizzaTelefono(telefono: string): string {
  const t = telefono.trim()
  if (!t) return ''
  const n = cifre(t)
  if (t.startsWith('+')) return `+${n}`
  if (n.startsWith('00')) return `+${n.slice(2)}`
  return `+39${n}`
}

export interface Lead {
  profilo: string
  terreno: string
  comune: string
  budget: string
  tempistica: string
  nome: string
  email: string
  telefono: string | null
  messaggio: string | null
  angolo: (typeof ANGOLI_LEAD)[number]
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  fbclid: string | null
  pagina: string | null
  event_id: string
  consenso_marketing: boolean
}

const facoltativo = (v: string | undefined, massimo: number) => testoPulito(v, massimo) || null

/** Dati validi → lead pronto per email e database. Va chiamata dopo valida() senza errori. */
export function normalizza(d: DatiModulo, eventIdDiRiserva: string): Lead {
  const angolo = pulito(d.angolo)
  const eventId = pulito(d.event_id)
  const consensoMarketing = ['si', 'sì', 'true', '1', 'on'].includes(pulito(d.consenso_marketing).toLowerCase())
  return {
    profilo: pulito(d.profilo),
    terreno: pulito(d.terreno),
    comune: testoPulito(d.comune, LIMITI.comune),
    budget: pulito(d.budget),
    tempistica: pulito(d.tempistica),
    nome: testoPulito(d.nome, LIMITI.nome),
    email: normalizzaEmail(pulito(d.email)),
    telefono: normalizzaTelefono(pulito(d.telefono)) || null,
    messaggio: testoPulito(d.messaggio, LIMITI.messaggio, true) || null,
    angolo: (ANGOLI_LEAD as readonly string[]).includes(angolo) ? (angolo as Lead['angolo']) : 'famiglia',
    utm_source: facoltativo(d.utm_source, LIMITI.campoTecnico),
    utm_medium: facoltativo(d.utm_medium, LIMITI.campoTecnico),
    utm_campaign: facoltativo(d.utm_campaign, LIMITI.campoTecnico),
    utm_content: facoltativo(d.utm_content, LIMITI.campoTecnico),
    // fbclid identifica il clic su un annuncio di Meta: serve solo alla misurazione, quindi solo con il consenso (§10.4)
    fbclid: consensoMarketing ? facoltativo(d.fbclid, LIMITI.campoTecnico) : null,
    pagina: facoltativo(d.pagina, LIMITI.campoTecnico),
    event_id: /^[\w-]{8,64}$/.test(eventId) ? eventId : eventIdDiRiserva,
    consenso_marketing: consensoMarketing,
  }
}

/** Email e telefono mascherati, per log e file di prova: «m***@e***.it», «+39******07». */
export function mascheraEmail(email: string): string {
  const [utente, dominio = ''] = email.split('@')
  const punto = dominio.lastIndexOf('.')
  const nomeDominio = punto > 0 ? dominio.slice(0, punto) : dominio
  const estensione = punto > 0 ? dominio.slice(punto) : ''
  return `${utente.slice(0, 1)}***@${nomeDominio.slice(0, 1)}***${estensione}`
}

export function mascheraTelefono(telefono: string | null): string | null {
  if (!telefono) return null
  return telefono.slice(0, 3) + '*'.repeat(Math.max(0, telefono.length - 5)) + telefono.slice(-2)
}
