import { dati } from '../content/dati.ts'

/** Il nome del brand in Bricolage Grotesque, con la sezione della parete in miniatura (LOGO vuoto in §2). */
export default function BdWordmark() {
  return (
    <span className="bd-wordmark">
      <svg width="20" height="24" viewBox="0 0 20 24" aria-hidden="true" focusable="false">
        <rect x="0.75" y="0.75" width="4.5" height="22.5" fill="none" stroke="var(--bd-testo)" strokeWidth="1.5" />
        <rect x="7.5" y="0.75" width="5" height="22.5" fill="var(--bd-legno)" />
        <rect x="14.75" y="0.75" width="4.5" height="22.5" fill="none" stroke="var(--bd-testo)" strokeWidth="1.5" />
      </svg>
      <span>{dati.BRAND}</span>
    </span>
  )
}
