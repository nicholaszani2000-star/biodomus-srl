import villaDisegnoLargoAvif from '../assets/illustrazioni/bd-villa-dal-disegno-1200.avif'
import villaDisegnoLargoWebp from '../assets/illustrazioni/bd-villa-dal-disegno-1200.webp'
import villaDisegnoMobileAvif from '../assets/illustrazioni/bd-villa-dal-disegno-672.avif'
import villaDisegnoMobileWebp from '../assets/illustrazioni/bd-villa-dal-disegno-672.webp'
import villaTramontoLargoAvif from '../assets/illustrazioni/bd-villa-tramonto-1052.avif'
import villaTramontoLargoWebp from '../assets/illustrazioni/bd-villa-tramonto-1052.webp'
import villaTramontoMobileAvif from '../assets/illustrazioni/bd-villa-tramonto-640.avif'
import villaTramontoMobileWebp from '../assets/illustrazioni/bd-villa-tramonto-640.webp'
import { tt } from '../content/bd-testi.ts'
import immagini from '../content/immagini.json'

export type IdIllustrazione = 'villa-dal-disegno' | 'villa-tramonto'

interface Misure {
  width: number
  height: number
}

// File generati da studio/immagini.mjs (ILLUSTRAZIONI_AI): ritaglio per il telefono e ritaglio largo, AVIF con ripiego WebP.
const FILE: Record<IdIllustrazione, Record<'mobile' | 'largo', { avif: string; webp: string }>> = {
  'villa-dal-disegno': {
    mobile: { avif: villaDisegnoMobileAvif, webp: villaDisegnoMobileWebp },
    largo: { avif: villaDisegnoLargoAvif, webp: villaDisegnoLargoWebp },
  },
  'villa-tramonto': {
    mobile: { avif: villaTramontoMobileAvif, webp: villaTramontoMobileWebp },
    largo: { avif: villaTramontoLargoAvif, webp: villaTramontoLargoWebp },
  },
}

interface Props {
  id: IdIllustrazione
  /** verso-chiaro: in fondo all'hero scuro, la pagina passa dallo scuro al chiaro dentro l'immagine · chiaro: su fondo chiaro */
  sfumatura: 'verso-chiaro' | 'chiaro'
  /** dentro l'hero niente lazy loading (§9); altrove sì */
  subito?: boolean
}

/**
 * Illustrazione AI sfumata nella pagina (CLAUDE.md §2): niente cornice, i bordi si dissolvono nel fondo (maschera CSS),
 * con una parallasse leggera da bd-motion. Sempre con la dicitura «Illustrazione» visibile e un alt che lo dice:
 * non è una casa costruita né una realizzazione dell'impresa partner.
 */
export default function BdIllustrazione({ id, sfumatura, subito = false }: Props) {
  const voce = immagini.immagini.find((v) => v.id === id)
  const varianti = voce && 'varianti' in voce ? (voce.varianti as Record<'mobile' | 'largo', Misure>) : null
  if (!voce || !varianti) return null
  const file = FILE[id]

  return (
    <figure className={`bd-illustrazione bd-illustrazione--${sfumatura} bd-illustrazione--${id}`} data-bd-illustrazione="">
      <div className="bd-illustrazione__cornice">
        <picture>
          <source media="(max-width: 767px)" type="image/avif" srcSet={file.mobile.avif} width={varianti.mobile.width} height={varianti.mobile.height} />
          <source media="(max-width: 767px)" type="image/webp" srcSet={file.mobile.webp} width={varianti.mobile.width} height={varianti.mobile.height} />
          <source type="image/avif" srcSet={file.largo.avif} width={varianti.largo.width} height={varianti.largo.height} />
          <img
            className="bd-illustrazione__img"
            src={file.largo.webp}
            width={varianti.largo.width}
            height={varianti.largo.height}
            alt={voce.alt}
            loading={subito ? 'eager' : 'lazy'}
            fetchPriority={subito ? 'low' : undefined}
            decoding="async"
          />
        </picture>
      </div>
      <figcaption className="bd-illustrazione__nota">{tt('illustrazioni.dicitura')}</figcaption>
    </figure>
  )
}
