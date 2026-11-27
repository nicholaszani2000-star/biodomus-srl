import { tt } from '../content/bd-testi.ts'

const freccia = (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <path d="M3 9h11M10 4.5 14.5 9 10 13.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * /404.html: Netlify la serve per ogni indirizzo che non esiste. Due strade: il modulo e la pagina principale.
 * Percorsi assoluti («/#preventivo», «/»): la pagina può comparire a qualsiasi profondità dell'indirizzo.
 */
export default function BdNonTrovata() {
  return (
    <div className="grid max-w-2xl gap-6">
      <h1 className="m-0 text-[clamp(2rem,4vw+1rem,3.25rem)]">{tt('pagina404.titolo')}</h1>
      <p className="m-0 max-w-[60ch] text-testo-2">{tt('pagina404.testo')}</p>
      <div className="flex flex-wrap gap-3">
        <a className="bd-cta bd-cta--primaria" href="/#preventivo">
          <span>{tt('pagina404.modulo')}</span>
          {freccia}
        </a>
        <a className="bd-cta bd-cta--secondaria" href="/">
          <span>{tt('pagina404.home')}</span>
        </a>
      </div>
    </div>
  )
}
