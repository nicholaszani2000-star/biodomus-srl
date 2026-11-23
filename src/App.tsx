import { useEffect } from 'react'
import BdBarraMobile from './components/BdBarraMobile.tsx'
import BdFooter from './components/BdFooter.tsx'
import BdHeader from './components/BdHeader.tsx'
import BdQuota from './components/BdQuota.tsx'
import { tt } from './content/bd-testi.ts'
import BdHero from './sections/BdHero.tsx'
import BdModulo from './sections/BdModulo.tsx'
import BdPerChi from './sections/BdPerChi.tsx'
import { salvaUtm } from './lib/bd-utm.ts'

// Sezioni nell'ordine di §6. Step 4: hero, «Per chi è» e barra mobile; le altre arrivano con gli step 5 e 6.
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
        <BdQuota numero="01" />
        <BdPerChi />
        <BdQuota numero="02" />
        {/* Ancora provvisoria della CTA «Come funziona»: allo step 5 la sostituisce la sezione vera (§6.4). */}
        <div id="come-funziona" className="bd-ancora" />
        <BdModulo />
      </main>
      <BdFooter />
      <BdBarraMobile />
    </>
  )
}
