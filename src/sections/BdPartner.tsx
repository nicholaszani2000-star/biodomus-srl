import BdSezione from '../components/BdSezione.tsx'
import BdWordmark from '../components/BdWordmark.tsx'
import { partnerAutorizzati } from '../content/dati.ts'
import { tt } from '../content/bd-testi.ts'

// Loghi copiati da studio/immagini.mjs in src/assets/partner/ solo con l'autorizzazione «sì» (§2, §10.7).
const LOGHI = import.meta.glob<string>('../assets/partner/*.{svg,png}', { eager: true, query: '?url', import: 'default' })
const SVG = import.meta.glob<string>('../assets/partner/*.svg', { eager: true, query: '?raw', import: 'default' })
const ALTEZZA_LOGO = 40

/** Il logo del partner: il file che contiene la prima parola del nome («edilnoma», «bioisotherm»). */
function logoDi(nome: string): { url: string; width?: number } | null {
  const chiave = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .find(Boolean)
  const percorso = chiave ? Object.keys(LOGHI).find((p) => p.split('/').pop()?.includes(chiave)) : undefined
  if (!percorso) return null
  // Per gli SVG la larghezza viene dal viewBox (width e height sempre dichiarate, §9); per i PNG resta automatica
  const viewBox = (SVG[percorso] ?? '').match(/viewBox="[\d.\s-]*?\s([\d.]+)\s+([\d.]+)"/)
  const width = viewBox ? Math.round((Number(viewBox[1]) / Number(viewBox[2])) * ALTEZZA_LOGO) : undefined
  return { url: LOGHI[percorso], width }
}

const maiuscola = (testo: string) => testo.charAt(0).toUpperCase() + testo.slice(1)

/**
 * Partner (§6.8): solo quelli con autorizzazione scritta «sì». Per ognuno logo e nome (senza logo il nome in stile
 * wordmark, una volta sola), P*_RUOLO e «Sito ufficiale» in una nuova scheda (rel="noopener").
 * Nessun partner autorizzato: la sezione non esiste e il resto della pagina dice «l'impresa partner».
 * Con un partner solo il titolo è al singolare (§2: niente plurali sbagliati).
 */
export default function BdPartner() {
  const elenco = partnerAutorizzati()
  if (!elenco.length) return null

  return (
    <BdSezione id="partner" titoloId="partner-titolo" classe="bd-partner">
      <h2 id="partner-titolo" className="bd-sezione__titolo">
        {tt(elenco.length === 1 ? 'partner.titoloUno' : 'partner.titolo')}
      </h2>
      <ul className="bd-partner__elenco" role="list" data-bd-ingresso-figli="">
        {elenco.map((partner) => {
          const logo = logoDi(partner.nome)
          return (
            <li key={partner.numero} className="bd-partner__voce">
              {logo ? (
                <>
                  <span className="bd-partner__logo">
                    <img src={logo.url} width={logo.width} height={ALTEZZA_LOGO} alt="" loading="lazy" decoding="async" />
                  </span>
                  <h3 className="bd-partner__nome">{partner.nome}</h3>
                </>
              ) : (
                // Senza logo il nome in stile wordmark fa da logo e da titolo insieme: niente nome ripetuto
                <h3 className="bd-partner__nome bd-partner__logo">
                  <BdWordmark testo={partner.nome} />
                </h3>
              )}
              {partner.ruolo ? <p className="bd-partner__ruolo">{maiuscola(partner.ruolo)}</p> : null}
              {partner.sito ? (
                <a className="bd-partner__link" href={partner.sito} target="_blank" rel="noopener">
                  {tt('partner.link')}
                  <span className="bd-sr-only">
                    {' '}
                    {partner.nome}, {tt('comuni.nuovaScheda')}
                  </span>
                </a>
              ) : null}
            </li>
          )
        })}
      </ul>
    </BdSezione>
  )
}
