import BdCta from '../components/BdCta.tsx'
import BdParete from '../components/BdParete.tsx'
import BdSezione from '../components/BdSezione.tsx'
import { contatti } from '../content/dati.ts'
import { tt } from '../content/bd-testi.ts'

/**
 * Chiusura (§6.11, copy di §8): l'ultima CTA primaria, con chi risponde e in quanto tempo.
 * Una tavola con la griglia da tavolo tecnico e la parete piccola, in chiaro (prefisso bdsc: id e retini suoi).
 * Sotto la CTA i canali secondari di §2, solo qui e nel footer: «Chiama» (tel:+39…) e «Scrivi su WhatsApp»
 * (wa.me, nuova scheda). Più piccoli della primaria ma con aree di tocco di 44 px. TELEFONO vuoto: niente canali;
 * WHATSAPP «no»: niente WhatsApp.
 */
export default function BdChiusura() {
  const canali = contatti()

  return (
    <BdSezione id="chiusura" titoloId="chiusura-titolo" classe="bd-chiusura">
      <div className="bd-chiusura__tavola">
        <div className="bd-chiusura__testo">
          <h2 id="chiusura-titolo" className="bd-sezione__titolo">
            {tt('chiusura.titolo')}
          </h2>
          <p className="bd-chiusura__frase">{tt('chiusura.testo')}</p>
          <div>
            <BdCta>{tt('chiusura.cta')}</BdCta>
          </div>
          {canali ? (
            <div className="bd-chiusura__canali">
              <p className="bd-piccolo m-0">{tt('chiusura.secondariDomanda')}</p>
              <div className="bd-chiusura__pulsanti">
                <a className="bd-cta bd-cta--secondaria bd-cta--compatta" href={canali.tel}>
                  {tt('chiusura.chiama')}
                </a>
                {canali.whatsapp ? (
                  <a className="bd-cta bd-cta--secondaria bd-cta--compatta" href={canali.whatsapp} target="_blank" rel="noopener">
                    {tt('chiusura.whatsapp')}
                    <span className="bd-sr-only"> {tt('comuni.nuovaScheda')}</span>
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        {/* Decorativa: la parete grande con le frasi degli strati è in «Com'è fatta la casa» */}
        <figure className="bd-chiusura__disegno" aria-hidden="true">
          <BdParete prefisso="bdsc" titolo={tt('sistema.disegno')} classe="bd-parete--chiusura" />
          <figcaption className="bd-piccolo">{tt('comuni.illustrazione')}</figcaption>
        </figure>
      </div>
    </BdSezione>
  )
}
