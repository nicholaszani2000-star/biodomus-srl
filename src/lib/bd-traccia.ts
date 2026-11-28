// Tracciamento (CLAUDE.md §4, §10 punto 4): il pixel di Meta solo con il consenso «accettato» e con META_PIXEL compilato.
// Con META_PIXEL vuoto (oggi) il codice è pronto ma non fa nulla: nessuna richiesta a facebook.com o facebook.net.
// È l'unico file che contatta Meta, e si carica a parte con un import dinamico dopo l'hydration (lo verifica controlli.mjs).
//
// Verificato sulla documentazione Meta (novembre 2026):
// - codice base: lo stub fbq con coda, fbevents.js da https://connect.facebook.net/en_US/fbevents.js,
//   poi fbq('init', id) e fbq('track', 'PageView'). Qui è lo stesso codice senza script inline (la CSP lo vieta);
// - consenso: fbq('consent', 'revoke') e fbq('consent', 'grant');
// - configurazione automatica («Automatic configuration»), attiva di default: manda a Meta i clic sui pulsanti e i metadati
//   della pagina. Si spegne con fbq('set', 'autoConfig', false, id) prima di init: gli eventi restano PageView, Lead e Contact;
// - «Lead» e «Contact» sono eventi standard; eventID nel Pixel ed event_id nell'API Conversioni deduplicano l'evento.

import { dati } from '../content/dati.ts'
import { alCambioConsenso, leggiConsenso, type StatoConsenso } from './bd-consenso.ts'

interface Fbq {
  (...argomenti: unknown[]): void
  callMethod?: (...argomenti: unknown[]) => void
  queue: unknown[][]
  push: Fbq
  loaded: boolean
  version: string
}

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
  }
}

const SCRIPT_PIXEL = 'https://connect.facebook.net/en_US/fbevents.js'
// I quattro link di contatto (BdChiusura e footer) e ogni link tel: o wa.me che verrà
const LINK_CONTATTO = 'a[href^="tel:"], a[href^="https://wa.me/"]'
const COOKIE_META = ['_fbp', '_fbc']

let avviato = false
let caricato = false
let attivo = false

function idPixel(): string | null {
  // «as»: in dati.ts META_PIXEL oggi vale null, ma il tipo è quello di §2 (una stringa quando arriva)
  const id = dati.META_PIXEL as string | null
  return id?.trim() ? id.trim() : null
}

/** Il codice base di Meta, scritto come modulo: stub con la coda, script asincrono, autoConfig spento, init e PageView. */
function caricaPixel(id: string): void {
  if (!window.fbq) {
    const fbq = function (...argomenti: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...argomenti)
      else fbq.queue.push(argomenti)
    } as Fbq
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
    window._fbq ??= fbq
    const script = document.createElement('script')
    script.async = true
    script.src = SCRIPT_PIXEL
    document.head.appendChild(script)
  }
  window.fbq('set', 'autoConfig', false, id)
  window.fbq('init', id)
  window.fbq('track', 'PageView')
  caricato = true
}

/** Cancella _fbp e _fbc che il sito riesce a cancellare: senza dominio e su ogni dominio padre (www.esempio.it, esempio.it). */
function cancellaCookieMeta(): void {
  const parti = window.location.hostname.split('.')
  const domini = [null, ...parti.slice(0, -1).map((_, i) => parti.slice(i).join('.'))]
  for (const nome of COOKIE_META) {
    for (const dominio of domini) {
      document.cookie = `${nome}=; Max-Age=0; Path=/${dominio ? `; Domain=${dominio}` : ''}; SameSite=Lax`
    }
  }
}

function aggiorna(stato: StatoConsenso): void {
  const id = idPixel()
  if (!id) return
  if (stato === 'accettato') {
    if (caricato) window.fbq?.('consent', 'grant')
    else caricaPixel(id)
    attivo = true
    return
  }
  // «rifiutato» o «nessuna scelta»: nessun nuovo evento; se il Pixel era già caricato gli si revoca il consenso
  attivo = false
  if (caricato) window.fbq?.('consent', 'revoke')
  cancellaCookieMeta()
}

/** Dopo l'hydration (App): legge il consenso, segue i cambi e ascolta i clic sui link di contatto. */
export function avviaTracciamento(): void {
  if (avviato) return
  avviato = true
  aggiorna(leggiConsenso())
  alCambioConsenso(aggiorna)
  // Un solo ascoltatore delegato su document: «Contact» al clic su Chiama o WhatsApp, senza parametri personali
  document.addEventListener('click', (evento) => {
    if (evento.target instanceof Element && evento.target.closest(LINK_CONTATTO)) track('Contact')
  })
}

/** Evento standard verso il Pixel. Senza consenso o senza META_PIXEL non fa nulla. */
export function track(evento: string, parametri: Record<string, unknown> = {}, opzioni: { eventID?: string } = {}): void {
  avviaTracciamento()
  if (!attivo || !window.fbq) return
  window.fbq('track', evento, parametri, opzioni)
}
