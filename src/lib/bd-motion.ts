// Movimento della pagina (CLAUDE.md §5): Lenis sincronizzato con ScrollTrigger tramite gsap.ticker,
// ingressi delle sezioni, linee di quota che si disegnano (anche la catena dei passaggi di «Come funziona»),
// la parete in prospettiva che si ricompone mentre scorri (nell'hero e in «Com'è fatta la casa»).
// Da 1024 px: titoli rivelati per righe (SplitText). Da 1024 px con il mouse: card che si inclinano, CTA primarie «magnetiche».
// Si carica con import() dopo l'hydration, solo nel browser.
// Con prefers-reduced-motion: niente Lenis, niente animazioni; la parete è già composta (CSS) e tutto resta visibile.
// Regola d'oro: un elemento già nello schermo all'avvio non viene nascosto e rianimato (niente sfarfallio).
// L'unica eccezione è il titolo dell'hero da 1024 px: lo nasconde già lo script nel head (classe bd-rivela), prima del primo disegno.

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { registraLenis } from './bd-scorri.ts'

let avviato = false

const LARGO = '(min-width: 1024px)'
const PUNTATORE = '(min-width: 1024px) and (hover: hover) and (pointer: fine)'
// Oltre questo tempo dall'apertura il titolo dell'hero si mostra senza animazione (il ripiego CSS parte a 0,6 s).
const RIVELA_ENTRO_MS = 650

function giaVisibile(elemento: Element): boolean {
  return elemento.getBoundingClientRect().top < window.innerHeight * 0.92
}

/**
 * Ingressi di §5: y da 24 a 0 con opacity da 0 a 1, 0,7 s, power3.out, stagger 0,08. I figli di [data-bd-ingresso-figli] entrano uno per uno.
 * Opacity e non autoAlpha: autoAlpha mette visibility: hidden, e un elemento così non prende il focus né si trova con la ricerca
 * nella pagina. Con il tasto Tab si saltava il modulo finché non lo si vedeva scorrendo; così invece il focus lo porta nello schermo
 * e l'ingresso parte.
 */
function preparaIngressi(titoliPerRighe: boolean): void {
  document.querySelectorAll<HTMLElement>('[data-bd-ingresso]').forEach((sezione) => {
    if (giaVisibile(sezione)) return
    const bersagli: HTMLElement[] = []
    sezione.querySelectorAll<HTMLElement>(':scope > .bd-wrap > *').forEach((figlio) => {
      if (titoliPerRighe && figlio.tagName === 'H2') return // lo rivela preparaTitoli
      if (figlio.hasAttribute('data-bd-ingresso-figli')) bersagli.push(...(Array.from(figlio.children) as HTMLElement[]))
      else bersagli.push(figlio)
    })
    if (!bersagli.length) return
    gsap.from(bersagli, {
      opacity: 0,
      y: 24,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.08,
      scrollTrigger: { trigger: sezione, start: 'top 85%', once: true },
    })
  })
}

/**
 * Linee di quota che si disegnano quando entrano (§5). La linea ha vector-effect: non-scaling-stroke, quindi il tratteggio
 * si misura in pixel dello schermo, non in unità del viewBox: la lunghezza è la larghezza a schermo della linea (orizzontale).
 * A disegno finito il tratteggio si toglie, così un ridimensionamento della finestra non lascia la linea a metà.
 */
function preparaQuote(): void {
  document.querySelectorAll<SVGPathElement>('[data-bd-quota-linea]').forEach((linea) => {
    const quota = linea.closest('.bd-quota')
    if (!quota || giaVisibile(quota)) return
    const lunghezza = Math.ceil(linea.getBoundingClientRect().width) + 2
    gsap.fromTo(
      linea,
      { strokeDasharray: lunghezza, strokeDashoffset: lunghezza },
      {
        strokeDashoffset: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: quota, start: 'top 90%', once: true },
        onComplete: () => {
          gsap.set(linea, { clearProps: 'strokeDasharray,strokeDashoffset' })
        },
      },
    )
  })
}

/**
 * Catena di quote di «Come funziona» (§6.4): la linea si disegna mentre scorri, verticale su mobile e orizzontale
 * da 1024 px (il CSS sceglie scaleY o scaleX, qui si muove solo --bd-traccia da 0 a 1). Parte quando l'elenco entra
 * nello schermo e finisce quando il suo fondo arriva al 65%: la linea arriva a ogni passaggio mentre lo leggi.
 * Se l'elenco è già nello schermo all'apertura resta disegnata (niente sfarfallio); senza JavaScript e con la
 * riduzione del movimento vale 1 dal CSS.
 */
