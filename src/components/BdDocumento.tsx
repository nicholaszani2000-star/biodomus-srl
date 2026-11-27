import type { ReactNode } from 'react'
import { riempi, risolvi, tt } from '../content/bd-testi.ts'
import testi from '../content/testi.json'

interface Riga {
  nome: string
  scopo: string
  durata: string
}
type Blocco = string | string[] | { tabella: Riga[] }

/**
 * «[testo](indirizzo)» nei testi legali diventa un link. I link verso altri siti hanno rel="noopener" e restano
 * nella stessa scheda: niente target, niente sorprese.
 */
function conLink(testo: string): ReactNode[] {
  const parti: ReactNode[] = []
  let ultimo = 0
  for (const trovato of testo.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    const inizio = trovato.index
    if (inizio > ultimo) parti.push(testo.slice(ultimo, inizio))
    const [, etichetta, indirizzo] = trovato
    const esterno = /^https?:\/\//.test(indirizzo)
    parti.push(
      <a key={inizio} href={indirizzo} rel={esterno ? 'noopener' : undefined}>
        {etichetta}
      </a>,
    )
    ultimo = inizio + trovato[0].length
  }
  if (ultimo < testo.length) parti.push(testo.slice(ultimo))
  return parti
}

function Blocchi({ contenuto }: { contenuto: Blocco[] }) {
  return contenuto.map((blocco, i) => {
    if (typeof blocco === 'string') {
      // Un paragrafo che usa un dato vuoto (per esempio la PEC) non c'è
      const testo = risolvi(blocco)
      return testo === null ? null : <p key={i}>{conLink(testo)}</p>
    }
    if (Array.isArray(blocco)) {
      const voci = blocco.map((voce) => risolvi(voce)).filter((voce): voce is string => voce !== null)
      return (
        <ul key={i}>
          {voci.map((voce) => (
            <li key={voce}>{conLink(voce)}</li>
          ))}
        </ul>
      )
    }
    return (
      <table key={i} className="bd-documento__tabella">
        <thead>
          <tr>
            <th scope="col">{tt('pagine.tabella.nome')}</th>
            <th scope="col">{tt('pagine.tabella.scopo')}</th>
            <th scope="col">{tt('pagine.tabella.durata')}</th>
          </tr>
        </thead>
        <tbody>
          {blocco.tabella.map((riga) => (
            <tr key={riga.nome}>
              <th scope="row">
                <code>{riga.nome}</code>
              </th>
              <td>{riga.scopo}</td>
              <td className="whitespace-nowrap">{riga.durata}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  })
}

/**
 * Informativa privacy (art. 13 GDPR, §10 punto 3) e cookie policy (§10 punto 4): i testi stanno in testi.json,
 * divisi in sezioni con un titolo e un «contenuto» (stringa = paragrafo, elenco = voci puntate, «tabella» = tabella).
 * In testa il riquadro di avviso: il testo va fatto verificare a un consulente privacy prima della pubblicazione.
 */
export default function BdDocumento({ pagina }: { pagina: 'privacy' | 'cookie' }) {
  const documento = testi[pagina]
  const sezioni = documento.sezioni as { titolo: string; contenuto: Blocco[] }[]
  return (
    <article className="bd-documento">
      <p className="bd-avviso" role="note">
        {tt('pagine.avviso')}
      </p>
      <h1>{tt(`${pagina}.titolo`)}</h1>
      <p className="bd-documento__data">{riempi(tt('pagine.aggiornamento'), { data: documento.aggiornamento })}</p>
      <p className="bd-documento__intro">{tt(`${pagina}.intro`)}</p>
      {sezioni.map((sezione) => (
        <section key={sezione.titolo}>
          <h2>{sezione.titolo}</h2>
          <Blocchi contenuto={sezione.contenuto} />
        </section>
      ))}
    </article>
  )
}
