import logoImpilato from '../assets/svg/bd-logo.svg'
import logoOrizzontale from '../assets/svg/bd-logo-orizzontale.svg'
import { dati } from '../content/dati.ts'
import immagini from '../content/immagini.json'

interface Props {
  /** header: impilato 44 px fino a 1023 px, orizzontale 34 px da 1024 px · footer: impilato 48 px */
  posizione?: 'header' | 'footer'
}

// Misure intrinseche dal manifesto (viewBox degli SVG del kit): width e height sempre dichiarati, niente CLS.
const larghezza = (formato: { width: number; height: number }, altezza: number) =>
  Math.round((formato.width / formato.height) * altezza)

/**
 * Il logo di Biodomus (kit in studio/originali/biodomus-asset/, positivo senza payoff: §2).
 * Nell'header il link ha già l'aria-label con il nome, quindi qui l'immagine è decorativa (alt vuoto);
 * nel footer non è in un link e porta il nome nell'alt.
 * Senza logo (LOGO vuoto in §2) resta il wordmark tipografico.
 */
export default function BdWordmark({ posizione = 'header' }: Props) {
  const logo: string | null = dati.LOGO
  const { impilato, orizzontale } = immagini.logo

  if (!logo) {
    return (
      <span className="bd-wordmark">
        <span>{dati.BRAND}</span>
      </span>
    )
  }

  if (posizione === 'footer') {
    return (
      <img
        className="bd-logo bd-logo--footer"
        src={logoImpilato}
        width={larghezza(impilato, 48)}
        height={48}
        alt={dati.BRAND}
        loading="lazy"
        decoding="async"
      />
    )
  }

  return (
    <picture className="bd-logo bd-logo--header">
      <source media="(min-width: 1024px)" srcSet={logoOrizzontale} width={larghezza(orizzontale, 34)} height={34} />
      <img src={logoImpilato} width={larghezza(impilato, 44)} height={44} alt="" decoding="async" />
    </picture>
  )
}
