import { useEffect, useState } from 'react'
import BdCta from './BdCta.tsx'
import { tt } from '../content/bd-testi.ts'

/**
 * Barra fissa in basso, solo sotto 768 px (§6). Compare quando la CTA primaria dell'hero è uscita dall'alto;
 * sparisce quando #preventivo o un'altra CTA primaria è nello schermo (e, dallo step 7, il banner cookie):
 * nello schermo resta sempre una sola primaria (§5). Altezza 64 px più il safe-area-inset-bottom.
 * Senza JavaScript resta nascosta: la pagina ha già le sue CTA.
 */
export default function BdBarraMobile() {
  const [visibile, setVisibile] = useState(false)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const mobile = window.matchMedia('(max-width: 767.98px)')
    const ctaHero = document.querySelector('#inizio .bd-cta--primaria')
    const preventivo = document.getElementById('preventivo')
    const altre = [...document.querySelectorAll('.bd-cta--primaria, .bd-banner-cookie')].filter(
      (el) => !el.closest('.bd-barra-mobile') && !el.closest('#inizio') && !el.closest('#preventivo'),
    )
    const nelloSchermo = new Map<Element, boolean>()
    let heroPassato = false

    const aggiorna = () => {
      const altraVisibile = [...nelloSchermo.values()].some(Boolean)
      setVisibile(mobile.matches && heroPassato && !altraVisibile)
    }
    const osservatore = new IntersectionObserver((voci) => {
      for (const voce of voci) {
        nelloSchermo.set(voce.target, voce.isIntersecting)
        if (voce.target === ctaHero) heroPassato = !voce.isIntersecting && voce.boundingClientRect.bottom <= 0
      }
      aggiorna()
    })
    for (const el of [ctaHero, preventivo, ...altre]) if (el) osservatore.observe(el)
    mobile.addEventListener('change', aggiorna)
    return () => {
      osservatore.disconnect()
      mobile.removeEventListener('change', aggiorna)
    }
  }, [])

  return (
    <div className="bd-barra-mobile" data-visibile={visibile ? '' : undefined} inert={!visibile}>
      <BdCta classe="w-full">{tt('barraMobile.cta')}</BdCta>
    </div>
  )
}
