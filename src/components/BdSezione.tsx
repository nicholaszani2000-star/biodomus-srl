import type { ReactNode } from 'react'

interface BdSezioneProps {
  id: string
  children: ReactNode
  /** id del titolo della sezione, per aria-labelledby */
  titoloId?: string
  classe?: string
  /** false per le sezioni che non devono avere l'ingresso animato (per esempio il primo schermo) */
  ingresso?: boolean
}

/** Contenitore di sezione: id per le ancore, padding di §5 (96/160 px), ingresso animato da bd-motion. */
export default function BdSezione({ id, children, titoloId, classe = '', ingresso = true }: BdSezioneProps) {
  return (
    <section
      id={id}
      className={['bd-sezione', classe].filter(Boolean).join(' ')}
      aria-labelledby={titoloId}
      data-bd-ingresso={ingresso ? '' : undefined}
    >
      <div className="bd-wrap">{children}</div>
    </section>
  )
}
