// Movimento della pagina (CLAUDE.md §5): Lenis sincronizzato con ScrollTrigger tramite gsap.ticker,
// ingressi delle sezioni e linee di quota che si disegnano.
// Si carica con import() dopo l'hydration, solo nel browser.
// Con prefers-reduced-motion: niente Lenis, niente animazioni d'ingresso, tutto resta già visibile.
// Regola d'oro: un elemento già nello schermo all'avvio non viene nascosto e rianimato (niente sfarfallio).

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { registraLenis } from './bd-scorri.ts'

let avviato = false

function giaVisibile(elemento: Element): boolean {
  return elemento.getBoundingClientRect().top < window.innerHeight * 0.92
}

function preparaIngressi(): void {
  document.querySelectorAll<HTMLElement>('[data-bd-ingresso]').forEach((sezione) => {
    const figli = sezione.querySelectorAll<HTMLElement>(':scope > .bd-wrap > *')
    if (!figli.length || giaVisibile(sezione)) return
    gsap.from(figli, {
      autoAlpha: 0,
      y: 24,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.08,
      scrollTrigger: { trigger: sezione, start: 'top 85%', once: true },
    })
  })
}

function preparaQuote(): void {
  document.querySelectorAll<SVGPathElement>('[data-bd-quota-linea]').forEach((linea) => {
    const quota = linea.closest('.bd-quota')
    if (!quota || giaVisibile(quota)) return
    const lunghezza = linea.getTotalLength()
    gsap.fromTo(
      linea,
      { strokeDasharray: lunghezza, strokeDashoffset: lunghezza },
      {
        strokeDashoffset: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: quota, start: 'top 90%', once: true },
      },
    )
  })
}

export function avviaMovimento(): void {
  if (avviato || typeof window === 'undefined') return
  avviato = true
  gsap.registerPlugin(ScrollTrigger)

  const mm = gsap.matchMedia()
  mm.add(
    { ridotto: '(prefers-reduced-motion: reduce)', pieno: '(prefers-reduced-motion: no-preference)' },
    (contesto) => {
      if (contesto.conditions?.ridotto) {
        registraLenis(null)
        return
      }

      const lenis = new Lenis({ duration: 1.1, syncTouch: false, autoRaf: false })
      lenis.on('scroll', ScrollTrigger.update)
      const passo = (tempo: number) => lenis.raf(tempo * 1000)
      gsap.ticker.add(passo)
      gsap.ticker.lagSmoothing(0)
      registraLenis(lenis)

      preparaIngressi()
      preparaQuote()

      return () => {
        gsap.ticker.remove(passo)
        gsap.ticker.lagSmoothing(500, 33)
        lenis.destroy()
        registraLenis(null)
      }
    },
  )
}
