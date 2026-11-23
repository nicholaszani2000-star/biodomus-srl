import { useSyncExternalStore } from 'react'

// true solo dopo l'hydration, false nel prerender e al primo render del browser: così l'HTML combacia
// e i componenti che cambiano con JavaScript (passaggi del modulo, barra mobile) partono dallo stato senza JavaScript.
const nessunaIscrizione = () => () => {}

export function useIdratato(): boolean {
  return useSyncExternalStore(
    nessunaIscrizione,
    () => true,
    () => false,
  )
}
