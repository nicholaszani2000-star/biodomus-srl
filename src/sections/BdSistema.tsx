import { useState, type MouseEvent } from 'react'
import BdCta from '../components/BdCta.tsx'
import BdParete from '../components/BdParete.tsx'
import BdSezione from '../components/BdSezione.tsx'
import { dati } from '../content/dati.ts'
import { t, tt } from '../content/bd-testi.ts'
import testi from '../content/testi.json'
import { useIdratato } from '../lib/bd-idratato.ts'

/**
 * «Com'è fatta la casa» (§6.6, copy di §8): la parete grande in prospettiva, versione chiara (prefisso bdss),
 * e un pulsante per strato che apre la sua frase in un riquadro, uno solo per volta.
 * I pulsanti sono <button> veri in un elenco fuori dall'SVG: il disegno ha role="img" e i suoi figli
 * non arrivano ai lettori di schermo. Lo strato del pulsante aperto si evidenzia nel disegno (data-strato-attivo);
 * il tocco su uno strato del disegno apre lo stesso riquadro, come scorciatoia per il dito.
 * Senza JavaScript i quattro riquadri sono tutti aperti: la pagina si legge tutta (§3.8).
 * La ricomposizione allo scroll la fa già bd-motion (preparaPareti): qui niente pin né seconda animazione.
 * RAPPORTO_PARTNER non è confermato per iscritto: nessuna frase collega l'impresa al sistema del produttore (§2).
 */
export default function BdSistema() {
  const idratato = useIdratato()
  // Indice del riquadro aperto: 0 = il primo strato, -1 = nessuno. Senza JavaScript sono aperti tutti.
  const [aperto, setAperto] = useState(0)
  const strati = testi.sistema.strati
  const attivo = idratato && aperto >= 0 ? String(aperto + 1) : undefined

  // Fatti di §8 solo se presenti: la classe con P1_OK «sì», la garanzia se GARANZIA è compilata.
  const p1Autorizzato: boolean = dati.P1_OK
  const fatti = [p1Autorizzato ? t('sistema.fatti.classe') : null, t('sistema.fatti.garanzia')].filter((f): f is string => f !== null)

  const toccaDisegno = (evento: MouseEvent<HTMLDivElement>) => {
    const strato = (evento.target as Element).closest('[data-strato]')?.getAttribute('data-strato')
    if (strato) setAperto(Number(strato) - 1)
  }

  return (
    <BdSezione id="sistema" titoloId="sistema-titolo" classe="bd-sistema">
      <h2 id="sistema-titolo" className="bd-sezione__titolo">
        {tt('sistema.titolo')}
      </h2>
      <p className="bd-sezione__intro">{tt('sistema.testo')}</p>
      <div className="bd-sistema__griglia">
        <div className="bd-sistema__disegno">
          <figure className="bd-sistema__figura">
            {/* Scorciatoia per il dito: la tastiera e i lettori di schermo usano i pulsanti dell'elenco */}
            <div className="bd-sistema__tela" data-strato-attivo={attivo} onClick={toccaDisegno}>
              <BdParete prefisso="bdss" titolo={tt('sistema.disegno')} classe="bd-parete--sistema" />
            </div>
            <figcaption className="bd-piccolo">{tt('sistema.nota')}</figcaption>
          </figure>
          {fatti.length ? (
            <ul className="bd-sistema__fatti" role="list">
              {fatti.map((fatto) => (
                <li key={fatto}>{fatto}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="bd-sistema__strati">
          <p id="sistema-strati-titolo" className="bd-occhiello m-0">
            {tt('sistema.stratiTitolo')}
          </p>
          <ul className="bd-strati" aria-labelledby="sistema-strati-titolo" role="list">
            {strati.map((strato, i) => {
              const aperta = !idratato || aperto === i
              return (
                <li key={strato.titolo} className="bd-strati__voce">
                  <h3 className="bd-strati__intestazione">
                    <button
                      type="button"
                      id={`sistema-strato-${i + 1}`}
                      className="bd-strati__pulsante"
                      aria-expanded={aperta}
                      aria-controls={`sistema-strato-${i + 1}-testo`}
                      onClick={() => setAperto(aperto === i ? -1 : i)}
                    >
                      <span className="bd-strati__numero" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className="bd-strati__nome">{tt(`sistema.strati.${i}.titolo`)}</span>
                      <svg className="bd-strati__freccia" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
                        <path d="M4.5 7 9 11.5 13.5 7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </h3>
                  <div
                    id={`sistema-strato-${i + 1}-testo`}
                    className="bd-strati__riquadro"
                    role="region"
                    aria-labelledby={`sistema-strato-${i + 1}`}
                    hidden={!aperta}
                  >
                    <p className="m-0">{tt(`sistema.strati.${i}.testo`)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="bd-sezione__cta">
            <BdCta>{tt('sistema.cta')}</BdCta>
          </div>
        </div>
      </div>
    </BdSezione>
  )
}
