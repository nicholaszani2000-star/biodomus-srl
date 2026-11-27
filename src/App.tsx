import { useEffect } from 'react'
import BdBannerCookie from './components/BdBannerCookie.tsx'
import BdBarraMobile from './components/BdBarraMobile.tsx'
import BdFooter from './components/BdFooter.tsx'
import BdHeader from './components/BdHeader.tsx'
import BdIllustrazione from './components/BdIllustrazione.tsx'
import BdQuota from './components/BdQuota.tsx'
import { partnerAutorizzati, realizzazioniVisibili } from './content/dati.ts'
import { tt } from './content/bd-testi.ts'
import BdChiusura from './sections/BdChiusura.tsx'
import BdComeFunziona from './sections/BdComeFunziona.tsx'
import BdFaq from './sections/BdFaq.tsx'
import BdHero from './sections/BdHero.tsx'
import BdModulo from './sections/BdModulo.tsx'
import BdPartner from './sections/BdPartner.tsx'
import BdPerChi from './sections/BdPerChi.tsx'
import BdRealizzazioni from './sections/BdRealizzazioni.tsx'
import BdRuolo from './sections/BdRuolo.tsx'
import BdSistema from './sections/BdSistema.tsx'
import { salvaUtm } from './lib/bd-utm.ts'

// Sezioni nell'ordine di §6. Realizzazioni e Partner compaiono solo con l'autorizzazione scritta dei partner (§2):
// oggi P1_OK e P2_OK sono «no», quindi non ci sono. La BdQuota tra due sezioni porta il numero di quella che segue,
// preso dall'elenco «ordine», così i numeri restano in fila anche quando una sezione condizionale non c'è.
export default function App() {
  useEffect(() => {
    // Dopo l'hydration: parametri della campagna, movimento e tracciamento (caricati a parte, fuori dal primo bundle).
    // bd-traccia non fa richieste a Meta senza il consenso «accettato» e senza META_PIXEL (§10 punto 4).
    salvaUtm()
    void import('./lib/bd-motion.ts').then((modulo) => modulo.avviaMovimento())
    void import('./lib/bd-traccia.ts').then((modulo) => modulo.avviaTracciamento())
  }, [])

  // Le sezioni dopo l'hero, nell'ordine di §6: la quota prima di ognuna porta il suo numero (01, 02, …)
  const conRealizzazioni = realizzazioniVisibili()
  const conPartner = partnerAutorizzati().length > 0
  const ordine = [
    'per-chi',
    'come-funziona',
    'ruolo',
    'sistema',
    ...(conRealizzazioni ? ['realizzazioni'] : []),
    ...(conPartner ? ['partner'] : []),
    'faq',
    'chiusura',
  ]
  const quota = (id: string) => <BdQuota numero={String(ordine.indexOf(id) + 1).padStart(2, '0')} />

  return (
    <>
      <a className="bd-salta" href="#contenuto">
        {tt('comuni.saltaAlContenuto')}
      </a>
      {/* Solo dopo l'hydration e solo finché manca una scelta (o quando la si riapre): vedi BdBannerCookie */}
      <BdBannerCookie />
      <BdHeader />
      <main id="contenuto" tabIndex={-1}>
        <BdHero />
        {quota('per-chi')}
        <BdPerChi />
        {quota('come-funziona')}
        <BdComeFunziona />
        {quota('ruolo')}
        <BdRuolo />
        {quota('sistema')}
        <BdSistema />
        {conRealizzazioni ? (
          <>
            {quota('realizzazioni')}
            <BdRealizzazioni />
          </>
        ) : null}
        {conPartner ? (
          <>
            {quota('partner')}
            <BdPartner />
          </>
        ) : null}
        {/* Sempre subito prima del modulo (§2, §6): la casa finita prima della richiesta. */}
        <BdIllustrazione id="villa-tramonto" sfumatura="chiaro" />
        <BdModulo />
        {quota('faq')}
        <BdFaq />
        {quota('chiusura')}
        <BdChiusura />
      </main>
      <BdFooter />
      <BdBarraMobile />
    </>
  )
}
