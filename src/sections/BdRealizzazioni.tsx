import { useEffect, useRef, useState } from 'react'
import assonometria from '../assets/svg/bd-assonometria.svg'
import BdCta from '../components/BdCta.tsx'
import BdSezione from '../components/BdSezione.tsx'
import { dati, realizzazioniVisibili, type Realizzazione } from '../content/dati.ts'
import { riempi, t, tt } from '../content/bd-testi.ts'
import immagini from '../content/immagini.json'
import { useIdratato } from '../lib/bd-idratato.ts'

// Foto esportate da studio/immagini.mjs (solo con P1_OK «sì»): src/assets/img/<id>-<larghezza>.<formato>.
const FILE_FOTO = import.meta.glob<string>('../assets/img/*.{avif,webp}', { eager: true, query: '?url', import: 'default' })
const numero = new Intl.NumberFormat('it-IT')

const slug = (testo: string) =>
  testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

interface Foto {
  id: string
  larghezze: number[]
  width: number
  height: number
  alt: string
}

/** La foto di una realizzazione, abbinata per nome: la cartella studio/originali/foto/villa-mary/ dà gli id «villa-mary-…». */
function fotoDi(realizzazione: Realizzazione): Foto | null {
  const chiave = slug(realizzazione.nome)
  const voce = immagini.immagini.find(
    (v) => v.tipo === 'foto' && !/BdHero/.test(v.dove) && (v.id === chiave || v.id.startsWith(`${chiave}-`)),
  )
  return voce ? (voce as unknown as Foto) : null
}

const srcset = (foto: Foto, formato: 'avif' | 'webp') =>
  foto.larghezze
    .map((larghezza) => {
      const url = FILE_FOTO[`../assets/img/${foto.id}-${larghezza}.${formato}`]
      return url ? `${url} ${larghezza}w` : null
    })
    .filter(Boolean)
    .join(', ')

const SIZES = '(min-width: 1024px) 33vw, 82vw'
const illustrazione = immagini.immagini.find((v) => v.id === 'assonometria')

/**
 * Realizzazioni (§6.7, copy di §8): solo con P1_OK «sì» e REALIZZAZIONI piena. Con P1_OK «no» la sezione non esiste
 * nell'HTML e la CTA di §6 resta dopo BdSistema.
 * Card con foto (lazy, srcset AVIF e WebP), nome, comune, m², anno, classe e «Realizzata da». Una realizzazione senza
 * foto ha l'assonometria al tratto con la dicitura «Illustrazione» (§10.9): mai una foto che non è quella casa.
 * Su mobile uno scorrimento orizzontale con scroll-snap e l'indicatore «1 di N»; da 1024 px una griglia a 3 colonne.
 */
export default function BdRealizzazioni() {
  const idratato = useIdratato()
  const scorri = useRef<HTMLDivElement>(null)
  const [attuale, setAttuale] = useState(1)
  const visibile = realizzazioniVisibili()
  const elenco = dati.REALIZZAZIONI

  // Indicatore «1 di N»: la card più visibile nello scorrimento orizzontale (solo mobile; da 1024 px è nascosto)
  useEffect(() => {
    const contenitore = scorri.current
    if (!contenitore || typeof IntersectionObserver === 'undefined') return
    const card = Array.from(contenitore.querySelectorAll<HTMLElement>('[data-bd-realizzazione]'))
    const osservatore = new IntersectionObserver(
      (voci) => {
        const piuVisibile = voci.filter((v) => v.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (piuVisibile) setAttuale(card.indexOf(piuVisibile.target as HTMLElement) + 1)
      },
      { root: contenitore, threshold: [0.55, 0.8] },
    )
    card.forEach((c) => osservatore.observe(c))
    return () => osservatore.disconnect()
  }, [])

  if (!visibile) return null

  return (
    <BdSezione id="realizzazioni" titoloId="realizzazioni-titolo" classe="bd-realizzazioni">
      <h2 id="realizzazioni-titolo" className="bd-sezione__titolo">
        {tt('realizzazioni.titolo')}
      </h2>
      <div ref={scorri} className="bd-real__scorri" tabIndex={0} role="region" aria-label={tt('realizzazioni.regione')}>
        <ul className="bd-real__elenco" role="list">
          {elenco.map((r) => {
            const foto = fotoDi(r)
            const datiCasa = [
              r.comune,
              riempi(tt('realizzazioni.superficie'), { mq: numero.format(r.mq) }),
              String(r.anno),
              riempi(tt('realizzazioni.classe'), { classe: r.classe }),
            ].filter((v): v is string => Boolean(v))
            return (
              <li key={r.nome} className="bd-real__card" data-bd-realizzazione="">
                <figure className="bd-real__media">
                  {foto ? (
                    <picture>
                      <source type="image/avif" srcSet={srcset(foto, 'avif')} sizes={SIZES} />
                      <source type="image/webp" srcSet={srcset(foto, 'webp')} sizes={SIZES} />
                      <img
                        src={srcset(foto, 'webp').split(' ')[0]}
                        width={foto.width}
                        height={foto.height}
                        alt={foto.alt}
                        loading="lazy"
                        decoding="async"
                      />
                    </picture>
                  ) : (
                    <>
                      <img
                        className="bd-real__illustrazione"
                        src={assonometria}
                        width={illustrazione?.width ?? 400}
                        height={illustrazione?.height ?? 360}
                        alt={tt('realizzazioni.illustrazioneAlt')}
                        loading="lazy"
                        decoding="async"
                      />
                      <figcaption className="bd-real__dicitura">{tt('comuni.illustrazione')}</figcaption>
                    </>
                  )}
                </figure>
                <h3 className="bd-real__nome">{r.nome}</h3>
                <p className="bd-real__dati">{datiCasa.join(' · ')}</p>
                {t('realizzazioni.realizzataDa') ? <p className="bd-piccolo m-0">{tt('realizzazioni.realizzataDa')}</p> : null}
              </li>
            )
          })}
        </ul>
      </div>
      {idratato && elenco.length > 1 ? (
        <p className="bd-real__indice" aria-hidden="true">
          {riempi(tt('realizzazioni.indice'), { n: attuale, totale: elenco.length })}
        </p>
      ) : null}
      <p className="bd-piccolo bd-real__nota">{tt('realizzazioni.nota')}</p>
      <div className="bd-sezione__cta">
        <BdCta>{tt('realizzazioni.cta')}</BdCta>
      </div>
    </BdSezione>
  )
}
