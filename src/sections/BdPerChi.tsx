import BdCta from '../components/BdCta.tsx'
import BdSezione from '../components/BdSezione.tsx'
import { tt } from '../content/bd-testi.ts'
import testi from '../content/testi.json'
import { preseleziona, type ProfiloCard } from '../lib/bd-preselezione.ts'

// Icone al tratto 24 × 24 (§5): colore dei dettagli, decorative.
const ICONE: Record<ProfiloCard, string> = {
  casa: 'M3.5 11.5 12 4.5l8.5 7M5.75 9.75V19.5h12.5V9.75M10 19.5v-5h4v5',
  terreno: 'M2.75 16.75 9 13.25l12.25 3.25-6.25 3.75ZM12 14.5V4.25l5 2.25-5 2.25',
  investimento: 'M2.75 12.75 7 9l4.25 3.75v7h-8.5ZM12.75 12.75 17 9l4.25 3.75v7h-8.5ZM5.75 19.75v-3h2.5v3M15.75 19.75v-3h2.5v3',
}

/**
 * «Per chi è» (§6.3, copy di §8): tre card. Ogni CTA porta al modulo con la risposta 1 già scelta
 * (e «Sì» al terreno per la seconda card). Le CTA sono secondarie: una sola primaria per schermata (§5).
 * Da 1024 px, con il mouse, le card si inclinano di qualche grado (bd-motion, data-bd-inclina).
 */
export default function BdPerChi() {
  const card = testi.perChi.card
  return (
    <BdSezione id="per-chi" titoloId="per-chi-titolo">
      <h2 id="per-chi-titolo" className="bd-perchi__titolo">
        {tt('perChi.titolo')}
      </h2>
      <ul className="bd-card-griglia" data-bd-ingresso-figli="">
        {card.map((c, i) => {
          const profilo = c.profilo as ProfiloCard
          return (
            <li key={profilo} className="bd-card" data-bd-inclina="">
              <span className="bd-card__icona" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d={ICONE[profilo]} />
                </svg>
              </span>
              <h3 className="m-0">{tt(`perChi.card.${i}.titolo`)}</h3>
              <p className="m-0 text-testo-2">{tt(`perChi.card.${i}.testo`)}</p>
              <BdCta variante="secondaria" compatta alClic={() => preseleziona(profilo)}>
                {tt(`perChi.card.${i}.cta`)}
              </BdCta>
            </li>
          )
        })}
      </ul>
    </BdSezione>
  )
}
