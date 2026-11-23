// Dati del progetto: copia fedele di §2 di CLAUDE.md, unica fonte per tutta la pagina.
// Se cambia un dato, si aggiorna prima §2 e poi qui. Nessun componente scrive un dato a mano.
// I valori «[DA COMPILARE …]» diventano null e finiscono nell'elenco `mancanti`;
// i facoltativi vuoti diventano null e l'elemento che li usa non compare.

export interface Realizzazione {
  nome: string
  comune: string | null
  mq: number
  anno: number
  classe: string
}

export interface DatiProgetto {
  REPO: string
  BRANCH: string
  NETLIFY_SITO: string
  DOMINIO: string | null
  DATA_AVVIO: string
  DATA_ONLINE: string | null
  BRAND: string
  REFERENTE: string
  RUOLO_REFERENTE: string
  EMAIL_LEAD: string
  EMAIL_PUBBLICA: string | null
  TELEFONO: string | null
  WHATSAPP: boolean
  TEMPO_RISPOSTA: string
  ZONA: string
  LOGO: string | null
  TITOLARE: string | null
  FORMA: string
  PIVA: string | null
  SEDE: string | null
  REA: string | null
  CAPITALE: string | null
  PEC: string | null
  RUOLO_LEGALE: string
  COSTO_SERVIZIO: string | null
  P1_NOME: string
  P1_RUOLO: string
  P1_SITO: string
  P1_OK: boolean
  P2_NOME: string
  P2_RUOLO: string
  P2_SITO: string
  P2_OK: boolean
  RAPPORTO_PARTNER: 'da verificare' | 'sì, confermato per iscritto' | 'no, lavorano separatamente'
  SISTEMA: string
  SISTEMA_BREVE: string
  TEMPI: string | null
  GARANZIA: string | null
  CLASSE: string | null
  BUDGET_MIN: number
  REALIZZAZIONI: readonly Realizzazione[]
  /** cemento: tutta chiara · grafite: tutta scura · misto: hero (e header sopra l'hero) scuri, il resto chiaro */
  STILE: 'cemento' | 'grafite' | 'misto'
  COLORE_ACCENTO: string
  SUPABASE_URL: string | null
  BREVO_MITTENTE: string | null
  META_PIXEL: string | null
}

// Una per riga: nome · comune · m² · anno · classe («–» = comune non indicato).
const REALIZZAZIONI_TESTO = `Villa Smeraldo · – · 282 · 2025 · A4
Villa Serena · – · 388 · 2024 · A4
Villa Mary · Carnago · 336 · 2020 · A4
Villa Alessia · Marnate · 208 · 2026 · A4
Villa a Cislago · Cislago · 363 · 2026 · A4
Villa Sara · – · 237 · 2017 · A`

function leggiRealizzazioni(testo: string): Realizzazione[] {
  return testo
    .split('\n')
    .map((riga) => riga.trim())
    .filter(Boolean)
    .map((riga) => {
      const [nome, comune, mq, anno, classe] = riga.split('·').map((parte) => parte.trim())
      return {
        nome,
        comune: comune && comune !== '–' ? comune : null,
        mq: Number(mq),
        anno: Number(anno),
        classe,
      }
    })
}

