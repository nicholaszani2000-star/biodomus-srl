import BdCta from '../components/BdCta.tsx'
import BdIllustrazione from '../components/BdIllustrazione.tsx'
import BdParete from '../components/BdParete.tsx'
import { dati } from '../content/dati.ts'
import { t, tt } from '../content/bd-testi.ts'
import { ANGOLI } from '../lib/bd-angolo.ts'

/**
 * Primo schermo (§6.2, copy di §7 e §8). Con STILE «Misto» ha il tema scuro: .bd-tema-scuro porta i token scuri (§5).
 * Le tre varianti di titolo e sottotitolo sono tutte nell'HTML; il CSS mostra quella dell'angolo (§7), senza sfarfallio.
 * Il titolo è testo prerenderizzato (LCP); la parete è un SVG inline che bd-motion ricompone mentre scorri.
 * In fondo l'illustrazione «villa dal disegno» (§2): la casa nasce dal disegno mentre la pagina passa dallo scuro al chiaro.
 */
export default function BdHero() {
  const stile: string = dati.STILE
  const p1Ok: boolean = dati.P1_OK
  // Fatti brevi: solo quelli con il dato presente; la classe solo con l'autorizzazione di P1 (§8).
  const fatti = [t('hero.fatti.tempi'), p1Ok ? t('hero.fatti.classe') : null, t('hero.fatti.sistema')].filter(
    (fatto): fatto is string => Boolean(fatto),
  )

  return (
    <section id="inizio" className={['bd-hero', stile === 'misto' ? 'bd-tema-scuro' : ''].filter(Boolean).join(' ')} aria-labelledby="inizio-titolo">
      <div className="bd-wrap bd-hero__griglia">
        <div className="bd-hero__testo">
          <p className="bd-occhiello bd-occhiello--linea m-0">{tt('hero.occhiello')}</p>
          <h1 id="inizio-titolo" className="bd-hero__titolo m-0" data-bd-rivela="">
            {ANGOLI.map((angolo) => (
              <span key={angolo} className={`bd-v bd-v-${angolo}`}>
                {tt(`hero.angoli.${angolo}.titolo`)}
              </span>
            ))}
          </h1>
          <p className="bd-hero__sottotitolo bd-misura m-0">
            {ANGOLI.map((angolo) => (
              <span key={angolo} className={`bd-v bd-v-${angolo}`}>
                {tt(`hero.angoli.${angolo}.sottotitolo`)}
              </span>
            ))}
          </p>
          <div className="bd-hero__azioni">
            <BdCta>{tt('hero.ctaPrimaria')}</BdCta>
            <BdCta variante="secondaria" href="#come-funziona" freccia={false}>
              {tt('hero.ctaSecondaria')}
            </BdCta>
          </div>
          <p className="bd-piccolo m-0">{tt('hero.sottoCta')}</p>
          {fatti.length ? (
            <ul className="bd-hero__fatti" aria-label={tt('hero.fattiTitolo')}>
              {fatti.map((fatto) => (
                <li key={fatto}>{fatto}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <figure className="bd-hero__visuale m-0">
          <BdParete prefisso="bdsh" titolo={tt('hero.parete.titolo')} classe="bd-parete--hero" />
          <figcaption className="bd-piccolo">{tt('hero.parete.nota')}</figcaption>
        </figure>
      </div>

      <BdIllustrazione id="villa-dal-disegno" sfumatura="verso-chiaro" subito />
    </section>
  )
}
