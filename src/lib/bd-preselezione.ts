// Preselezione del modulo dalle card di «Per chi è» (§6.3): la card manda un evento, BdModulo lo ascolta,
// sceglie le risposte del passo 1 e torna al passo 1. L'angolo della card va nel campo nascosto
// solo se l'URL non ne porta già uno valido (?a=), così l'angolo della campagna non si perde.

import type { Angolo } from './bd-angolo.ts'

export interface Preselezione {
  profilo: 'casa' | 'investimento'
  terreno?: 'si'
  angolo: Angolo
}

/** Le tre card di §8, nell'ordine di testi.json (perChi.card[].profilo). */
export const PRESELEZIONI: Record<'casa' | 'terreno' | 'investimento', Preselezione> = {
  casa: { profilo: 'casa', angolo: 'famiglia' },
  terreno: { profilo: 'casa', terreno: 'si', angolo: 'terreno' },
  investimento: { profilo: 'investimento', angolo: 'investo' },
}

const EVENTO = 'bd:preseleziona'

export function preseleziona(scelta: Preselezione): void {
  window.dispatchEvent(new CustomEvent<Preselezione>(EVENTO, { detail: scelta }))
}

export function allaPreselezione(callback: (scelta: Preselezione) => void): () => void {
  const ascolta = (evento: Event) => callback((evento as CustomEvent<Preselezione>).detail)
  window.addEventListener(EVENTO, ascolta)
  return () => window.removeEventListener(EVENTO, ascolta)
}

/** true se l'URL porta un angolo valido (?a=famiglia|terreno|investo). */
export function urlHaAngolo(): boolean {
  try {
    const a = new URLSearchParams(window.location.search).get('a')
    return a === 'famiglia' || a === 'terreno' || a === 'investo'
  } catch {
    return false
  }
}
