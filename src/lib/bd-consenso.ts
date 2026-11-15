// Consenso ai cookie di marketing (CLAUDE.md §10 punto 4): Pixel e API Conversioni solo con «accettato».
// Salvato in localStorage con try/catch; la scelta vale 6 mesi, poi il banner si ripresenta.
// Il banner (BdBannerCookie) arriva allo step 7.

export type StatoConsenso = 'nessuna-scelta' | 'accettato' | 'rifiutato'

const CHIAVE = 'bd-consenso'
const SEI_MESI_MS = 183 * 24 * 60 * 60 * 1000
const EVENTO = 'bd:consenso'

export function leggiConsenso(): StatoConsenso {
  try {
    const grezzo = window.localStorage.getItem(CHIAVE)
    if (!grezzo) return 'nessuna-scelta'
    const salvato = JSON.parse(grezzo) as { stato?: unknown; data?: unknown }
    const valido =
      (salvato.stato === 'accettato' || salvato.stato === 'rifiutato') &&
      typeof salvato.data === 'number' &&
      Date.now() - salvato.data < SEI_MESI_MS
    return valido ? (salvato.stato as StatoConsenso) : 'nessuna-scelta'
  } catch {
    return 'nessuna-scelta'
  }
}

export function impostaConsenso(stato: Exclude<StatoConsenso, 'nessuna-scelta'>): void {
  try {
    window.localStorage.setItem(CHIAVE, JSON.stringify({ stato, data: Date.now() }))
  } catch {
    // localStorage non disponibile (navigazione privata o browser interno): la scelta vale solo per questa visita.
  }
  window.dispatchEvent(new CustomEvent<StatoConsenso>(EVENTO, { detail: stato }))
}

export function alCambioConsenso(callback: (stato: StatoConsenso) => void): () => void {
  const ascolta = (evento: Event) => callback((evento as CustomEvent<StatoConsenso>).detail)
  window.addEventListener(EVENTO, ascolta)
  return () => window.removeEventListener(EVENTO, ascolta)
}
