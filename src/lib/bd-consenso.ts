// Consenso ai cookie di marketing (CLAUDE.md §10 punto 4): Pixel e API Conversioni solo con «accettato».
// Salvato in localStorage con try/catch; la scelta vale 6 mesi, poi il banner si ripresenta.
// Se localStorage non c'è (navigazione privata, browser interno di un'app) la scelta resta in memoria per questa visita:
// il banner si chiude lo stesso e alla visita dopo si ripresenta.

export type StatoConsenso = 'nessuna-scelta' | 'accettato' | 'rifiutato'
type Scelta = Exclude<StatoConsenso, 'nessuna-scelta'>

const CHIAVE = 'bd-consenso'
const SEI_MESI_MS = 183 * 24 * 60 * 60 * 1000
const EVENTO = 'bd:consenso'

let inMemoria: { stato: Scelta; data: number } | null = null

const valida = (stato: unknown, data: unknown): stato is Scelta =>
  (stato === 'accettato' || stato === 'rifiutato') && typeof data === 'number' && Date.now() - data < SEI_MESI_MS

export function leggiConsenso(): StatoConsenso {
  if (typeof window === 'undefined') return 'nessuna-scelta'
  // La scelta fatta in questa visita vale anche se localStorage non ha potuto salvarla
  if (inMemoria && valida(inMemoria.stato, inMemoria.data)) return inMemoria.stato
  try {
    const grezzo = window.localStorage.getItem(CHIAVE)
    if (!grezzo) return 'nessuna-scelta'
    const salvato = JSON.parse(grezzo) as { stato?: unknown; data?: unknown }
    return valida(salvato.stato, salvato.data) ? salvato.stato : 'nessuna-scelta'
  } catch {
    return 'nessuna-scelta'
  }
}

export function impostaConsenso(stato: Scelta): void {
  inMemoria = { stato, data: Date.now() }
  try {
    window.localStorage.setItem(CHIAVE, JSON.stringify(inMemoria))
  } catch {
    // localStorage non disponibile: la scelta vale solo per questa visita (resta in memoria).
  }
  window.dispatchEvent(new CustomEvent<StatoConsenso>(EVENTO, { detail: stato }))
}

/** Avvisa a ogni cambio, anche quando la scelta cambia in un'altra scheda dello stesso sito. */
export function alCambioConsenso(callback: (stato: StatoConsenso) => void): () => void {
  const ascolta = (evento: Event) => callback((evento as CustomEvent<StatoConsenso>).detail)
  const altraScheda = (evento: StorageEvent) => {
    if (evento.key === CHIAVE || evento.key === null) {
      inMemoria = null
      callback(leggiConsenso())
    }
  }
  window.addEventListener(EVENTO, ascolta)
  window.addEventListener('storage', altraScheda)
  return () => {
    window.removeEventListener(EVENTO, ascolta)
    window.removeEventListener('storage', altraScheda)
  }
}
