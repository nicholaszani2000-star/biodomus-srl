import type { ReactNode } from 'react'
import { emailPubblica } from '../content/dati.ts'
import { t, tt } from '../content/bd-testi.ts'
import BdWordmark from './BdWordmark.tsx'

// Aree di tocco di almeno 44 × 44 px (§9), come nel footer della landing
const LINK = 'inline-flex min-h-11 items-center whitespace-nowrap'

/**
 * Scheletro delle pagine statiche: /privacy.html, /cookie.html, /grazie.html e /404.html.
 * Le genera scripts/prerender.mjs al build, con lo stesso CSS della landing e senza JavaScript, senza <style>
 * e senza script inline (CSP di netlify.toml). Testi da testi.json e dati da dati.ts, come la landing.
 * Nel piede i dati legali (§10.1): titolare, forma, sede e partita IVA; se mancano, un riquadro di avviso.
 */
export default function BdPagina({ children }: { children: ReactNode }) {
  const email = emailPubblica()
  const legale = t('footer.legale')
  const legaliExtra = [t('footer.rea'), t('footer.capitale'), t('footer.pec')].filter((riga): riga is string => riga !== null)

  return (
    <>
      <a className="bd-salta" href="#contenuto">
        {tt('comuni.saltaAlContenuto')}
      </a>
      <header className="bd-pagina__testata">
        <div className="bd-wrap">
          <a href="/" aria-label={tt('pagine.tornaSitoEtichetta')} className="inline-flex w-fit">
            <BdWordmark />
          </a>
        </div>
      </header>
      <main id="contenuto" tabIndex={-1} className="bd-pagina">
        <div className="bd-wrap">{children}</div>
      </main>
      <footer className="bd-footer border-t border-linea bg-carta">
        <div className="bd-wrap grid gap-3 py-10 text-[0.9375rem] text-testo-2">
          {legale ? <p className="m-0">{legale}</p> : <p className="bd-avviso m-0">{tt('pagine.datiMancanti')}</p>}
          {legaliExtra.length ? <p className="m-0">{legaliExtra.join(' · ')}</p> : null}
          <nav aria-label={tt('pagine.navLegale')} className="flex flex-wrap items-center gap-x-6">
            <a className={LINK} href="/privacy.html">
              {tt('footer.privacy')}
            </a>
            <a className={LINK} href="/cookie.html">
              {tt('footer.cookie')}
            </a>
            <a className={LINK} href={`mailto:${email}`}>
              {email}
            </a>
          </nav>
        </div>
      </footer>
    </>
  )
}
