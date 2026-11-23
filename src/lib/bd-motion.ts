// Movimento della pagina (CLAUDE.md §5): Lenis sincronizzato con ScrollTrigger tramite gsap.ticker,
// ingressi delle sezioni, linee di quota che si disegnano, la parete dell'hero, il titolo per righe,
// Magnet sulla CTA primaria e inclinazione delle card (solo desktop con puntatore fine).
// Si carica con import() dopo l'hydration, solo nel browser.
// Con prefers-reduced-motion: niente Lenis, niente pin, parallasse, testi spezzati né inclinazioni;
// la parete resta composta e ferma, tutto è già visibile.
// Regola d'oro: un elemento già nello schermo all'avvio non viene nascosto e rianimato (niente sfarfallio).
// Le eccezioni (titolo dell'hero da 1024 px e parete) partono nascoste dal CSS con un ripiego a tempo.

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { registraLenis } from './bd-scorri.ts'

const PIENO = '(prefers-reduced-motion: no-preference)'
const DESKTOP = '(min-width: 1024px)'
const PUNTATORE_FINE = '(hover: hover) and (pointer: fine)'

// Ingressi di §5
const INGRESSO = { duration: 0.7, ease: 'power3.out', stagger: 0.08 } as const

let avviato = false

function giaVisibile(elemento: Element): boolean {
  return elemento.getBoundingClientRect().top < window.innerHeight * 0.92
}

/** Righe di un titolo, mascherate, che salgono una dopo l'altra. Alla fine il titolo torna testo semplice. */
function righe(titolo: HTMLElement, opzioni: gsap.TweenVars = {}): gsap.core.Tween {
  const divisione = SplitText.create(titolo, { type: 'lines', mask: 'lines' })
  return gsap.from(divisione.lines, { yPercent: 100, ...INGRESSO, ...opzioni, onComplete: () => divisione.revert() })
}

/**
 * Ingressi delle sezioni sotto la piega: y da 24 a 0 in dissolvenza, 0,7 s, power3.out, stagger 0,08.
 * Solo opacità, non autoAlpha: con visibility: hidden link e campi uscirebbero dal tab della tastiera
 * finché la sezione non entra nello schermo. Così il focus ci arriva, il browser scorre e l'ingresso parte.
 * Se la sezione marca i suoi elementi con data-bd-entra entrano quelli (per esempio le card), altrimenti
 * i figli diretti del contenitore. Da 1024 px l'h2 marcato entra per righe (SplitText).
 */
