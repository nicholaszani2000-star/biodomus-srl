import { useEffect } from 'react'
import BdBarraMobile from './components/BdBarraMobile.tsx'
import BdFooter from './components/BdFooter.tsx'
import BdHeader from './components/BdHeader.tsx'
import BdQuota from './components/BdQuota.tsx'
import BdSezione from './components/BdSezione.tsx'
import { tt } from './content/bd-testi.ts'
import BdHero from './sections/BdHero.tsx'
import BdModulo from './sections/BdModulo.tsx'
import BdPerChi from './sections/BdPerChi.tsx'
import { salvaUtm } from './lib/bd-utm.ts'

// Sezioni nell'ordine di §6. Dallo step 4: hero, «Per chi è», modulo e barra mobile.
// «Come funziona» qui è solo l'ancora (titolo e intro) per le CTA secondarie: la sezione vera arriva allo step 5.
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
        <BdHero />
        <BdPerChi />

        <BdQuota numero="01" />

        <BdSezione id="come-funziona" titoloId="come-funziona-titolo">
          <div className="bd-misura grid gap-4">
            <h2 id="come-funziona-titolo" className="m-0" data-bd-focus="" tabIndex={-1}>
              {tt('comeFunziona.titolo')}
            </h2>
            <p className="m-0 text-testo-2">{tt('comeFunziona.intro')}</p>
          </div>
        </BdSezione>

        <BdQuota numero="02" />

        <BdModulo />
      </main>
      <BdFooter />
      <BdBarraMobile />
    </>
  )
}
