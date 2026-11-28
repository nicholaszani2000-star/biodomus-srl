import { useEffect, useRef, useState } from 'react'
import BdCta from './BdCta.tsx'
import { tt } from '../content/bd-testi.ts'

/**
 * Barra fissa in basso, solo sotto 768 px (§6). Compare quando la CTA dell'hero è uscita dallo schermo verso l'alto
 * e sparisce quando nello schermo c'è il modulo o un'altra CTA primaria: così resta sempre una sola primaria (§5).
 * Nell'HTML prerenderizzato è nascosta dal CSS (senza JavaScript non serve: le CTA della pagina sono ancore vere).
 * Si nasconde di colpo e compare scorrendo dal basso in 200 ms; nascosta è anche inert: fuori dal tab e dai lettori di schermo.
 * Con il banner dei cookie aperto sale sopra di lui (--bd-banner-h, scritto da BdBannerCookie): la CTA resta scoperta.
 */
export default function BdBarraMobile() {
  const barra = useRef<HTMLDivElement>(null)
  const [visibile, setVisibile] = useState(false)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const ctaHero = document.querySelector('#inizio .bd-cta--primaria')
    const modulo = document.getElementById('preventivo')
    const primarie = [...document.querySelectorAll('.bd-cta--primaria')].filter((el) => !barra.current?.contains(el))
    const inVista = new Set<Element>()
    let oltreHero = false

    const osservatore = new IntersectionObserver((voci) => {
      for (const voce of voci) {
        if (voce.isIntersecting) inVista.add(voce.target)
        else inVista.delete(voce.target)
        if (voce.target === ctaHero) oltreHero = !voce.isIntersecting && voce.boundingClientRect.bottom <= 0
      }
      setVisibile(oltreHero && inVista.size === 0)
    })
    for (const el of [...primarie, modulo]) if (el) osservatore.observe(el)
    return () => osservatore.disconnect()
  }, [])

  return (
    <div
      ref={barra}
      className={[
        'bd-barra-mobile fixed inset-x-0 bottom-[var(--bd-banner-h,0px)] z-40 border-t border-linea bg-fondo/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden',
        visibile ? 'bd-barra-mobile--vista' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      inert={!visibile}
    >
      <BdCta classe="w-full">{tt('barraMobile.cta')}</BdCta>
    </div>
  )
}
