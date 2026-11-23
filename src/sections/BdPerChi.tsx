import iconaCasa from '../assets/svg/bd-icona-casa.svg?raw'
import iconaTerreno from '../assets/svg/bd-icona-terreno.svg?raw'
import iconaVillette from '../assets/svg/bd-icona-villette.svg?raw'
import BdCta from '../components/BdCta.tsx'
import BdSvg from '../components/BdSvg.tsx'
import { tt } from '../content/bd-testi.ts'
import testi from '../content/testi.json'
import { PRESELEZIONI, preseleziona } from '../lib/bd-preselezione.ts'

type Profilo = keyof typeof PRESELEZIONI

const ICONE: Record<Profilo, string> = { casa: iconaCasa, terreno: iconaTerreno, investimento: iconaVillette }

/**
 * «Per chi è» (§6.3, copy di §8): tre card per riconoscersi e fare il primo clic.
 * Ogni CTA porta al modulo con la risposta 1 già scelta (casa, casa con terreno «Sì», investimento).
 * Le CTA delle card sono secondarie: tre primarie affiancate romperebbero la regola di §5.
 * Da 1024 px con puntatore fine le card si inclinano seguendo il puntatore (bd-motion, massimo 6°).
 */
export default function BdPerChi() {
  return (
    <section id="per-chi" className="bd-sezione bd-per-chi" aria-labelledby="per-chi-titolo" data-bd-ingresso="">
      <div className="bd-wrap">
        <h2 id="per-chi-titolo" className="bd-titolo-sezione m-0" data-bd-entra="">
          {tt('perChi.titolo')}
        </h2>
        <ul className="bd-per-chi__card" role="list">
          {testi.perChi.card.map((card, i) => {
            const profilo = card.profilo as Profilo
            return (
              <li key={profilo} className="bd-card" data-bd-entra="" data-bd-inclina="">
                <BdSvg svg={ICONE[profilo]} classe="bd-card__icona" />
                <h3 className="bd-card__titolo m-0">{tt(`perChi.card.${i}.titolo`)}</h3>
                <p className="bd-card__testo m-0">{tt(`perChi.card.${i}.testo`)}</p>
                <BdCta variante="secondaria" classe="bd-card__cta" alClic={() => preseleziona(PRESELEZIONI[profilo])}>
                  {tt(`perChi.card.${i}.cta`)}
                </BdCta>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