function preparaIngressi(desktop: boolean): void {
  document.querySelectorAll<HTMLElement>('[data-bd-ingresso]').forEach((sezione) => {
    if (giaVisibile(sezione)) return
    const marcati = [...sezione.querySelectorAll<HTMLElement>('[data-bd-entra]')]
    const elementi = marcati.length ? marcati : [...sezione.querySelectorAll<HTMLElement>(':scope > .bd-wrap > *')]
    if (!elementi.length) return
    const titolo = desktop ? (marcati.find((el) => el.tagName === 'H2') ?? null) : null
    const resto = titolo ? elementi.filter((el) => el !== titolo) : elementi

    const linea = gsap.timeline({ scrollTrigger: { trigger: sezione, start: 'top 85%', once: true } })
    if (titolo) {
      const divisione = SplitText.create(titolo, { type: 'lines', mask: 'lines' })
      linea.from(divisione.lines, { yPercent: 100, ...INGRESSO, onComplete: () => divisione.revert() }, 0)
    }
    if (resto.length) linea.from(resto, { opacity: 0, y: 24, ...INGRESSO }, titolo ? 0.15 : 0)
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

/**
 * La parete dell'hero (§5): gli strati entrano già staccati (in meno di 1,2 s), poi mentre l'hero esce
 * dallo schermo si avvicinano fino a ricomporre la parete e le quote si disegnano (scrub, senza pin).
 * Il CSS la tiene nascosta finché arriva il movimento; se il ripiego a tempo è già partito, resta composta.
 */
function preparaParete(): void {
  const hero = document.getElementById('inizio')
  const disegno = document.querySelector<SVGSVGElement>('.bd-parete--hero .bd-parete__svg')
  if (!hero || !disegno) return
  const strati = gsap.utils.toArray<SVGGElement>('.bd-strato', disegno)
  const quote = gsap.utils.toArray<SVGPathElement>('.bd-quota-linea', disegno)
  if (strati.length !== 4 || getComputedStyle(strati[0]).opacity !== '0') return

  for (const elemento of [...strati, ...quote]) elemento.style.animation = 'none'
  const scarto = [-51, -17, 17, 51] // unità del disegno: blocchi staccati di 34
  gsap.set(strati, { x: (i: number) => scarto[i] })
  gsap.set(quote, { strokeDasharray: 1, strokeDashoffset: 1 })
  gsap.fromTo(strati, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.12, delay: 0.1 })

  gsap
    .timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom center', scrub: 0.5 } })
    .to(strati, { x: 0, ease: 'none', duration: 1 }, 0)
    .to(quote, { strokeDashoffset: 0, ease: 'none', duration: 0.5, stagger: 0.1 }, 0.4)
}

/**
 * Titolo dell'hero per righe, solo da 1024 px. Il CSS lo nasconde al massimo 0,8 s: se il movimento
 * arriva dopo (o il font non è pronto in tempo), il ripiego lo mostra e qui non si fa nulla.
 */
async function preparaTitoloHero(): Promise<void> {
  const titolo = document.querySelector<HTMLElement>('.bd-hero__titolo')
  if (!titolo) return
  const fontPronto = await Promise.race([
    document.fonts.ready.then(() => true),
    new Promise<boolean>((risolvi) => window.setTimeout(() => risolvi(false), Math.max(0, 700 - performance.now()))),
  ])
  if (!fontPronto || getComputedStyle(titolo).opacity !== '0') return
  const variante = [...titolo.querySelectorAll<HTMLElement>('.bd-v')].find((el) => getComputedStyle(el).display !== 'none')
  if (!variante) return
  titolo.style.animation = 'none'
  titolo.style.opacity = '1'
  righe(variante)
}

/** Magnet leggero sulla CTA primaria (§5): spostamento massimo 6 px verso il puntatore. */
function magnete(): (() => void)[] {
  return gsap.utils.toArray<HTMLElement>('[data-bd-magnete]').map((cta) => {
    const xA = gsap.quickTo(cta, 'x', { duration: 0.35, ease: 'power3.out' })
    const yA = gsap.quickTo(cta, 'y', { duration: 0.35, ease: 'power3.out' })
    const muovi = (evento: PointerEvent) => {
      const r = cta.getBoundingClientRect()
      const dx = ((evento.clientX - (r.left + r.width / 2)) / (r.width / 2)) * 6
      const dy = ((evento.clientY - (r.top + r.height / 2)) / (r.height / 2)) * 6
      const fattore = Math.min(1, 6 / (Math.hypot(dx, dy) || 1))
      xA(dx * fattore)
      yA(dy * fattore)
    }
    const esci = () => {
      xA(0)
      yA(0)
    }
    cta.addEventListener('pointermove', muovi)
    cta.addEventListener('pointerleave', esci)
    return () => {
      cta.removeEventListener('pointermove', muovi)
      cta.removeEventListener('pointerleave', esci)
      gsap.set(cta, { x: 0, y: 0 })
    }
  })
}

/** Card di «Per chi è» (§5): si inclinano seguendo il puntatore, massimo 6°, e tornano dolcemente. */
function inclinazione(): (() => void)[] {
  return gsap.utils.toArray<HTMLElement>('[data-bd-inclina]').map((card) => {
    gsap.set(card, { transformPerspective: 900 })
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' })
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' })
    const muovi = (evento: PointerEvent) => {
      const r = card.getBoundingClientRect()
      const px = gsap.utils.clamp(-0.5, 0.5, (evento.clientX - r.left) / r.width - 0.5)
      const py = gsap.utils.clamp(-0.5, 0.5, (evento.clientY - r.top) / r.height - 0.5)
      ry(px * 12)
      rx(-py * 12)
    }
    const esci = () => {
      rx(0)
      ry(0)
    }
    card.addEventListener('pointermove', muovi)
    card.addEventListener('pointerleave', esci)
    return () => {
      card.removeEventListener('pointermove', muovi)
      card.removeEventListener('pointerleave', esci)
      gsap.set(card, { rotationX: 0, rotationY: 0 })
    }
  })
}

export function avviaMovimento(): void {
  if (avviato || typeof window === 'undefined') return
  avviato = true
  gsap.registerPlugin(ScrollTrigger, SplitText)

  const mm = gsap.matchMedia()
  mm.add({ ridotto: '(prefers-reduced-motion: reduce)', pieno: PIENO, desktop: DESKTOP }, (contesto) => {
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

    const desktop = Boolean(contesto.conditions?.desktop)
    preparaParete()
    if (desktop) void preparaTitoloHero()
    preparaIngressi(desktop)
    preparaQuote()

    return () => {
      gsap.ticker.remove(passo)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
      registraLenis(null)
    }
  })

  // Microinterazioni solo con puntatore fine da 1024 px: niente su touch e con riduzione del movimento.
  mm.add(`${DESKTOP} and ${PUNTATORE_FINE} and ${PIENO}`, () => {
    const pulizie = [...magnete(), ...inclinazione()]
    return () => pulizie.forEach((pulisci) => pulisci())
  })
}
