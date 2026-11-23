import { tt } from '../content/bd-testi.ts'
import BdWordmark from './BdWordmark.tsx'

/**
 * Contenuto di /grazie.html: la pagina dove arriva chi invia il modulo senza JavaScript (303 da bd-lead).
 * La genera scripts/prerender.mjs con lo stesso CSS della landing e senza JavaScript.
 */
export default function BdGrazie() {
  return (
    <main className="bd-sezione">
      <div className="bd-wrap grid max-w-2xl gap-8">
        <a href="/" aria-label={tt('grazie.tornaSitoEtichetta')} className="w-fit">
          <BdWordmark />
        </a>
        <div className="bd-m-scheda bd-m-successo">
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 16.5l4 4 8.5-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="m-0 text-[clamp(2rem,4vw+1rem,3.25rem)]">{tt('grazie.titolo')}</h1>
          <p className="m-0">{tt('modulo.successo')}</p>
          <a className="bd-cta bd-cta--secondaria" href="/">
            {tt('modulo.senzaJs.tornaSito')}
          </a>
        </div>
        <p className="bd-piccolo m-0">{tt('footer.legale')}</p>
      </div>
    </main>
  )
}
