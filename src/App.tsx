import { useEffect } from 'react'
import BdBarraMobile from './components/BdBarraMobile.tsx'
import BdFooter from './components/BdFooter.tsx'
import BdHeader from './components/BdHeader.tsx'
import BdIllustrazione from './components/BdIllustrazione.tsx'
import BdQuota from './components/BdQuota.tsx'
import { tt } from './content/bd-testi.ts'
import BdComeFunziona from './sections/BdComeFunziona.tsx'
import BdHero from './sections/BdHero.tsx'
import BdModulo from './sections/BdModulo.tsx'
import BdPerChi from './sections/BdPerChi.tsx'
import BdRuolo from './sections/BdRuolo.tsx'
import BdSistema from './sections/BdSistema.tsx'
import { salvaUtm } from './lib/bd-utm.ts'

// Sezioni nell'ordine di §6. Step 4: hero, «Per chi è», barra mobile. Step 5: come funziona, ruolo, sistema. Lo step 6 aggiunge il resto.
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
        <BdComeFunziona />
        <BdQuota numero="03" />
        <BdRuolo />
        <BdQuota numero="04" />
        <BdSistema />
        {/* Sempre subito prima del modulo (§2, §6): la casa finita prima della richiesta. Le sezioni nuove vanno sopra. */}
        <BdIllustrazione id="villa-tramonto" sfumatura="chiaro" />
        <BdModulo />
      </main>
      <BdFooter />
      <BdBarraMobile />
    </>
  )
}
