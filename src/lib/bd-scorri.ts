// Scroll verso una sezione con offset dell'header, poi focus sul primo elemento utile.
// Funziona con Lenis (se bd-motion l'ha avviato) e senza (scroll nativo o immediato con riduzione del movimento).
// Senza JavaScript i link restano ancore vere (#preventivo) e il browser salta da solo.

import type Lenis from 'lenis'

let lenisAttivo: Lenis | null = null

export function registraLenis(lenis: Lenis | null): void {
  lenisAttivo = lenis
}

function movimentoRidotto(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const visibile = (el: Element) => el.getClientRects().length > 0

/**
 * Dove va il focus dopo lo scroll (§6: il primo campo). Il bersaglio dichiarato (data-bd-focus, nel modulo la risposta 1)
 * se è visibile; se il modulo è già a un passaggio successivo, il primo campo del passaggio aperto (in un gruppo di radio
 * quello scelto); altrimenti la sezione stessa. Il tabindex="-1" si aggiunge solo a ciò che non prende il focus da solo:
 * su un campo lo toglierebbe dal tasto Tab.
 */
function mettiFocus(sezione: HTMLElement): void {
  const dichiarato = Array.from(sezione.querySelectorAll<HTMLElement>('[data-bd-focus]')).find(visibile)
  const campi = Array.from(sezione.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')).filter(
    (el) => el.type !== 'hidden' && el.tabIndex >= 0 && !el.disabled && visibile(el),
  )
  const scelto = (el: HTMLElement) => el instanceof HTMLInputElement && el.type === 'radio' && el.checked
  const primoCampo = campi.find(
    (el) => !(el instanceof HTMLInputElement && el.type === 'radio') || scelto(el) || !campi.some((altro) => altro.name === el.name && scelto(altro)),
  )
  const destinazione = dichiarato ?? primoCampo ?? sezione
  if (destinazione.tabIndex < 0 && !destinazione.hasAttribute('tabindex')) destinazione.setAttribute('tabindex', '-1')
  destinazione.focus({ preventScroll: true })
}

export function scorriA(id: string): void {
  const sezione = document.getElementById(id)
  if (!sezione) return
  const header = document.querySelector<HTMLElement>('.bd-header')
  const offset = -((header?.offsetHeight ?? 0) + 16)
  const ridotto = movimentoRidotto()

  if (window.location.hash !== `#${id}`) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`)
  }

  if (lenisAttivo && !ridotto) {
    lenisAttivo.scrollTo(sezione, { offset, onComplete: () => mettiFocus(sezione) })
    return
  }
  const y = sezione.getBoundingClientRect().top + window.scrollY + offset
  window.scrollTo({ top: y, behavior: ridotto ? 'auto' : 'smooth' })
  window.setTimeout(() => mettiFocus(sezione), ridotto ? 0 : 450)
}
