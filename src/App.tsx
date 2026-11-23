import { useEffect } from 'react'
import BdBarraMobile from './components/BdBarraMobile.tsx'
import BdCta from './components/BdCta.tsx'
import BdFooter from './components/BdFooter.tsx'
import BdHeader from './components/BdHeader.tsx'
import BdQuota from './components/BdQuota.tsx'
import BdSezione from './components/BdSezione.tsx'
import { tt } from './content/bd-testi.ts'
import BdModulo from './sections/BdModulo.tsx'
import { ANGOLI } from './lib/bd-angolo.ts'
import { salvaUtm } from './lib/bd-utm.ts'

// Impalcatura dello step 1 più il modulo (step 3). Le altre sezioni di §6 arrivano dallo step 4 allo step 6.
export default function App() {
  useEffect(() => {
    // Dopo l'hydration: parametri della campagna e movimento (caricato a parte, fuori dal primo bundle).
    salvaUtm()
    void import('./lib/bd-motion.ts').then((modulo) => modulo.avviaMovimento())
  }, [])

  return (
    <>
      <a className="bd-salta" href="#contenuto">
        {tt('comuni.saltaAlContenuto')}
      </a>
      <BdHeader />
      <main id="contenuto" tabIndex={-1}>
        <BdSezione id="inizio" titoloId="inizio-titolo" ingresso={false} classe="pt-16 pb-24 sm:pt-24 lg:pt-32">
          <div className="grid max-w-4xl gap-6">
            <p className="bd-occhiello m-0">{tt('hero.occhiello')}</p>
            <h1 id="inizio-titolo" className="m-0">
              {ANGOLI.map((angolo) => (
                <span key={angolo} className={`bd-v bd-v-${angolo}`}>
                  {tt(`hero.angoli.${angolo}.titolo`)}
                </span>
              ))}
            </h1>
            <p className="bd-misura m-0 text-lg text-testo-2 sm:text-xl">
              {ANGOLI.map((angolo) => (
                <span key={angolo} className={`bd-v bd-v-${angolo}`}>
                  {tt(`hero.angoli.${angolo}.sottotitolo`)}
                </span>
              ))}
            </p>
            <div className="grid gap-3">
              <div>
                <BdCta>{tt('hero.ctaPrimaria')}</BdCta>
              </div>
              <p className="bd-piccolo m-0">{tt('hero.sottoCta')}</p>
            </div>
          </div>
        </BdSezione>

        <BdQuota numero="01" />

        <BdModulo />
      </main>
      <BdFooter />
      <BdBarraMobile />
    </>
  )
}
