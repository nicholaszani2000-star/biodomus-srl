// Angolo della campagna (CLAUDE.md §7): ?a=famiglia | terreno | investo, default famiglia.
// Lo imposta lo script inline in index.html su <html data-angolo>, prima del CSS; qui lo si legge soltanto.

export type Angolo = 'famiglia' | 'terreno' | 'investo'

export const ANGOLI: readonly Angolo[] = ['famiglia', 'terreno', 'investo']

export function normalizzaAngolo(valore: unknown): Angolo {
  return valore === 'terreno' || valore === 'investo' ? valore : 'famiglia'
}

export function leggiAngolo(): Angolo {
  if (typeof document === 'undefined') return 'famiglia'
  return normalizzaAngolo(document.documentElement.dataset.angolo)
}
