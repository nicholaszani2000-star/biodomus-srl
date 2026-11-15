// Parametri della campagna (CLAUDE.md §7): utm_* e fbclid salvati in sessionStorage alla prima visita
// della sessione, così restano anche se la persona naviga o ricarica prima di compilare il modulo.

const CHIAVI = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid'] as const
const ARCHIVIO = 'bd-utm'

export type ChiaveUtm = (typeof CHIAVI)[number]
export type Utm = Partial<Record<ChiaveUtm, string>>

export function salvaUtm(): void {
  try {
    if (window.sessionStorage.getItem(ARCHIVIO) !== null) return
    const parametri = new URLSearchParams(window.location.search)
    const utm: Utm = {}
    for (const chiave of CHIAVI) {
      const valore = parametri.get(chiave)
      if (valore) utm[chiave] = valore.slice(0, 200)
    }
    window.sessionStorage.setItem(ARCHIVIO, JSON.stringify(utm))
  } catch {
    // sessionStorage non disponibile: il modulo leggerà i parametri direttamente dall'URL.
  }
}

export function leggiUtm(): Utm {
  try {
    const salvato = window.sessionStorage.getItem(ARCHIVIO)
    if (salvato) return JSON.parse(salvato) as Utm
  } catch {
    // ripiego sotto
  }
  const parametri = new URLSearchParams(window.location.search)
  const utm: Utm = {}
  for (const chiave of CHIAVI) {
    const valore = parametri.get(chiave)
    if (valore) utm[chiave] = valore.slice(0, 200)
  }
  return utm
}
