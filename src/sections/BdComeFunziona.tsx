import iconaChiave from '../assets/svg/bd-icona-chiave.svg?raw'
import iconaConversazione from '../assets/svg/bd-icona-conversazione.svg?raw'
import iconaFirma from '../assets/svg/bd-icona-firma.svg?raw'
import iconaTavola from '../assets/svg/bd-icona-tavola.svg?raw'
import BdCta from '../components/BdCta.tsx'
import BdSezione from '../components/BdSezione.tsx'
import { t, tt } from '../content/bd-testi.ts'
import testi from '../content/testi.json'

// Icone al tratto dello step 2 (studio/svg/genera-svg.mjs), una per passaggio. Qui sono decorative:
// il titolo del passaggio dice già tutto, quindi via role e aria-label del file e aria-hidden.
const decorativa = (svg: string) =>
  svg
    .trim()
    .replace(/\s(role|aria-label|aria-labelledby)="[^"]*"/g, '')
    .replace('<svg ', '<svg aria-hidden="true" focusable="false" ')

const ICONE = [iconaConversazione, iconaTavola, iconaFirma, iconaChiave].map(decorativa)

/**
 * «Come funziona» (§6.4, copy di §8): quattro passaggi su una catena di quote. I numeri stanno dentro la linea,
 * come nella BdQuota che separa le sezioni. Su mobile una colonna con la linea verticale, da 1024 px quattro colonne
 * con la linea orizzontale. La linea si disegna mentre scorri (bd-motion, --bd-traccia da 0 a 1);
 * senza JavaScript e con la riduzione del movimento è già disegnata.
 * Il passaggio 4 dice i tempi solo se TEMPI c'è: altrimenti la frase finisce senza.
 */
export default function BdComeFunziona() {
  return (
    <BdSezione id="come-funziona" titoloId="come-funziona-titolo" classe="bd-come">
      <h2 id="come-funziona-titolo" className="bd-sezione__titolo">
        {tt('comeFunziona.titolo')}
      </h2>
      <p className="bd-sezione__intro">{tt('comeFunziona.intro')}</p>
      <ol className="bd-passaggi" data-bd-traccia="" data-bd-ingresso-figli="">
        {testi.comeFunziona.passaggi.map((passaggio, i) => {
          const tempi = 'tempi' in passaggio ? t(`comeFunziona.passaggi.${i}.tempi`) : null
          return (
            <li key={passaggio.titolo} className="bd-passaggio">
              <span className="bd-passaggio__numero" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="bd-passaggio__icona" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONE[i] }} />
              <h3 className="bd-passaggio__titolo">{tt(`comeFunziona.passaggi.${i}.titolo`)}</h3>
              <p className="bd-passaggio__testo">
                {tt(`comeFunziona.passaggi.${i}.testo`)}
                {tempi ? ` ${tempi}` : null}
              </p>
            </li>
          )
        })}
      </ol>
      <div className="bd-sezione__cta">
        <BdCta>{tt('comeFunziona.cta')}</BdCta>
      </div>
    </BdSezione>
  )
}
