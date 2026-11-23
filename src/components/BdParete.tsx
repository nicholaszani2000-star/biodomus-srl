import parete from '../assets/svg/bd-sezione.svg?raw'

interface BdPareteProps {
  /** Prefisso unico per classi e id dell'SVG: la stessa parete può stare nell'hero e in BdSistema. */
  prefisso: string
  /** Testo alternativo, da testi.json */
  titolo: string
  classe?: string
}

const sicuro = (testo: string) => testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * La parete in prospettiva (§5): SVG inline, così segue i token del tema (chiaro o scuro) e si anima.
 * Lo stacco tra gli strati dipende da --bd-esplodi sull'<svg>: 1 staccati (senza JavaScript), 0 ricomposta.
 * bd-motion.ts lo porta da 1 a 0 mentre scorri; con la riduzione del movimento la parete è già composta (CSS).
 */
export default function BdParete({ prefisso, titolo, classe = '' }: BdPareteProps) {
  const svg = parete
    .trim()
    .replaceAll('bds', prefisso)
    .replace(/<title id="([^"]+)">[^<]*<\/title>/, (_tutto, id: string) => `<title id="${id}">${sicuro(titolo)}</title>`)
  return <div className={['bd-parete', classe].filter(Boolean).join(' ')} data-bd-parete="" dangerouslySetInnerHTML={{ __html: svg }} />
}