function preparaTracce(): void {
  document.querySelectorAll<HTMLElement>('[data-bd-traccia]').forEach((elenco) => {
    if (giaVisibile(elenco)) return
    gsap.fromTo(
      elenco,
      { '--bd-traccia': 0 },
      { '--bd-traccia': 1, ease: 'none', scrollTrigger: { trigger: elenco, start: 'top 85%', end: 'bottom 65%', scrub: 0.5 } },
    )
  })
}

/**
 * La parete in prospettiva (§5): --bd-esplodi va da 1 (strati staccati) a 0 (parete ricomposta, quote disegnate) mentre scorri.
 * Parte quando il disegno entra nello schermo (al 90% dell'altezza; se è già visibile all'apertura, dallo scroll 0)
 * e finisce quando il suo centro arriva al 30% dello schermo, con almeno 240 px di scorrimento: così la ricomposizione
 * si vede tutta, sia nell'hero da desktop (disegno accanto al titolo) sia su mobile (disegno sotto le CTA).
 */
function preparaPareti(): void {
  document.querySelectorAll<HTMLElement>('[data-bd-parete]').forEach((contenitore) => {
    const svg = contenitore.querySelector('svg')
    if (!svg) return
    // Posizione nella pagina senza i transform: l'ingresso della sezione sposta il contenuto di 24 px finché non entra,
    // e con getBoundingClientRect la ricomposizione finirebbe 24 px più in basso del previsto (succedeva in #sistema).
    const inPagina = () => {
      let y = 0
      for (let el: HTMLElement | null = contenitore; el; el = el.offsetParent as HTMLElement | null) y += el.offsetTop
      return y
    }
    const inizio = () => Math.max(0, inPagina() - window.innerHeight * 0.9)
    const fine = () => Math.max(inizio() + 240, inPagina() + contenitore.offsetHeight / 2 - window.innerHeight * 0.3)
    gsap.fromTo(
      svg,
      { '--bd-esplodi': 1 },
      { '--bd-esplodi': 0, ease: 'none', scrollTrigger: { trigger: contenitore, start: inizio, end: fine, scrub: 0.6 } },
    )
  })
}

/**
 * Quando l'altezza della pagina cambia (riquadri degli strati, passaggi del modulo, font arrivati dopo), ScrollTrigger
 * ricalcola inizio e fine di ogni animazione: senza, quelle più in basso partirebbero spostate di quanto è cambiata la pagina.
 * Lenis si aggiorna da solo (autoResize).
 */
function seguiAltezza(): () => void {
  let ultima = document.documentElement.scrollHeight
  let attesa = 0
  const osservatore = new ResizeObserver(() => {
    const altezza = document.documentElement.scrollHeight
    if (altezza === ultima) return
    ultima = altezza
    window.clearTimeout(attesa)
    attesa = window.setTimeout(() => ScrollTrigger.refresh(), 150)
  })
  osservatore.observe(document.body)
  return () => {
    osservatore.disconnect()
    window.clearTimeout(attesa)
  }
}

/**
 * Illustrazioni sfumate (§2): l'immagine scorre un po' più lenta della pagina dentro la sua cornice mascherata.
 * Parallasse leggera, solo senza riduzione del movimento (§3.8). Ingrandita del 14% così non scopre mai i bordi.
 */
function preparaIllustrazioni(): void {
  document.querySelectorAll<HTMLElement>('[data-bd-illustrazione]').forEach((figura) => {
    const immagine = figura.querySelector('img')
    if (!immagine) return
    gsap.fromTo(
      immagine,
      { yPercent: -6, scale: 1.14 },
      { yPercent: 6, scale: 1.14, ease: 'none', scrollTrigger: { trigger: figura, start: 'top bottom', end: 'bottom top', scrub: true } },
    )
  })
}

/** Titolo dell'hero rivelato per righe (solo desktop, §5): parte dallo stato nascosto deciso dallo script nel head. */
function rivelaTitoloHero(): void {
  const radice = document.documentElement
  if (!radice.classList.contains('bd-rivela')) return
  const variante = Array.from(document.querySelectorAll<HTMLElement>('[data-bd-rivela] .bd-v')).find(
    (el) => getComputedStyle(el).display !== 'none',
  )
  if (!variante) {
    radice.classList.remove('bd-rivela')
    return
  }
  void document.fonts.ready.then(() => {
    SplitText.create(variante, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (diviso) => {
        const inTempo = radice.classList.contains('bd-rivela') && performance.now() < RIVELA_ENTRO_MS
        radice.classList.remove('bd-rivela')
        if (!inTempo) return undefined
        // 0,6 s più 0,08 per riga: sotto gli 0,8 s di §5 fino a tre righe
        return gsap.from(diviso.lines, { yPercent: 105, duration: 0.6, ease: 'power3.out', stagger: 0.08 })
      },
    })
  })
}