export const dati = {
  REPO: 'biodomus-srl',
  BRANCH: 'lavoro',
  NETLIFY_SITO: 'biodomus',
  DOMINIO: 'biodomussrls.it',
  DATA_AVVIO: '15 novembre 2026',
  DATA_ONLINE: '11 gennaio 2027',

  BRAND: 'Biodomus',
  REFERENTE: 'Mirko Lanzafame',
  RUOLO_REFERENTE: 'fondatore e referente unico',
  EMAIL_LEAD: 'biodomus2025@libero.it',
  EMAIL_PUBBLICA: 'biodomus2025@libero.it',
  TELEFONO: '+39 349 239 1107',
  WHATSAPP: true,
  TEMPO_RISPOSTA: 'entro 2 giorni lavorativi',
  ZONA: 'provincia di Varese, Milano e Como',
  LOGO: 'logo fornito: kit in studio/originali/biodomus-asset/ (sul sito il positivo senza payoff)',

  TITOLARE: 'BIODOMUS SRLS',
  FORMA: 'società a responsabilità limitata semplificata',
  PIVA: '04059520124',
  SEDE: 'Via Carlo Noè 45, 21013 Gallarate (VA)',
  REA: 'VA-398965',
  CAPITALE: '5.000 €',
  PEC: 'biodomus@cgn.legalmail.it',
  RUOLO_LEGALE: 'da definire con il commercialista',
  COSTO_SERVIZIO:
    "Il primo incontro conoscitivo è gratuito e senza impegno. Il cliente non sostiene costi per il servizio di consulenza: l'eventuale compenso viene riconosciuto direttamente dall'azienda partner, secondo accordi preventivamente definiti.",

  P1_NOME: 'Edilnoma Building S.r.l.',
  P1_RUOLO: 'impresa di costruzioni: ville e complessi residenziali chiavi in mano',
  P1_SITO: 'https://www.edilnoma.it',
  P1_OK: false,
  P2_NOME: 'Bioisotherm',
  P2_RUOLO: 'produttore di sistemi costruttivi: casseri isolanti in EPS per pareti e solai in calcestruzzo armato',
  P2_SITO: 'https://www.bioisotherm.it',
  P2_OK: false,
  RAPPORTO_PARTNER: 'da verificare',

  SISTEMA: 'pareti portanti in calcestruzzo armato gettato dentro casseri isolanti che restano nella parete',
  SISTEMA_BREVE: 'Calcestruzzo armato in casseri isolanti',
  TEMPI: 'circa 8 mesi dal rilascio del permesso di costruire',
  GARANZIA: null, // vuoto: non citare garanzie
  CLASSE: 'A4',
  BUDGET_MIN: 250_000,
  REALIZZAZIONI: leggiRealizzazioni(REALIZZAZIONI_TESTO),

  STILE: 'misto',
  COLORE_ACCENTO: '#383E42',

  SUPABASE_URL: null, // arriva allo step 8
  BREVO_MITTENTE: null, // arriva allo step 8: un indirizzo su DOMINIO, mai di posta gratuita
  META_PIXEL: null, // vuoto: niente Pixel né API Conversioni finché non arriva
} as const satisfies DatiProgetto

export type ChiaveDato = keyof DatiProgetto

/** Dati obbligatori ancora «[DA COMPILARE]» in §2. Oggi nessuno. */
export const mancanti: readonly ChiaveDato[] = []

const formatoNumero = new Intl.NumberFormat('it-IT')

/** 250000 → «250.000 €» */
export function euro(valore: number): string {
  return `${formatoNumero.format(valore)} €`
}

/** Fasce di budget del modulo, calcolate da BUDGET_MIN (CLAUDE.md §2). */
export function fasceBudget(): { valore: string; etichetta: string }[] {
  const base = dati.BUDGET_MIN
  return [
    { valore: 'sotto-minimo', etichetta: `Meno di ${euro(base)}` },
    { valore: 'fascia-1', etichetta: `Da ${euro(base)} a ${euro(base + 100_000)}` },
    { valore: 'fascia-2', etichetta: `Da ${euro(base + 100_000)} a ${euro(base + 250_000)}` },
    { valore: 'oltre', etichetta: `Oltre ${euro(base + 250_000)}` },
    { valore: 'non-so', etichetta: 'Non lo so ancora' },
  ]
}

/** Link dei contatti secondari, generati da TELEFONO (CLAUDE.md §2). */
export function contatti(): { telefono: string; tel: string; whatsapp: string | null } | null {
  const numero: string | null = dati.TELEFONO
  if (!numero) return null
  const cifre = numero.replace(/\D/g, '')
  const internazionale = cifre.startsWith('39') ? cifre : `39${cifre}`
  return {
    telefono: numero,
    tel: `tel:+${internazionale}`,
    whatsapp: dati.WHATSAPP ? `https://wa.me/${internazionale}` : null,
  }
}

/** Email da mostrare in pagina: EMAIL_PUBBLICA, oppure EMAIL_LEAD se è vuota. */
export function emailPubblica(): string {
  const pubblica: string | null = dati.EMAIL_PUBBLICA
  return pubblica ?? dati.EMAIL_LEAD
}

/**
 * Valore di un dato come testo, per i segnaposti {CHIAVE} di testi.json.
 * null = dato vuoto: chi usa il testo lo nasconde.
 */
export function valoreTesto(chiave: string): string | null {
  if (!(chiave in dati)) throw new Error(`Segnaposto sconosciuto: {${chiave}} non esiste in §2`)
  const k = chiave as ChiaveDato
  if (k === 'EMAIL_PUBBLICA') return emailPubblica()
  const valore: unknown = dati[k]
  if (valore === null) return null
  if (typeof valore === 'boolean') return valore ? 'sì' : 'no'
  if (typeof valore === 'number') return k === 'BUDGET_MIN' ? euro(valore) : formatoNumero.format(valore)
  if (typeof valore === 'string') return valore
  throw new Error(`Il dato ${chiave} non si può usare come testo`)
}
