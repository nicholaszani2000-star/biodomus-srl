import { useEffect, useState, type MouseEvent } from 'react'
import BdCta from './BdCta.tsx'
import BdWordmark from './BdWordmark.tsx'
import { dati } from '../content/dati.ts'
import { tt } from '../content/bd-testi.ts'
import { scorriA } from '../lib/bd-scorri.ts'

/**
 * Header fisso (§6.1): logo, «Come funziona» da 640 px, CTA sempre a un tocco ma secondaria (§5: una sola primaria per schermata).
 * STILE «Misto»: scuro, con il logo negativo, finché sta sopra l'hero; chiaro, con il logo positivo, quando l'hero esce dallo schermo.
 * Il prerender scrive la classe bd-header--scuro; i token scuri valgono solo con .bd-js sull'html (lo mette lo script nel head
 * prima del CSS): con JavaScript l'header è scuro dal primo disegno e non cambia colore al caricamento; senza resta chiaro.
 * Il cambio lo decide un IntersectionObserver sull'hero intero, quindi anche i salti (ancore, scroll istantaneo) cambiano stato;
 * colori e loghi passano con una dissolvenza di 200 ms (CSS), nessuno spostamento.
 */
export default function BdHeader() {
  const stile: string = dati.STILE
  const misto = stile === 'misto'
  const [scuro, setScuro] = useState(misto)

  useEffect(() => {
    if (!misto || typeof IntersectionObserver === 'undefined') return
    const hero = document.getElementById('inizio')
    const header = document.querySelector<HTMLElement>('.bd-header')
    if (!hero || !header) return
    const osservatore = new IntersectionObserver(([voce]) => setScuro(voce.isIntersecting), {
      // L'hero conta solo per la parte sotto l'header
      rootMargin: `-${header.offsetHeight}px 0px 0px 0px`,
    })
    osservatore.observe(hero)
    return () => osservatore.disconnect()
  }, [misto])

  const comeFunziona = (evento: MouseEvent<HTMLAnchorElement>) => {
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey) return
    evento.preventDefault()
    scorriA('come-funziona')
  }

  return (
    <header
      // Scuro: fondo pieno (sotto l'header, in cima, c'è il fondo chiaro della pagina che trasparirebbe). Chiaro: velato al 90%.
      className={['bd-header sticky top-0 z-30 border-b border-linea backdrop-blur-md', scuro ? 'bd-header--scuro bg-fondo' : 'bg-fondo/90'].join(' ')}
      data-bd-tema={misto ? (scuro ? 'scuro' : 'chiaro') : undefined}
    >
      <div className="bd-wrap flex h-16 items-center justify-between gap-4">
        <a href="#contenuto" className="no-underline" aria-label={tt('comuni.tornaInizio')}>
          <BdWordmark />
        </a>
        <nav aria-label="Principale" className="flex items-center gap-2 sm:gap-6">
          <a href="#come-funziona" onClick={comeFunziona} className="hidden font-medium text-testo no-underline hover:underline sm:inline">
            {tt('header.linkComeFunziona')}
          </a>
          <BdCta variante="secondaria" compatta freccia={false}>
            {tt('header.cta')}
          </BdCta>
        </nav>
      </div>
    </header>
  )
}
