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

function mettiFocus(sezione: HTMLElement): void {
  const destinazione = sezione.querySelector<HTMLElement>('[data-bd-focus]') ?? sezione
  if (!destinazione.hasAttribute('tabindex')) destinazione.setAttribute('tabindex', '-1')
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
