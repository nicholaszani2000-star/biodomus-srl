import { tt } from '../content/bd-testi.ts'

/**
 * Contenuto di /grazie.html: la pagina dove arriva chi invia il modulo senza JavaScript (303 da bd-lead).
 * La genera scripts/prerender.mjs dentro BdPagina: stesso CSS della landing, niente JavaScript né stili inline.
 */
export default function BdGrazie() {
  return (
    <div className="grid max-w-2xl gap-8">
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
    </div>
  )
}
