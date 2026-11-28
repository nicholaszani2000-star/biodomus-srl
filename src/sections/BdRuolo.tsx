import BdSezione from '../components/BdSezione.tsx'
import { t, tl, tt } from '../content/bd-testi.ts'
import testi from '../content/testi.json'

/**
 * «Un solo referente» (§6.5, copy di §8): chi fa cosa tra Biodomus, l'impresa e il cliente, e quanto costa il servizio.
 * È la sezione che fa fidare di un intermediario: tre colonne con elenchi veri (ul) e il riquadro del costo.
 * Il riquadro c'è solo se COSTO_SERVIZIO è compilato in §2: senza, niente riquadro (e il report lo segnala).
 * Nessun ritratto del referente finché in studio/originali/ non c'è una sua foto: niente segnaposti.
 */
export default function BdRuolo() {
  const costo = t('ruolo.costoTesto')
  return (
    <BdSezione id="ruolo" titoloId="ruolo-titolo" classe="bd-ruolo">
      <h2 id="ruolo-titolo" className="bd-sezione__titolo">
        {tt('ruolo.titolo')}
      </h2>
      <p className="bd-sezione__intro">{tt('ruolo.testo')}</p>
      <div className="bd-ruolo__colonne" data-bd-ingresso-figli="">
        {testi.ruolo.colonne.map((colonna, i) => (
          <div key={colonna.titolo} className={i === 0 ? 'bd-ruolo__colonna bd-ruolo__colonna--noi' : 'bd-ruolo__colonna'}>
            <h3 id={`ruolo-colonna-${i + 1}`} className="bd-ruolo__titolo">
              {tt(`ruolo.colonne.${i}.titolo`)}
            </h3>
            <ul className="bd-elenco" aria-labelledby={`ruolo-colonna-${i + 1}`} role="list">
              {tl(`ruolo.colonne.${i}.voci`).map((voce) => (
                <li key={voce}>{voce}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {costo ? (
        <aside className="bd-ruolo__costo" aria-labelledby="ruolo-costo-titolo" data-bd-costo="">
          <h3 id="ruolo-costo-titolo" className="bd-ruolo__titolo">
            {tt('ruolo.costoTitolo')}
          </h3>
          <p className="m-0">{costo}</p>
        </aside>
      ) : null}
    </BdSezione>
  )
}
