import type { MouseEvent, ReactNode } from 'react'
import { scorriA } from '../lib/bd-scorri.ts'

interface BdCtaProps {
  children: ReactNode
  variante?: 'primaria' | 'secondaria'
  /** Destinazione: di default il modulo. Le ancore (#…) scorrono con l'offset dell'header. */
  href?: string
  compatta?: boolean
  classe?: string
  freccia?: boolean
}

/** CTA di §5: primaria a pillola piena, secondaria con bordo. Senza JavaScript resta un'ancora vera. */
export default function BdCta({
  children,
  variante = 'primaria',
  href = '#preventivo',
  compatta = false,
  classe = '',
  freccia = true,
}: BdCtaProps) {
  const vaiA = (evento: MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith('#') || evento.metaKey || evento.ctrlKey || evento.shiftKey) return
    evento.preventDefault()
    scorriA(href.slice(1))
  }

  const classi = ['bd-cta', `bd-cta--${variante}`, compatta ? 'bd-cta--compatta' : '', classe].filter(Boolean).join(' ')

  return (
    <a className={classi} href={href} onClick={vaiA}>
      <span>{children}</span>
      {freccia ? (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          <path d="M3 9h11M10 4.5 14.5 9 10 13.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </a>
  )
}
