import BdCta from './BdCta.tsx'
import { tt } from '../content/bd-testi.ts'

/**
 * Barra fissa in basso solo su mobile (§6). Struttura dello step 1: resta nascosta.
 * Lo step 4 aggiunge la logica: compare dopo l'hero e sparisce quando il modulo è visibile.
 */
export default function BdBarraMobile() {
  return (
    <div
      className="bd-barra-mobile fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-fondo/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
      hidden
    >
      <BdCta classe="w-full">{tt('barraMobile.cta')}</BdCta>
    </div>
  )
}
