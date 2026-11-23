import BdCta from '../components/BdCta.tsx'
import BdParete from '../components/BdParete.tsx'
import { dati } from '../content/dati.ts'
import { t, tt } from '../content/bd-testi.ts'
import immagini from '../content/immagini.json'
import { ANGOLI } from '../lib/bd-angolo.ts'

// Con STILE «Misto» o «Grafite» l'hero ha il tema scuro (§5).
const scuro = (dati.STILE as string) !== 'cemento'

// Fatti brevi di §8: ognuno solo se il dato c'è; la classe energetica solo con P1_OK «sì».
const fatti = [t('hero.fatti.tempi'), dati.P1_OK ? t('hero.fatti.classe') : null, t('hero.fatti.sistema')].filter(
  (fatto): fatto is string => fatto !== null,
)

// Foto autorizzata per l'hero (immagini.json, «dove: BdHero»): oggi nessuna, resta la parete.
const fotoHero = immagini.immagini.find((immagine) => immagine.tipo === 'foto' && /BdHero/.test(immagine.dove))
const fileFoto = import.meta.glob<string>('../assets/img/*.{avif,webp}', { eager: true, query: '?url', import: 'default' })
const srcset = (formato: 'avif' | 'webp') =>
  fotoHero
    ? fotoHero.larghezze
        .map((larghezza) => {
          const url = fileFoto[`../assets/img/${fotoHero.file.split('/').pop()}-${larghezza}.${formato}`]
          return url ? `${url} ${larghezza}w` : null
        })
        .filter(Boolean)
        .join(', ')
    : ''
const SIZES = '(min-width: 1024px) 40vw, 100vw'

/** Icona dei fatti brevi: una piccola linea di quota (dettaglio grafico, --bd-dettaglio). */
function Quota() {
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true" focusable="false" className="bd-hero__quota">
      <path d="M1 6h18M1 2v8M19 2v8" fill="none" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Primo schermo (§6.2, copy di §7 e §8): in 5 secondi chi sei, per chi, cosa fare.
 * Titolo e sottotitolo hanno le tre varianti dell'angolo nell'HTML; il CSS ne mostra una (nessuno sfarfallio).
 * A 390 × 844 titolo e CTA primaria stanno sopra la piega; la parete viene dopo il testo.
 */
export default function BdHero() {
  return (
    <section id="inizio" className={['bd-hero', scuro ? 'bd-tema-scuro' : ''].filter(Boolean).join(' ')} aria-labelledby="inizio-titolo">
      <div className="bd-wrap bd-hero__griglia">
        <div className="bd-hero__testo">
          <p className="bd-occhiello m-0">{tt('hero.occhiello')}</p>
          <h1 id="inizio-titolo" className="bd-hero__titolo m-0">
            {ANGOLI.map((angolo) => (
              <span key={angolo} className={`bd-v bd-v-${angolo}`}>
                {tt(`hero.angoli.${angolo}.titolo`)}
              </span>
            ))}
          </h1>
          <p className="bd-hero__sotto m-0">
            {ANGOLI.map((angolo) => (
              <span key={angolo} className={`bd-v bd-v-${angolo}`}>
                {tt(`hero.angoli.${angolo}.sottotitolo`)}
              </span>
            ))}
          </p>
          <div className="bd-hero__azioni">
            <BdCta magnete>{tt('hero.ctaPrimaria')}</BdCta>
            <BdCta variante="secondaria" href="#come-funziona" freccia={false}>
              {tt('hero.ctaSecondaria')}
            </BdCta>
          </div>
          <p className="bd-piccolo m-0">{tt('hero.sottoCta')}</p>
          {fatti.length ? (
            <ul className="bd-hero__fatti" role="list">
              {fatti.map((fatto) => (
                <li key={fatto}>
                  <Quota />
                  <span>{fatto}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className={fotoHero ? 'bd-hero__visuale bd-hero__visuale--foto' : 'bd-hero__visuale'}>
          {fotoHero ? (
            <figure className="bd-hero__foto">
              <picture>
                <source type="image/avif" srcSet={srcset('avif')} sizes={SIZES} />
                <source type="image/webp" srcSet={srcset('webp')} sizes={SIZES} />
                <img
                  src={srcset('webp').split(' ')[0]}
                  width={fotoHero.width}
                  height={fotoHero.height}
                  alt={fotoHero.alt}
                  fetchPriority="high"
                  decoding="async"
                />
              </picture>
              <figcaption className="bd-piccolo">{fotoHero.credito}</figcaption>
            </figure>
          ) : null}
          <BdParete classe={fotoHero ? 'bd-parete--hero bd-parete--piccola' : 'bd-parete--hero'} />
        </div>
      </div>
      {/* Sentinella per header e movimento: 64 px sopra il fondo dell'hero */}
      <div className="bd-hero__fine" data-bd-hero-fine="" aria-hidden="true" />
    </section>
  )
}
