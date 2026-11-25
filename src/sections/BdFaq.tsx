import { useState } from 'react'
import BdSezione from '../components/BdSezione.tsx'
import { t, tt } from '../content/bd-testi.ts'
import testi from '../content/testi.json'
import { useIdratato } from '../lib/bd-idratato.ts'

interface Voce {
  domanda: string
  risposta: string
}

// Le 8 domande di §8. Una domanda la cui risposta usa un dato vuoto non c'è: senza COSTO_SERVIZIO sparisce la 5.
const VOCI: Voce[] = testi.faq.voci
  .map((_, i) => ({ domanda: t(`faq.voci.${i}.domanda`), risposta: t(`faq.voci.${i}.risposta`) }))
  .filter((v): v is Voce => v.domanda !== null && v.risposta !== null)

function Freccia() {
  return (
    <svg className="bd-faq__freccia" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M5 7.75 10 12.75 15 7.75" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Domande frequenti (§6.10, copy di §8): rispondono alle obiezioni prima della chiamata.
 * Senza JavaScript sono <details> e <summary>: si aprono comunque e le risposte sono nell'HTML prerenderizzato.
 * Dopo l'hydration diventano un accordion: <button> con aria-expanded e aria-controls dentro un h3, risposta in una
 * regione (role="region"), una domanda aperta per volta. Nessuna animazione di altezza: si apre e basta.
 */
export default function BdFaq() {
  const idratato = useIdratato()
  const [aperta, setAperta] = useState(-1)

  return (
    <BdSezione id="faq" titoloId="faq-titolo" classe="bd-faq">
      <h2 id="faq-titolo" className="bd-sezione__titolo">
        {tt('faq.titolo')}
      </h2>
      <div className="bd-faq__elenco">
        {VOCI.map(({ domanda, risposta }, i) =>
          idratato ? (
            <div key={domanda} className="bd-faq__voce">
              <h3 className="bd-faq__intestazione">
                <button
                  type="button"
                  id={`faq-${i + 1}`}
                  className="bd-faq__domanda"
                  aria-expanded={aperta === i}
                  aria-controls={`faq-${i + 1}-risposta`}
                  onClick={() => setAperta(aperta === i ? -1 : i)}
                >
                  <span>{domanda}</span>
                  <Freccia />
                </button>
              </h3>
              <div id={`faq-${i + 1}-risposta`} className="bd-faq__risposta" role="region" aria-labelledby={`faq-${i + 1}`} hidden={aperta !== i}>
                <p className="m-0">{risposta}</p>
              </div>
            </div>
          ) : (
            <details key={domanda} className="bd-faq__voce">
              <summary className="bd-faq__domanda">
                <span>{domanda}</span>
                <Freccia />
              </summary>
              <div className="bd-faq__risposta">
                <p className="m-0">{risposta}</p>
              </div>
            </details>
          ),
        )}
      </div>
    </BdSezione>
  )
}
