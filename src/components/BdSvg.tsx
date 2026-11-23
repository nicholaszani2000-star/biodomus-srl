import { svgInline } from '../lib/bd-svg.ts'

interface Props {
  /** contenuto di un file SVG importato con ?raw (disegnato da studio/svg/genera-svg.mjs) */
  svg: string
  classe?: string
  /** testo alternativo; senza, il disegno è decorativo (aria-hidden) */
  etichetta?: string
}

/**
 * Disegno SVG inline (le variabili dei token di colore valgono anche dentro il disegno).
 * Il markup è lo stesso nel prerender e nel browser, quindi l'hydration non lo tocca.
 */
export default function BdSvg({ svg, classe, etichetta }: Props) {
  return <span className="bd-svg" dangerouslySetInnerHTML={{ __html: svgInline(svg, { classe, etichetta }) }} />
}
