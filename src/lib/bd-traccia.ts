// Tracciamento (stub dello step 1). Senza consenso «accettato» o senza META_PIXEL non fa nulla.
// Lo step 7 aggiunge il caricamento del Pixel dopo il consenso; fino ad allora nessuna richiesta a Meta.
// Eventi previsti (CLAUDE.md §4): Lead con eventID dopo l'invio del modulo; Contact al clic su Chiama o WhatsApp.

import { dati } from '../content/dati.ts'
import { leggiConsenso } from './bd-consenso.ts'

type Fbq = (...argomenti: unknown[]) => void

declare global {
  interface Window {
    fbq?: Fbq
  }
}

export function track(evento: string, parametri: Record<string, unknown> = {}, opzioni: { eventID?: string } = {}): void {
  if (typeof window === 'undefined') return
  const pixel: string | null = dati.META_PIXEL
  if (!pixel || leggiConsenso() !== 'accettato') return
  window.fbq?.('track', evento, parametri, opzioni)
}
