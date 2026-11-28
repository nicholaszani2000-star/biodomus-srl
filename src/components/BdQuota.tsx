interface BdQuotaProps {
  /** Numero della sezione che segue, per esempio «02» */
  numero: string
}

/** Linea di quota da tavola tecnica che separa le sezioni (§5). Decorativa: nascosta ai lettori di schermo. */
export default function BdQuota({ numero }: BdQuotaProps) {
  return (
    <div className="bd-wrap" aria-hidden="true">
      <div className="bd-quota">
        <svg viewBox="0 0 1000 24" preserveAspectRatio="none" focusable="false">
          <path d="M6 12H994" data-bd-quota-linea="" />
          <path d="M6 4V20M994 4V20" />
          <path d="M0 18 12 6M988 18 1000 6" />
        </svg>
        <span className="bd-quota__numero">{numero}</span>
      </div>
    </div>
  )
}
