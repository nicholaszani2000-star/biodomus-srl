import BdCta from './BdCta.tsx'
import BdWordmark from './BdWordmark.tsx'
import { tt } from '../content/bd-testi.ts'

/** Header fisso (§6.1): wordmark, «Come funziona» da 640 px, CTA sempre a un tocco. */
export default function BdHeader() {
  return (
    <header className="bd-header sticky top-0 z-30 border-b border-linea bg-fondo/90 backdrop-blur-md">
      <div className="bd-wrap flex h-16 items-center justify-between gap-4">
        <a href="#contenuto" className="no-underline" aria-label={tt('comuni.tornaInizio')}>
          <BdWordmark />
        </a>
        <nav aria-label="Principale" className="flex items-center gap-2 sm:gap-6">
          <a href="#come-funziona" className="hidden font-medium text-testo no-underline hover:underline sm:inline">
            {tt('header.linkComeFunziona')}
          </a>
          <BdCta compatta freccia={false}>
            {tt('header.cta')}
          </BdCta>
        </nav>
      </div>
    </header>
  )
}
