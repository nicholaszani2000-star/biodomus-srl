import { useEffect, useState, type MouseEvent } from 'react'
import BdCta from './BdCta.tsx'
import BdWordmark from './BdWordmark.tsx'
import { dati } from '../content/dati.ts'
import { tt } from '../content/bd-testi.ts'
import { scorriA } from '../lib/bd-scorri.ts'

// Con STILE «Misto» (o «Grafite») il primo schermo è scuro: l'header ha il logo negativo finché sta sopra l'hero.
const primoSchermoScuro = (dati.STILE as string) !== 'cemento'

/**
 * Header fisso (§6.1): logo, «Come funziona» da 640 px, CTA sempre a un tocco ma secondaria
 * (§5: una sola primaria per schermata).
 * Con STILE «Misto»: sopra l'hero tema scuro e logo negativo; quando l'hero esce, tema chiaro e logo positivo.
 * I due loghi stanno nella stessa scatola e si scambiano in dissolvenza (200 ms): nessuno spostamento.
 * Il tema scuro vale solo con JavaScript (.bd-js .bd-header--su-hero in bd-tokens.css):
 * senza JavaScript l'header resta chiaro con il logo positivo.
 */
export default function BdHeader() {
  const [suHero, setSuHero] = useState(true)

  useEffect(() => {
    if (!primoSchermoScuro || !('IntersectionObserver' in window)) return
    // La sentinella sta 64 px sopra il fondo dell'hero: quando passa sopra il bordo alto dello schermo,
    // l'hero è finito sotto l'header. La zona osservata è tutto ciò che sta sopra quel bordo
    // (rootMargin: in alto senza limite, in basso -100%): così anche un salto (ancora, scroll istantaneo,
    // riduzione del movimento) è un cambio di stato e l'osservatore lo notifica.
    const sentinella = document.querySelector('[data-bd-hero-fine]')
    if (!sentinella) return
    const osservatore = new IntersectionObserver(
      ([voce]) => {
        setSuHero(!voce.isIntersecting)
      },
      { rootMargin: '100000px 0px -100% 0px' },
    )
    osservatore.observe(sentinella)
    return () => osservatore.disconnect()
  }, [])

  const comeFunziona = (evento: MouseEvent<HTMLAnchorElement>) => {
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey) return
    evento.preventDefault()
    scorriA('come-funziona')
  }

  const classi = [
    'bd-header sticky top-0 z-30 border-b border-linea bg-fondo/90 text-testo backdrop-blur-md',
    primoSchermoScuro && suHero ? 'bd-header--su-hero' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className={classi}>
      <div className="bd-wrap flex h-16 items-center justify-between gap-4">
        <a href="#contenuto" className="no-underline" aria-label={tt('comuni.tornaInizio')}>
          {primoSchermoScuro ? (
            <span className="bd-logo-scambio">
              <BdWordmark />
              <BdWordmark tono="negativo" />
            </span>
          ) : (
            <BdWordmark />
          )}
        </a>
        <nav aria-label="Principale" className="flex items-center gap-2 sm:gap-6">
          <a href="#come-funziona" onClick={comeFunziona} className="hidden font-medium text-testo no-underline hover:underline sm:inline">
            {tt('header.linkComeFunziona')}
          </a>
          <BdCta variante="secondaria" href="#preventivo" compatta freccia={false}>
            {tt('header.cta')}
          </BdCta>
        </nav>
      </div>
    </header>
  )
}
