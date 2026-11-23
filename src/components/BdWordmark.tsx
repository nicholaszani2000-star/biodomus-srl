import logoImpilato from '../assets/svg/bd-logo.svg'
import logoImpilatoNegativo from '../assets/svg/bd-logo-negativo.svg'
import logoOrizzontale from '../assets/svg/bd-logo-orizzontale.svg'
import logoOrizzontaleNegativo from '../assets/svg/bd-logo-orizzontale-negativo.svg'
import { dati } from '../content/dati.ts'
import immagini from '../content/immagini.json'

interface Props {
  /** header: impilato 44 px fino a 1023 px, orizzontale 34 px da 1024 px · footer: impilato 48 px */
  posizione?: 'header' | 'footer'
}

// Misure intrinseche dal manifesto (viewBox degli SVG del kit): width e height sempre dichiarati, niente CLS.
// Positivo e negativo hanno lo stesso viewBox, quindi le stesse misure.
const larghezza = (formato: { width: number; height: number }, altezza: number) =>
  Math.round((formato.width / formato.height) * altezza)

function LogoHeader({ impilato, orizzontale, classe }: { impilato: string; orizzontale: string; classe: string }) {
  const misure = immagini.logo
  return (
    <picture className={`bd-logo bd-logo--header ${classe}`}>
      <source media="(min-width: 1024px)" srcSet={orizzontale} width={larghezza(misure.orizzontale, 34)} height={34} />
      <img src={impilato} width={larghezza(misure.impilato, 44)} height={44} alt="" decoding="async" />
    </picture>
  )
}

/**
 * Il logo di Biodomus (kit in studio/originali/biodomus-asset/, sempre senza payoff: §2).
 * Header con STILE «Misto»: negativo e positivo sovrapposti nella stessa scatola; BdHeader sceglie quale si vede
 * (scuro sopra l'hero, chiaro dopo) con una dissolvenza di 200 ms, senza spostare nulla.
 * Nell'header il link ha già l'aria-label con il nome, quindi qui l'immagine è decorativa (alt vuoto);
 * nel footer non è in un link e porta il nome nell'alt. Senza logo (LOGO vuoto in §2) resta il wordmark tipografico.
 */
export default function BdWordmark({ posizione = 'header' }: Props) {
  const logo: string | null = dati.LOGO
  const stile: string = dati.STILE

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
        width={larghezza(immagini.logo.impilato, 48)}
        height={48}
        alt={dati.BRAND}
        loading="lazy"
        decoding="async"
      />
    )
  }

  const positivo = <LogoHeader impilato={logoImpilato} orizzontale={logoOrizzontale} classe="bd-logo--positivo" />
  const negativo = <LogoHeader impilato={logoImpilatoNegativo} orizzontale={logoOrizzontaleNegativo} classe="bd-logo--negativo" />

  if (stile === 'grafite') return negativo
  if (stile !== 'misto') return positivo
  return (
    <span className="bd-logo-doppio">
      {negativo}
      {positivo}
    </span>
  )
}
