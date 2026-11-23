import parete from '../assets/svg/bd-sezione.svg?raw'
import { tt } from '../content/bd-testi.ts'
import immagini from '../content/immagini.json'
import BdSvg from './BdSvg.tsx'

const voce = immagini.immagini.find((immagine) => immagine.id === 'sezione')

interface Props {
  classe?: string
}

/**
 * «La sezione» (§5): la parete in prospettiva cavaliera, quattro strati .bd-strato-1…4.
 * Disegnata composta: senza JavaScript e con riduzione del movimento resta così.
 * Nell'hero bd-motion la apre (strati staccati) e la ricompone mentre l'hero esce dallo schermo.
 */
export default function BdParete({ classe = '' }: Props) {
  return (
    <figure className={['bd-parete', classe].filter(Boolean).join(' ')}>
      <BdSvg svg={parete} classe="bd-parete__svg" etichetta={voce?.alt ?? tt('sistema.nota')} />
      <figcaption className="bd-parete__nota">{tt('sistema.nota')}</figcaption>
    </figure>
  )
}
