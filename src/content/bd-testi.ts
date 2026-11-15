// Testi della pagina: legge testi.json e sostituisce i segnaposti {CHIAVE} con i dati di dati.ts.
// - {CHIAVE} in maiuscolo = dato di §2. Se il dato è vuoto, il testo intero diventa null
//   e il componente nasconde l'elemento (CLAUDE.md §2: mai inventare un dato).
// - {chiave} in minuscolo = valore di runtime (nome, comune, m²…): resta com'è, lo riempie chi usa il testo.
// - Un segnaposto maiuscolo che non esiste in §2 fa fallire il build: meglio un errore che un testo rotto.

import testi from './testi.json'
import { valoreTesto } from './dati.ts'

type Nodo = string | readonly Nodo[] | { readonly [chiave: string]: Nodo }

const SEGNAPOSTO = /\{([A-Z][A-Z0-9_]*)\}/g

function prendi(percorso: string): Nodo {
  let nodo: Nodo = testi as Nodo
  for (const parte of percorso.split('.')) {
    if (typeof nodo === 'string') throw new Error(`Testo non trovato: ${percorso}`)
    const prossimo: Nodo | undefined = Array.isArray(nodo)
      ? (nodo as readonly Nodo[])[Number(parte)]
      : (nodo as { readonly [chiave: string]: Nodo })[parte]
    if (prossimo === undefined) throw new Error(`Testo non trovato: ${percorso}`)
    nodo = prossimo
  }
  return nodo
}

/** Sostituisce i segnaposti maiuscoli. null se uno dei dati usati è vuoto. */
export function risolvi(modello: string): string | null {
  let vuoto = false
  const risultato = modello.replace(SEGNAPOSTO, (_intero, chiave: string) => {
    const valore = valoreTesto(chiave)
    if (valore === null) {
      vuoto = true
      return ''
    }
    return valore
  })
  if (vuoto) return null
  // Un testo che inizia con un dato («{ZONA}. Se sei fuori zona…») inizia comunque con la maiuscola.
  return modello.startsWith('{') ? risultato.charAt(0).toUpperCase() + risultato.slice(1) : risultato
}

/** Testo per percorso («hero.occhiello»). null se usa un dato vuoto. */
export function t(percorso: string): string | null {
  const nodo = prendi(percorso)
  if (typeof nodo !== 'string') throw new Error(`${percorso} non è un testo`)
  return risolvi(nodo)
}

/** Come t(), ma per testi che devono esserci sempre: se mancano, il build fallisce. */
export function tt(percorso: string): string {
  const testo = t(percorso)
  if (testo === null) throw new Error(`${percorso} usa un dato vuoto ma è obbligatorio`)
  return testo
}

/** Elenco di testi («ruolo.colonne.0.voci»), senza le voci che usano dati vuoti. */
export function tl(percorso: string): string[] {
  const nodo = prendi(percorso)
  if (!Array.isArray(nodo)) throw new Error(`${percorso} non è un elenco`)
  return (nodo as readonly Nodo[])
    .map((voce) => {
      if (typeof voce !== 'string') throw new Error(`${percorso} contiene una voce che non è un testo`)
      return risolvi(voce)
    })
    .filter((voce): voce is string => voce !== null)
}

/** Riempie i segnaposti minuscoli di runtime: riempi('{mq} m²', { mq: 282 }) → «282 m²». */
export function riempi(testo: string, valori: Readonly<Record<string, string | number>>): string {
  return testo.replace(/\{([a-z][a-zA-Z0-9_]*)\}/g, (intero, chiave: string) =>
    chiave in valori ? String(valori[chiave]) : intero,
  )
}