/** h2 delle sezioni rivelati per righe quando entrano (solo desktop, §5). */
function preparaTitoli(): void {
  document.querySelectorAll<HTMLElement>('[data-bd-ingresso] > .bd-wrap > h2').forEach((titolo) => {
    if (giaVisibile(titolo)) return
    SplitText.create(titolo, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (diviso) =>
        gsap.from(diviso.lines, {
          yPercent: 105,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: titolo, start: 'top 85%', once: true },
        }),
    })
  })
}

/** Card di «Per chi è» che si inclinano seguendo il puntatore: al massimo 6° (§5). */
function preparaInclinazioni(): () => void {
  const pulizie: (() => void)[] = []
  document.querySelectorAll<HTMLElement>('[data-bd-inclina]').forEach((card) => {
    gsap.set(card, { transformPerspective: 900 })
    const rotX = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' })
    const rotY = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' })
    const muovi = (evento: PointerEvent) => {
      const r = card.getBoundingClientRect()
      rotY(((evento.clientX - r.left) / r.width - 0.5) * 12)
      rotX(-((evento.clientY - r.top) / r.height - 0.5) * 12)
    }
    const esci = () => {
      rotX(0)
      rotY(0)
    }
    card.addEventListener('pointermove', muovi)
    card.addEventListener('pointerleave', esci)
    pulizie.push(() => {
      card.removeEventListener('pointermove', muovi)
      card.removeEventListener('pointerleave', esci)
      gsap.set(card, { clearProps: 'transform' })
    })
  })
  return () => pulizie.forEach((p) => p())
}

/** CTA primarie «magnetiche» (Magnet di React Bits rifatto con GSAP): spostamento massimo 6 px. */
function preparaMagneti(): () => void {
  const pulizie: (() => void)[] = []
  document.querySelectorAll<HTMLElement>('.bd-cta--primaria').forEach((cta) => {
    if (cta.closest('.bd-barra-mobile') || cta.closest('form')) return
    const x = gsap.quickTo(cta, 'x', { duration: 0.4, ease: 'power3.out' })
    const y = gsap.quickTo(cta, 'y', { duration: 0.4, ease: 'power3.out' })
    const limita = (v: number) => Math.max(-6, Math.min(6, v))
    const muovi = (evento: PointerEvent) => {
      const r = cta.getBoundingClientRect()
      x(limita((evento.clientX - (r.left + r.width / 2)) * 0.15))
      y(limita((evento.clientY - (r.top + r.height / 2)) * 0.3))
    }
    const esci = () => {
      x(0)
      y(0)
    }
    cta.addEventListener('pointermove', muovi)
    cta.addEventListener('pointerleave', esci)
    pulizie.push(() => {
      cta.removeEventListener('pointermove', muovi)
      cta.removeEventListener('pointerleave', esci)
      gsap.set(cta, { clearProps: 'transform' })
    })
  })
  return () => pulizie.forEach((p) => p())
}

export function avviaMovimento(): void {
  if (avviato || typeof window === 'undefined') return
  avviato = true
  gsap.registerPlugin(ScrollTrigger, SplitText)

  const mm = gsap.matchMedia()
  mm.add(
    {
      ridotto: '(prefers-reduced-motion: reduce)',
      pieno: '(prefers-reduced-motion: no-preference)',
      largo: LARGO,
      puntatore: PUNTATORE,
    },
    (contesto) => {
      const { ridotto, largo, puntatore } = contesto.conditions ?? {}
      if (ridotto) {
        document.documentElement.classList.remove('bd-rivela')
        registraLenis(null)
        return
      }

      const lenis = new Lenis({ duration: 1.1, syncTouch: false, autoRaf: false })
      lenis.on('scroll', ScrollTrigger.update)
      const passo = (tempo: number) => lenis.raf(tempo * 1000)
      gsap.ticker.add(passo)
      gsap.ticker.lagSmoothing(0)
      registraLenis(lenis)

      preparaIngressi(Boolean(largo))
      preparaQuote()
      preparaTracce()
      preparaPareti()
      preparaIllustrazioni()

      const pulizie: (() => void)[] = [seguiAltezza()]
      if (largo) {
        rivelaTitoloHero()
        preparaTitoli()
      } else {
        document.documentElement.classList.remove('bd-rivela')
      }
      if (puntatore) pulizie.push(preparaInclinazioni(), preparaMagneti())

      return () => {
        pulizie.forEach((p) => p())
        gsap.ticker.remove(passo)
        gsap.ticker.lagSmoothing(500, 33)
        lenis.destroy()
        registraLenis(null)
      }
    },
  )
}
